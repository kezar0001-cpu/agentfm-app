import { afterEach, it } from 'node:test';
import assert from 'node:assert';

const originalApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = originalApiKey;
  }
});

it('throws a clear error when the Resend API key is missing', async () => {
  delete process.env.RESEND_API_KEY;
  const { sendEmail } = await import(`../src/utils/email.js?test=${Date.now()}`);

  await assert.rejects(
    () => sendEmail('user@example.com', 'Subject', '<p>Hello!</p>'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Resend API key is not configured/);
      return true;
    },
  );
});
