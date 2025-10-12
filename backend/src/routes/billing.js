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

    const success = successUrl || process.env.STRIPE_SUCCESS_URL || `${process.env.FRONTEND_URL}/subscriptions?success=1`;
    const cancel  = cancelUrl  || process.env.STRIPE_CANCEL_URL  || `${process.env.FRONTEND_URL}/subscriptions?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      customer_email: user.email, // simple start; later reuse a saved customer id
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
 * Named export: Stripe Webhook handler
 * Mount with express.raw() in index.js so signature verification works.
 */
export async function webhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body buffer (express.raw)
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

        // Minimal, safe update: mark payer ACTIVE
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'ACTIVE', subscriptionPlan: plan },
          });
        } else if (orgId) {
          // Or flip everyone in the org to ACTIVE (optional)
          await prisma.user.updateMany({
            where: { orgId },
            data: { subscriptionStatus: 'ACTIVE', subscriptionPlan: plan },
          });
        }
        break;
      }

      // Optional: keep states in sync if you want (can add later)
      // case 'customer.subscription.updated':
      // case 'customer.subscription.deleted':
      //   // map Stripe status to your status and update prisma.user/org
      //   break;

      default:
        // ignore other events for now
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('⚠️ Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
