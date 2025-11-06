import test from 'node:test';
import assert from 'node:assert/strict';

const propertiesModule = await import('../properties.js');
const router = propertiesModule.default;
const { invalidatePropertyCaches } = router._test;

test('invalidatePropertyCaches clears paginated property cache variants for a user', async () => {
  const patternCalls = [];
  const invalidateCalls = [];

  await invalidatePropertyCaches('user-123', {
    invalidateFn: async (key) => {
      invalidateCalls.push(key);
    },
    invalidatePatternFn: async (pattern) => {
      patternCalls.push(pattern);
    },
  });

  assert.ok(
    patternCalls.includes('cache:/api/properties*user:user-123'),
    'expected properties cache pattern to be invalidated'
  );

  assert.ok(
    invalidateCalls.includes('cache:/api/properties:user:user-123'),
    'expected base properties cache key to be invalidated'
  );

  assert.ok(
    invalidateCalls.includes('cache:/api/dashboard/summary:user:user-123'),
    'expected dashboard cache key to be invalidated'
  );
});
