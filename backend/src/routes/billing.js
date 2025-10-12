import express from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/billing/checkout
router.post('/checkout', async (req, res) => {
  try {
    // Require JWT
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    // Decode (we only need email/orgId/id for now)
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { plan = 'STARTER', successUrl, cancelUrl } = req.body || {};

    // Map plan -> Price ID (env)
    const planMap = {
      STARTER: process.env.STRIPE_PRICE_ID_STARTER,
      PROFESSIONAL: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
      ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };
    const priceId = planMap[plan];
    if (!priceId) return res.status(400).json({ error: `Unknown plan or missing price id: ${plan}` });

    // Always add session_id placeholder so we can confirm if webhook misses
    const defaultSuccess = `${process.env.FRONTEND_URL}/subscriptions?success=1`;
    const baseSuccess = (successUrl || process.env.STRIPE_SUCCESS_URL || defaultSuccess);
    const success = `${baseSuccess}${baseSuccess.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    const cancel = cancelUrl
      || process.env.STRIPE_CANCEL_URL
      || `${process.env.FRONTEND_URL}/subscriptions?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      customer_email: user.email,
      client_reference_id: user.orgId || user.id,
      metadata: { orgId: user.orgId || '', userId: user.id || '', plan },
      allow_promotion_codes: true,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

/**
 * Fallback confirmation if webhook doesn’t hit in time.
 * POST /api/billing/confirm  { sessionId }
 */
router.post('/confirm', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    // Verify with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (session.mode !== 'subscription') {
      return res.status(400).json({ error: 'Not a subscription session' });
    }
    // “complete” for new Checkout, or payment_status “paid” for paid sessions.
    const isComplete = session.status === 'complete' || session.payment_status === 'paid';
    if (!isComplete) return res.status(400).json({ error: 'Session not complete' });

    // Update your DB just like the webhook
    const userId = session.metadata?.userId;
    const orgId = session.metadata?.orgId || session.client_reference_id;
    const plan = session.metadata?.plan || 'STARTER';

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

    return res.json({ ok: true });
  } catch (err) {
    console.error('Stripe confirm error:', err);
    return res.status(500).json({ error: 'Confirm failed' });
  }
});

/**
 * Stripe Webhook (keep as-is; this is still the primary source of truth)
 */
export async function webhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                 // raw body (index.js mounts express.raw)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const orgId  = session.metadata?.orgId || session.client_reference_id;
        const plan   = session.metadata?.plan || 'STARTER';

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
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('⚠️ Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
