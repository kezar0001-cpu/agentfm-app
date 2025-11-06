import test from 'node:test';
import assert from 'node:assert/strict';

const propertiesModule = await import('../properties.js');
const router = propertiesModule.default;
const { invalidatePropertyCaches, collectPropertyCacheUserIds } = router._test;

test('invalidatePropertyCaches clears paginated property cache variants for a single user', async () => {
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

test('invalidatePropertyCaches invalidates cache entries for multiple users', async () => {
  const patternCalls = [];
  const invalidateCalls = [];

  await invalidatePropertyCaches(['manager-1', 'owner-1', 'owner-2'], {
    invalidateFn: async (key) => {
      invalidateCalls.push(key);
    },
    invalidatePatternFn: async (pattern) => {
      patternCalls.push(pattern);
    },
  });

  ['manager-1', 'owner-1', 'owner-2'].forEach((userId) => {
    assert.ok(
      patternCalls.includes(`cache:/api/properties*user:${userId}`),
      `expected properties cache pattern to be invalidated for ${userId}`
    );

    assert.ok(
      invalidateCalls.includes(`cache:/api/properties:user:${userId}`),
      `expected base properties cache key to be invalidated for ${userId}`
    );

    assert.ok(
      invalidateCalls.includes(`cache:/api/dashboard/summary:user:${userId}`),
      `expected dashboard cache key to be invalidated for ${userId}`
    );
  });
});

test('collectPropertyCacheUserIds returns unique user identifiers for managers and owners', () => {
  const property = {
    managerId: 'manager-1',
    owners: [
      { ownerId: 'owner-1' },
      { ownerId: 'owner-2' },
      { owner: { id: 'owner-3' } },
    ],
  };

  const result = collectPropertyCacheUserIds(property, 'current-user');

  assert.deepEqual(new Set(result), new Set(['current-user', 'manager-1', 'owner-1', 'owner-2', 'owner-3']));
});
