import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

const ORIGINAL_SECRET = process.env.JWT_SECRET;

const restoreSecret = () => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  }
};

describe('JWT secret helper', () => {
  afterEach(() => {
    restoreSecret();
  });

  it('falls back to default when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    const { getJwtSecret } = await import('../src/utils/jwt.js?test=default');
    assert.strictEqual(getJwtSecret(), 'ed4579c94dee0cf3ecffc3dbbfe7ab0b');
  });

  it('returns trimmed environment secret when provided', async () => {
    process.env.JWT_SECRET = '  custom-secret  ';
    const { getJwtSecret } = await import('../src/utils/jwt.js?test=custom');
    assert.strictEqual(getJwtSecret(), 'custom-secret');
  });
});


describe('session utilities use fallback JWT secret', () => {
  beforeEach(() => {
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    restoreSecret();
  });

  it('signs and verifies using the fallback secret', async () => {
    const { setSessionCookie, readSession, clearSession } = await import(`../src/utils/session.js?test=${Date.now()}`);

    const res = {
      cookieCalls: [],
      cookie(name, value, options) {
        this.cookieCalls.push({ name, value, options });
      },
      clearCookieCalls: [],
      clearCookie(name, options) {
        this.clearCookieCalls.push({ name, options });
      },
    };

    setSessionCookie(res, { id: 'user-123' });
    assert.strictEqual(res.cookieCalls.length, 1);

    const token = res.cookieCalls[0].value;
    const decoded = readSession({ cookies: { session: token } });
    assert.ok(decoded);
    assert.strictEqual(decoded.id, 'user-123');

    clearSession(res);
    assert.strictEqual(res.clearCookieCalls.length, 1);
  });
});
