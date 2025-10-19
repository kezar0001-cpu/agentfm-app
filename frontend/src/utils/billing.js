export const BILLING_PORTAL_URL = 'https://billing.stripe.com/p/session/test_YWNjdF8xU0hKcWdJaXcyYVc3b0oxLF9UR09hMjNLTlZ2TWcwdWxjd3dpall5Q1hKSUpJb3Rn0100ZNZmZZPx';

export const redirectToBillingPortal = () => {
  if (typeof window !== 'undefined') {
    window.location.href = BILLING_PORTAL_URL;
  }
};
