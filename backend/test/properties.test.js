import test from 'node:test';
import assert from 'node:assert/strict';

import propertiesRouter from '../src/routes/properties.js';

const {
  propertySchema,
  normaliseSingleImage,
  normaliseImageList,
  ensureUserOrg,
} = propertiesRouter._test;

test('properties router enforces authentication middleware', () => {
  const hasAuthGuard = propertiesRouter.stack.some(
    (layer) => layer.handle && layer.handle.name === 'requireAuth',
  );
  assert.equal(hasAuthGuard, true);
});

test('property schema accepts image objects and normalises them to URLs', () => {
  const input = {
    name: 'Sunset Plaza',
    address: '123 Market St',
    coverImage: { url: '/uploads/cover.png' },
    images: [
      { url: '/uploads/one.png' },
      '/uploads/two.png',
    ],
  };

  const result = propertySchema.safeParse(input);
  assert.equal(result.success, true);
  const cover = normaliseSingleImage(result.data.coverImage);
  const gallery = normaliseImageList(result.data.images);

  assert.equal(cover, '/uploads/cover.png');
  assert.deepEqual(gallery, ['/uploads/one.png', '/uploads/two.png']);
});

test('normaliseSingleImage respects undefined/null handling', () => {
  assert.equal(normaliseSingleImage(undefined), undefined);
  assert.equal(normaliseSingleImage(undefined, { defaultToNull: true }), null);
  assert.equal(normaliseSingleImage(null), null);
  assert.equal(
    normaliseSingleImage({ url: '/uploads/object.png' }),
    '/uploads/object.png',
  );
});

test('normaliseImageList handles undefined, null and arrays', () => {
  assert.equal(normaliseImageList(undefined), undefined);
  assert.equal(normaliseImageList(null), null);
  assert.deepEqual(
    normaliseImageList([
      { url: '/uploads/a.png' },
      '/uploads/b.png',
    ]),
    ['/uploads/a.png', '/uploads/b.png'],
  );
});

test('ensureUserOrg recreates an organisation when the stored one is missing', async () => {
  const user = {
    id: 'user-1',
    orgId: 'missing-org',
    company: 'Acme Facilities',
    name: 'Alex Manager',
  };

  const callLog = [];

  const fakePrisma = {
    org: {
      findUnique: async (args) => {
        callLog.push({ method: 'org.findUnique', args });
        return null;
      },
    },
    $transaction: async (callback) =>
      callback({
        user: {
          findUnique: async () => ({
            id: user.id,
            orgId: user.orgId,
            company: user.company,
            name: user.name,
          }),
          update: async ({ data }) => {
            callLog.push({ method: 'user.update', args: data });
            user.orgId = data.orgId;
            return { id: user.id, orgId: data.orgId };
          },
        },
        org: {
          findUnique: async (args) => {
            callLog.push({ method: 'tx.org.findUnique', args });
            return null;
          },
          create: async ({ data, select }) => {
            callLog.push({ method: 'org.create', args: data });
            const record = { id: 'org-new-id', name: data.name };
            return select ? { id: record.id } : record;
          },
        },
      }),
  };

  const orgId = await ensureUserOrg(user, fakePrisma);

  assert.equal(orgId, 'org-new-id');
  assert.equal(user.orgId, 'org-new-id');
  assert.equal(
    callLog.filter((entry) => entry.method === 'org.create').length,
    1,
  );
});
