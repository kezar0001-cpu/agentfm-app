import express from 'express';
import { prisma } from '../config/prismaClient.js';
import {
  createStripeClient,
  isStripeClientConfigured,
  StripeNotConfiguredError,
} from '../utils/stripeClient.js';
import { sendEmail } from '../utils/email.js';
import { verifyAccessToken } from '../utils/jwt.js';

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
      user = verifyAccessToken(token);
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

// Helper function to authenticate requests
async function authenticateRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// GET /api/billing/invoices - List Stripe invoices for the current user
router.get('/invoices', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    if (!stripeAvailable) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    // Find user's Stripe customer ID
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: {
            stripeCustomerId: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dbUser || !dbUser.subscriptions[0]?.stripeCustomerId) {
      return res.json({ invoices: [] });
    }

    const stripeCustomerId = dbUser.subscriptions[0].stripeCustomerId;

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
    });

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100, // Convert cents to dollars
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      created: invoice.created,
      dueDate: invoice.due_date,
      paidAt: invoice.status_transitions?.paid_at,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.lines?.data[0]?.description || 'Subscription',
    }));

    return res.json({ invoices: formattedInvoices });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('Stripe invoices error:', err);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/billing/payment-method - Update payment method
router.post('/payment-method', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    if (!stripeAvailable) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    // Find user's Stripe customer ID
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: {
            stripeCustomerId: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dbUser || !dbUser.subscriptions[0]?.stripeCustomerId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const stripeCustomerId = dbUser.subscriptions[0].stripeCustomerId;

    // Create a billing portal session for updating payment method
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/subscriptions`,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('Stripe payment method error:', err);
    return res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// POST /api/billing/cancel - Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    if (!stripeAvailable) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { immediate = false } = req.body || {};

    // Find user's active subscription
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: {
            stripeSubscriptionId: { not: null },
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dbUser || !dbUser.subscriptions[0]?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = dbUser.subscriptions[0];

    // Cancel subscription in Stripe
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: !immediate,
        ...(immediate && { cancel_at: 'now' }),
      }
    );

    // Update subscription in database if immediate cancellation
    if (immediate) {
      await applySubscriptionUpdate({
        userId: user.id,
        orgId: user.orgId,
        data: {
          subscriptionStatus: 'CANCELLED',
          subscriptionPlan: 'FREE_TRIAL',
          trialEndDate: null,
        },
      });
    }

    return res.json({
      success: true,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      cancelAt: canceledSubscription.cancel_at,
      currentPeriodEnd: canceledSubscription.current_period_end,
    });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('Stripe cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Helper function to send payment failure notification
async function sendPaymentFailureNotification(userEmail, userName, invoiceUrl) {
  const subject = 'Payment Failed - Action Required';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 10px;
    }
    h1 {
      color: #d32f2f;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 15px;
      color: #555;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #d32f2f;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #b71c1c;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    .warning {
      background-color: #ffebee;
      border-left: 4px solid #d32f2f;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Buildstate</div>
    </div>

    <h1>Payment Failed</h1>

    <p>Hi ${userName},</p>

    <p>We were unable to process your recent payment for your Buildstate subscription. This could be due to:</p>

    <ul>
      <li>Insufficient funds</li>
      <li>Expired credit card</li>
      <li>Payment method declined by your bank</li>
      <li>Incorrect billing information</li>
    </ul>

    <div class="warning">
      <strong>Action Required:</strong> Please update your payment method to avoid interruption to your service.
    </div>

    <p>Click the button below to update your payment information:</p>

    <div class="button-container">
      <a href="${invoiceUrl || process.env.FRONTEND_URL + '/subscriptions'}" class="button">Update Payment Method</a>
    </div>

    <p>If you have any questions or need assistance, please contact our support team.</p>

    <div class="footer">
      <p>This is an automated email from Buildstate. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Buildstate. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await sendEmail(userEmail, subject, html);
    console.log(`Payment failure notification sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send payment failure notification:', error);
  }
}

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
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        try {
          // Fetch customer details from Stripe
          const customer = await stripe.customers.retrieve(customerId);

          // Get user from database
          const dbUser = await prisma.user.findFirst({
            where: {
              subscriptions: {
                some: {
                  stripeCustomerId: customerId,
                },
              },
            },
          });

          if (dbUser && customer.email) {
            const userName = dbUser.firstName || 'Customer';
            const invoiceUrl = invoice.hosted_invoice_url;

            // Send payment failure notification
            await sendPaymentFailureNotification(customer.email, userName, invoiceUrl);

            // Update subscription status to SUSPENDED
            await applySubscriptionUpdate({
              userId: dbUser.id,
              orgId: dbUser.orgId,
              data: {
                subscriptionStatus: 'SUSPENDED',
              },
            });

            console.log(`Payment failure processed for customer ${customerId}`);
          }
        } catch (error) {
          console.error('Error handling payment failure:', error);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        try {
          // Get user from database
          const dbUser = await prisma.user.findFirst({
            where: {
              subscriptions: {
                some: {
                  stripeCustomerId: customerId,
                },
              },
            },
          });

          if (dbUser && subscriptionId) {
            // Fetch subscription to get the current status
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const newStatus = mapStripeStatusToAppStatus(subscription.status);

            // Update subscription status (e.g., from SUSPENDED back to ACTIVE)
            await applySubscriptionUpdate({
              userId: dbUser.id,
              orgId: dbUser.orgId,
              data: {
                subscriptionStatus: newStatus,
              },
            });

            console.log(`Payment succeeded for customer ${customerId}, status updated to ${newStatus}`);
          }
        } catch (error) {
          console.error('Error handling payment success:', error);
        }
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