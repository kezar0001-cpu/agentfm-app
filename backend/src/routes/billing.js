import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import {
  createStripeClient,
  isStripeClientConfigured,
  StripeNotConfiguredError,
} from '../utils/stripeClient.js';

const router = express.Router();
const stripe = createStripeClient();
const stripeAvailable = isStripeClientConfigured(stripe);

const PLAN_PRICE_MAP = {
  STARTER: process.env.STRIPE_PRICE_ID_STARTER,
  PROFESSIONAL: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

const PRICE_PLAN_MAP = Object.entries(PLAN_PRICE_MAP).reduce((acc, [plan, priceId]) => {
  if (priceId) acc[priceId] = plan;
  return acc;
}, {});

function normalisePlan(plan) {
  if (!plan) return undefined;
  const upper = String(plan).trim().toUpperCase();
  if (upper === 'FREE_TRIAL') return upper;
  return PLAN_PRICE_MAP[upper] ? upper : undefined;
}

function resolvePlanFromPriceId(priceId, fallback) {
  if (!priceId) return normalisePlan(fallback);
  return PRICE_PLAN_MAP[priceId] || normalisePlan(fallback);
}

function mapStripeStatusToAppStatus(status, fallback = 'PENDING') {
  const normalised = typeof status === 'string' ? status.toLowerCase() : '';
  switch (normalised) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIAL';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'SUSPENDED';
    case 'canceled':
    case 'cancelled':
    case 'incomplete_expired':
      return 'CANCELLED';
    case 'incomplete':
      return 'PENDING';
    default:
      return fallback;
  }
}

async function applySubscriptionUpdate({ userId, orgId, data }) {
  if (!data) return;

  const cleanedEntries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (cleanedEntries.length === 0) return;

  const cleaned = Object.fromEntries(cleanedEntries);

  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: cleaned });
    return;
  }

  if (orgId) {
    await prisma.user.updateMany({ where: { orgId }, data: cleaned });
  }
}

// POST /api/billing/checkout
router.post('/checkout', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { plan = 'STARTER', successUrl, cancelUrl } = req.body || {};
    const normalisedPlan = normalisePlan(plan) || 'STARTER';

    if (!stripeAvailable) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const priceId = PLAN_PRICE_MAP[normalisedPlan];
    if (!priceId) return res.status(400).json({ error: `Unknown plan or missing price id: ${plan}` });

    const defaultSuccess = `${process.env.FRONTEND_URL}/subscriptions?success=1`;
    const baseSuccess = (successUrl || process.env.STRIPE_SUCCESS_URL || defaultSuccess);
    const success = `${baseSuccess}${baseSuccess.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
    const cancel = cancelUrl || process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL}/subscriptions?canceled=1`;

    const metadata = {
      orgId: user.orgId || '',
      userId: user.id || '',
      plan: normalisedPlan,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      customer_email: user.email,
      client_reference_id: user.orgId || user.id,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

// POST /api/billing/confirm  { sessionId }
router.post('/confirm', async (req, res) => {
  try {
    if (!stripeAvailable) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription.items.data.price'],
    });

    if (session.mode !== 'subscription') {
      return res.status(400).json({ error: 'Not a subscription session' });
    }
    const isComplete = session.status === 'complete' || session.payment_status === 'paid';
    if (!isComplete) return res.status(400).json({ error: 'Session not complete' });

    const userId = session.metadata?.userId;
    const orgId = session.metadata?.orgId || session.client_reference_id;
    const subscription =
      session.subscription && typeof session.subscription === 'object'
        ? session.subscription
        : null;

    const priceId = subscription?.items?.data?.[0]?.price?.id;
    const plan = resolvePlanFromPriceId(priceId, session.metadata?.plan || 'STARTER');
    const status = mapStripeStatusToAppStatus(subscription?.status, 'ACTIVE');

    const data = { subscriptionStatus: status };
    if (plan) data.subscriptionPlan = plan;
    if (status === 'ACTIVE') data.trialEndDate = null;

    await applySubscriptionUpdate({
      userId,
      orgId,
      data,
    });

    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('Stripe confirm error:', err);
    return res.status(500).json({ error: 'Confirm failed' });
  }
});

/**
 * Stripe Webhook (This must be exported to be used in index.js)
 */
export async function webhook(req, res) {
  // This is the console.log for debugging
  console.log('>>> INSIDE billing.js webhook handler <<<');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!stripeAvailable) {
      throw new StripeNotConfiguredError();
    }
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      console.error('Stripe webhook received but Stripe is not configured.');
      return res.status(503).send(`Stripe Error: ${err.message}`);
    }
    console.error('❌ Webhook signature verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const orgId  = session.metadata?.orgId || session.client_reference_id;
        const subscriptionId = session.subscription;
        let subscription;

        if (session.mode === 'subscription' && subscriptionId) {
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price'],
            });
          } catch (error) {
            console.warn('Failed to retrieve subscription for checkout.session.completed', error);
          }
        }

        const priceId = subscription?.items?.data?.[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId, session.metadata?.plan || 'STARTER');
        const status = mapStripeStatusToAppStatus(subscription?.status, 'ACTIVE');

        const update = {
          subscriptionStatus: status,
        };

        if (plan) {
          update.subscriptionPlan = plan;
        }

        if (status === 'ACTIVE') {
          update.trialEndDate = null;
        }

        await applySubscriptionUpdate({ userId, orgId, data: update });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        const orgId = subscription.metadata?.orgId;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId, subscription.metadata?.plan);
        const newStatus = mapStripeStatusToAppStatus(subscription.status);

        const data = { subscriptionStatus: newStatus };
        if (plan) data.subscriptionPlan = plan;
        if (newStatus === 'ACTIVE') data.trialEndDate = null;

        await applySubscriptionUpdate({ userId, orgId, data });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        const orgId = subscription.metadata?.orgId;

        await applySubscriptionUpdate({
          userId,
          orgId,
          data: {
            subscriptionStatus: 'CANCELLED',
            subscriptionPlan: 'FREE_TRIAL',
            trialEndDate: null,
          },
        });
        break;
      }
      default:
        // console.log(`Unhandled event type ${event.type}`);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('⚠️ Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;