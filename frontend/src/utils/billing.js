export const BILLING_PORTAL_URL = 'https://billing.stripe.com/p/login/test_bJe28r8uw1hO6Uy7S0fUQ00';

export const redirectToBillingPortal = () => {
  if (typeof window !== 'undefined') {
    window.location.href = BILLING_PORTAL_URL;
  }
};
