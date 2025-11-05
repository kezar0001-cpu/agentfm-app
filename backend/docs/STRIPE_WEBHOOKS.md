# Stripe Webhook Implementation Guide

## Overview

This document describes the complete Stripe webhook implementation for managing subscription lifecycle events. The implementation ensures that subscription status changes are immediately reflected in the database, preventing users from retaining access after their subscription expires.

## Implemented Webhook Handlers

### 1. `checkout.session.completed`

**Purpose**: Creates a new subscription when a customer completes the checkout process.

**Actions**:
- Updates User model with subscription status and plan
- Creates/updates Subscription record with Stripe customer ID and subscription ID
- Stores billing period information
- Clears trial end date if subscription is active

**Security**: Ensures immediate subscription activation upon successful payment.

### 2. `customer.subscription.updated`

**Purpose**: Updates subscription details when changes occur (status, plan, billing period).

**Actions**:
- Updates User model subscription status and plan
- Updates Subscription record with current status and period
- Handles status transitions (active, suspended, trial, etc.)
- Tracks cancellation timestamps

**Security**: Reflects status changes immediately, including suspensions due to payment issues.

### 3. `customer.subscription.deleted`

**Purpose**: Handles subscription cancellation and deletion.

**Actions**:
- Sets User subscription status to CANCELLED
- Reverts User plan to FREE_TRIAL
- Updates Subscription record with cancellation timestamp
- Removes trial end date

**Security**: Immediately revokes access when subscription is cancelled.

### 4. `invoice.payment_failed`

**Purpose**: Suspends access when payment fails.

**Actions**:
- Sends payment failure notification email to customer
- Updates User status to SUSPENDED
- Updates Subscription record status to SUSPENDED
- Includes fallback logic to find user by customer ID or subscription ID

**Security**: Prevents continued access when payment processing fails.

### 5. `invoice.payment_succeeded`

**Purpose**: Restores access when payment succeeds (e.g., after a failed payment).

**Actions**:
- Retrieves latest subscription status from Stripe
- Updates User status (typically from SUSPENDED to ACTIVE)
- Updates Subscription record with current status and period
- Updates plan information if changed

**Security**: Automatically restores access when payment issues are resolved.

### 6. `customer.subscription.schedule.created`

**Purpose**: Logs scheduled subscription changes (e.g., plan upgrades/downgrades).

**Actions**:
- Identifies the user associated with the schedule
- Extracts upcoming phase details
- Logs scheduled changes for monitoring
- Does not update subscription until schedule executes

**Note**: Actual subscription updates occur when the schedule executes and triggers `customer.subscription.updated`.

## Database Schema

### User Model
```prisma
model User {
  subscriptionPlan        SubscriptionPlan        @default(FREE_TRIAL)
  subscriptionStatus      SubscriptionStatus      @default(TRIAL)
  trialEndDate            DateTime?
  subscriptions           Subscription[]
  // ... other fields
}
```

### Subscription Model
```prisma
model Subscription {
  id                     String             @id @default(cuid())
  userId                 String
  planId                 String
  planName               String
  status                 SubscriptionStatus @default(TRIAL)
  stripeCustomerId       String?            @unique
  stripeSubscriptionId   String?            @unique
  stripeCurrentPeriodEnd DateTime?
  cancelledAt            DateTime?
  // ... other fields
}
```

## Status Mapping

Stripe Status → Application Status:
- `active` → `ACTIVE`
- `trialing` → `TRIAL`
- `past_due`, `unpaid`, `paused` → `SUSPENDED`
- `canceled`, `incomplete_expired` → `CANCELLED`
- `incomplete` → `PENDING`

## Testing Webhooks

### Using Stripe CLI (Recommended)

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

4. **Trigger test events**:
   ```bash
   # Test checkout completion
   stripe trigger checkout.session.completed

   # Test subscription update
   stripe trigger customer.subscription.updated

   # Test subscription deletion
   stripe trigger customer.subscription.deleted

   # Test payment failure
   stripe trigger invoice.payment_failed

   # Test payment success
   stripe trigger invoice.payment_succeeded
   ```

### Using Stripe Dashboard

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/billing/webhook`
4. Select events to listen to (or select "all events" for testing)
5. Use "Send test webhook" to simulate events

### Using Test Script

```bash
# Run the test script
node backend/scripts/test-stripe-webhooks.js checkout.session.completed

# View sample payloads for all events
node backend/scripts/test-stripe-webhooks.js
```

## Security Considerations

### 1. Webhook Signature Verification
All webhook events are verified using Stripe's signature verification:
```javascript
event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 2. Immediate Status Updates
- User access is controlled by `subscriptionStatus` field
- All handlers update this field immediately
- No grace period for expired subscriptions

### 3. Idempotency
- Handlers use upsert logic to handle duplicate events
- Stripe IDs are used as unique identifiers
- Safe to replay events multiple times

### 4. Fallback Logic
Payment failure handler includes multiple fallback methods:
1. Try to find user by `stripeCustomerId`
2. Fall back to `stripeSubscriptionId`
3. Log warning if user not found

## Environment Variables

Required environment variables:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PROFESSIONAL=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...
FRONTEND_URL=https://your-frontend.com
```

## Monitoring

### Logs
All webhook events log:
- Event type being processed
- User/subscription IDs involved
- Status transitions
- Any errors or warnings

Example:
```
Processing checkout.session.completed
Created new subscription for user clx123abc
Checkout completed: sub_123abc for user clx123abc
```

### Error Handling
- Invalid signatures return 400
- Missing Stripe config returns 503
- Processing errors return 500
- All errors are logged with details

## Common Issues and Solutions

### Issue: User not found in webhook
**Cause**: Subscription record doesn't exist yet
**Solution**: Ensure checkout.session.completed runs first to create Subscription record

### Issue: Multiple subscriptions for one user
**Cause**: User completed multiple checkouts
**Solution**: Webhook handlers use most recent subscription

### Issue: Status not updating
**Cause**: Webhook not reaching server or failing verification
**Solution**: Check webhook secret and test with Stripe CLI

## Related Files

- `/backend/src/routes/billing.js` - Webhook handlers implementation
- `/backend/scripts/test-stripe-webhooks.js` - Testing utility
- `/backend/prisma/schema.prisma` - Database schema
- `/backend/src/utils/stripeClient.js` - Stripe client configuration

## Migration Notes

If upgrading from previous implementation:
1. Existing users may not have Subscription records
2. First webhook event will create Subscription record
3. Old user records maintain their subscription status
4. No data migration needed

## Support

For Stripe webhook debugging:
- Check Stripe Dashboard → Developers → Events for event history
- View detailed logs for each webhook attempt
- Use "Resend event" to replay failed events
