#!/usr/bin/env node
/**
 * Stripe Webhook Testing Script
 *
 * This script helps test Stripe webhook handlers by simulating webhook events.
 *
 * Usage:
 *   node scripts/test-stripe-webhooks.js <event-type>
 *
 * Examples:
 *   node scripts/test-stripe-webhooks.js checkout.session.completed
 *   node scripts/test-stripe-webhooks.js customer.subscription.updated
 *   node scripts/test-stripe-webhooks.js customer.subscription.deleted
 *   node scripts/test-stripe-webhooks.js invoice.payment_failed
 *   node scripts/test-stripe-webhooks.js customer.subscription.schedule.created
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const WEBHOOK_ENDPOINT = process.env.WEBHOOK_TEST_URL || 'http://localhost:3000/api/billing/webhook';

// Sample event data templates
const eventTemplates = {
  'checkout.session.completed': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        customer: customerId,
        subscription: subscriptionId,
        client_reference_id: 'test_org_123',
        metadata: {
          userId: 'test_user_123',
          orgId: 'test_org_123',
          plan: 'PROFESSIONAL',
        },
      },
    },
  }),

  'customer.subscription.updated': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
        customer: customerId,
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [
            {
              price: {
                id: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_test_123',
              },
            },
          ],
        },
        metadata: {
          userId: 'test_user_123',
          orgId: 'test_org_123',
          plan: 'PROFESSIONAL',
        },
      },
    },
  }),

  'customer.subscription.deleted': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
        customer: customerId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
        metadata: {
          userId: 'test_user_123',
          orgId: 'test_org_123',
        },
      },
    },
  }),

  'invoice.payment_failed': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_' + Date.now(),
        object: 'invoice',
        customer: customerId,
        subscription: subscriptionId,
        amount_due: 2900,
        hosted_invoice_url: 'https://invoice.stripe.com/test',
        attempt_count: 1,
      },
    },
  }),

  'invoice.payment_succeeded': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_' + Date.now(),
        object: 'invoice',
        customer: customerId,
        subscription: subscriptionId,
        amount_paid: 2900,
        paid: true,
      },
    },
  }),

  'customer.subscription.schedule.created': (customerId, subscriptionId) => ({
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'customer.subscription.schedule.created',
    data: {
      object: {
        id: 'sub_sched_test_' + Date.now(),
        object: 'subscription_schedule',
        customer: customerId,
        subscription: subscriptionId,
        phases: [
          {
            start_date: Math.floor(Date.now() / 1000),
            end_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: [
              {
                price: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_test_123',
              },
            ],
          },
          {
            start_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: [
              {
                price: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_test_456',
              },
            ],
          },
        ],
      },
    },
  }),
};

async function testWebhook(eventType) {
  if (!eventTemplates[eventType]) {
    console.error(`Unknown event type: ${eventType}`);
    console.log('Available event types:');
    Object.keys(eventTemplates).forEach(type => {
      console.log(`  - ${type}`);
    });
    process.exit(1);
  }

  console.log(`\n🧪 Testing webhook: ${eventType}\n`);

  // Generate test IDs
  const customerId = 'cus_test_' + Date.now();
  const subscriptionId = 'sub_test_' + Date.now();

  // Create event
  const event = eventTemplates[eventType](customerId, subscriptionId);

  console.log('Event payload:');
  console.log(JSON.stringify(event, null, 2));
  console.log('\n');

  // In a real test, you would:
  // 1. Sign the payload with your Stripe webhook secret
  // 2. Send it to your local server
  // 3. Verify the response

  console.log('To test this webhook:');
  console.log('1. Start your server locally');
  console.log('2. Use the Stripe CLI to forward webhooks:');
  console.log('   stripe listen --forward-to localhost:3000/api/billing/webhook');
  console.log('3. Trigger the event:');
  console.log(`   stripe trigger ${eventType}`);
  console.log('\n');
  console.log('Or use Stripe\'s test mode in the Dashboard to send test webhooks.');
}

// Main
const eventType = process.argv[2];
if (!eventType) {
  console.log('Usage: node test-stripe-webhooks.js <event-type>');
  console.log('\nAvailable event types:');
  Object.keys(eventTemplates).forEach(type => {
    console.log(`  - ${type}`);
  });
  process.exit(1);
}

testWebhook(eventType);
