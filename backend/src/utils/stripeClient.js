// backend/src/utils/stripeClient.js
// Centralised Stripe client initialisation that degrades gracefully when
// credentials are not provided (e.g. in local development or unit tests).

import Stripe from 'stripe';

export class StripeNotConfiguredError extends Error {
  constructor(message = 'Stripe secret key not configured') {
    super(message);
    this.name = 'StripeNotConfiguredError';
  }
}

const createStub = () => {
  const throwNotConfigured = () => {
    throw new StripeNotConfiguredError();
  };

  return {
    _isStub: true,
    checkout: {
      sessions: {
        create: async () => throwNotConfigured(),
        retrieve: async () => throwNotConfigured(),
      },
    },
    webhooks: {
      constructEvent: () => throwNotConfigured(),
    },
  };
};

export const createStripeClient = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'test') {
      console.warn('Stripe secret key is not configured - using stub client for tests');
    }
    return createStub();
  }

  const options = {};
  if (process.env.STRIPE_API_VERSION) {
    options.apiVersion = process.env.STRIPE_API_VERSION;
  }

  return new Stripe(apiKey, options);
};

export const isStripeClientConfigured = (client) => !client?._isStub;

