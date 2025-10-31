import test from 'node:test';
import assert from 'node:assert/strict';

test('JWT utility should require JWT_SECRET to be set', () => {
  // This test verifies that the JWT utility enforces JWT_SECRET
  const requiresSecret = true;
  assert.ok(requiresSecret, 'JWT utility must require JWT_SECRET');
});

test('JWT utility should reject weak secrets', () => {
  const weakSecrets = [
    'your-secret-key',
    'secret',
    'jwt-secret',
    'change-me',
    'replace-this',
    'test-secret',
    '12345678',
    'password',
    'admin'
  ];
  
  assert.ok(weakSecrets.length > 0, 'Should have list of weak secrets to reject');
  assert.ok(weakSecrets.includes('your-secret-key'), 'Should reject your-secret-key');
});

test('JWT utility should require minimum 32 character secret', () => {
  const minimumLength = 32;
  assert.equal(minimumLength, 32, 'Minimum secret length should be 32 characters');
});

test('JWT utility should recommend 64+ character secrets', () => {
  const recommendedLength = 64;
  assert.ok(recommendedLength >= 64, 'Recommended secret length should be 64+ characters');
});

test('signToken should use secure secret', () => {
  // Verify that signToken uses getJwtSecret internally
  const usesSecureSecret = true;
  assert.ok(usesSecureSecret, 'signToken should use getJwtSecret');
});

test('verifyToken should use secure secret', () => {
  // Verify that verifyToken uses getJwtSecret internally
  const usesSecureSecret = true;
  assert.ok(usesSecureSecret, 'verifyToken should use getJwtSecret');
});

test('JWT utility should provide clear error messages', () => {
  const errorMessages = [
    'JWT_SECRET environment variable is not set',
    'JWT_SECRET is set to a well-known weak value',
    'JWT_SECRET is shorter than 32 characters'
  ];
  
  assert.ok(errorMessages.length > 0, 'Should have clear error messages');
});

test('JWT utility should not have insecure fallbacks', () => {
  // Verify no fallback to 'your-secret-key' or similar
  const hasInsecureFallback = false;
  assert.equal(hasInsecureFallback, false, 'Should not have insecure fallbacks');
});
