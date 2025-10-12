// backend/src/routes/billing.js
import express from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const router = express.Router();

// ---- Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set. /api/billing/* will return 503.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---- Helpers
const PLAN_PRICE_MAP = {
  STARTER: process.env.STRIPE_PRICE_ID_STARTER,
  PROFESSIONAL: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

function getPriceIdForPlan(plan) {
  const priceId = PLAN_PRICE_MAP[plan];
  return priceId || null;
}

function decodeBearer(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: 'No token' };

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return { user };
  } catch {
    return { error: 'Invalid token' };
  }
}

// ============================================================
// POST /api/billing/checkout
// Creates a Stripe Checkout Session for a subscription plan
// Body: { plan: 'STARTER'|'PROFESSIONAL'|'ENTERPRISE', successUrl?, cancelUrl? }
// ============================================================
router.post('/checkout', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Billing is not configured' });
    }

    const { user, error } = decodeBearer(req);
    if (error) return res.status(401).json({ error });

    const plan = (req.body?.plan || 'STARTER').toUpperCase();
    const priceId = getPriceIdForPlan(plan);
    if (!priceId) {
      return res.status(400).json({ error: `Unknown plan or missing price id: ${plan}` });
    }

    const successUrl =
      req.body?.successUrl ||
      process.env.STRIPE_SUCCESS_URL ||
      `${process.env.FRONTEND_URL}/subscriptions?success=1`;

    const cancelUrl =
      req.body?.cancelUrl ||
      process.env.STRIPE_CANCEL_URL ||
      `${process.env.FRONTEND_URL}/subscriptions?canceled=1`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // For first pass we identify using email; later you can store/reuse a Stripe customer id
      customer_email: user.email,
      client_reference_id: user.orgId || user.id,
      metadata: {
        orgId: user.orgId || '',
        userId: user.id || '',
        plan,
      },
      // Put the same metadata onto the Subscription so later webhook events are easy to reconcile
      subscription_data: {
        metadata: {
          orgId: user.orgId || '',
          userId: user.id || '',
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

// ============================================================
// Named export: Stripe Webhook
// Mount in index.js with express.raw() BEFORE express.json():
//   app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook)
// ============================================================
export async function webhook(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ Stripe webhook or secret key not configured.');
    return res.status(503).send('Webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // IMPORTANT: req.body must be the raw Buffer; see the express.raw() mount in index.js
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        const plan = session.metadata?.plan || 'STARTER';
        const userId = session.metadata?.userId;
        const orgId = session.metadata?.orgId || session.client_reference_id;

        // Minimal, safe update: mark the paying user (or org) ACTIVE
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'ACTIVE', subscriptionPlan: plan },
          });
        } else if (orgId) {
          await prisma.user.updateMany({
            where: { orgId },
            data: { subscriptionStatus: 'ACTIVE', subscriptionPlan: plan },
          });
        }

        break;
      }

      // NOTE: You can add more handlers later if you want fully synced states:
      // case 'customer.subscription.updated':
      // case 'customer.subscription.deleted':
      //   // Map Stripe status to your internal status and update prisma.user/org
      //   break;

      default:
        // Intentionally ignore other events for now
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('⚠️ Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
