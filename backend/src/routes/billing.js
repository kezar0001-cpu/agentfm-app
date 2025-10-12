// backend/src/routes/billing.js
import { Router } from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Pull info from Bearer token
function getAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded; // { id, email, role, orgId }
  } catch {
    return null;
  }
}

// POST /api/billing/create-checkout-session
// Only PMs can subscribe. Creates a session for STRIPE_PRICE_ID_STARTER.
router.post('/create-checkout-session', async (req, res) => {
  try {
    const decoded = getAuth(req);
    if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // only property managers can pay
    if (decoded.role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ success: false, message: 'Only Property Managers can subscribe' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const priceId = process.env.STRIPE_PRICE_ID_STARTER;
    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      return res.status(503).json({ success: false, message: 'Billing not configured' });
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3000';

    // Ensure a Stripe Customer (store on user)
    let customerId = user.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id, orgId: user.orgId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // success lands on FE and immediately calls /api/billing/activate with session_id
      success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/subscription?canceled=true`,
      allow_promotion_codes: true,
      metadata: { userId: user.id, orgId: user.orgId },
    });

    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
});

// POST /api/billing/create-portal-session
router.post('/create-portal-session', async (req, res) => {
  try {
    const decoded = getAuth(req);
    if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ success: false, message: 'Billing not set up' });
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/subscription`,
    });

    return res.json({ success: true, url: portal.url });
  } catch (err) {
    console.error('create-portal-session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create billing portal session' });
  }
});

// GET /api/billing/activate?session_id=cs_...
// Called by the FE after success_url. Verifies, then marks subscription ACTIVE.
router.get('/activate', async (req, res) => {
  try {
    const decoded = getAuth(req);
    if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ success: false, message: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    });

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Session not complete' });
    }

    const sub = session.subscription;
    const stripeSubscriptionId = sub?.id || null;
    const currentPeriodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000) : null;

    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'STARTER',
        stripeSubscriptionId,
        // optional tracking
        trialEndDate: null,
      },
    });

    return res.json({
      success: true,
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd,
    });
  } catch (err) {
    console.error('activate error:', err);
    return res.status(500).json({ success: false, message: 'Activation failed' });
  }
});

export default router;
