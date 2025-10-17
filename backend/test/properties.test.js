import test from 'node:test';
import assert from 'node:assert/strict';

import propertiesRouter from '../src/routes/properties.js';

const {
  propertySchema,
  propertyUpdateSchema,
  applyLegacyAliases,
  toPublicProperty,
} = propertiesRouter._test;

test('properties router enforces authentication middleware', () => {
  const hasAuthGuard = propertiesRouter.stack.some(
    (layer) => layer.handle && layer.handle.name === 'requireAuth',
  );
  assert.equal(hasAuthGuard, true);
});

test('property schema requires core fields and normalises aliases', () => {
  const result = propertySchema.safeParse({
    name: 'Sunset Plaza',
    address: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postcode: '94105',
    country: 'USA',
    type: 'Residential',
    status: 'active',
    coverImage: 'https://example.com/cover.png',
  });

  assert.equal(result.success, true);

  const data = applyLegacyAliases(result.data);
  assert.equal(data.zipCode, '94105');
  assert.equal(data.propertyType, 'Residential');
  assert.equal(data.status, 'ACTIVE');
  assert.equal(data.imageUrl, 'https://example.com/cover.png');
});

test('property update schema allows partial payloads', () => {
  const payload = propertyUpdateSchema.safeParse({ status: 'UNDER_MAINTENANCE', totalUnits: 12 });
  assert.equal(payload.success, true);
  const data = applyLegacyAliases(payload.data);
  assert.equal(data.totalUnits, 12);
  assert.equal(data.status, 'UNDER_MAINTENANCE');
});

test('toPublicProperty returns legacy aliases for compatibility', () => {
  const record = {
    id: 'property-1',
    name: 'Sunset Plaza',
    address: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA',
    propertyType: 'Residential',
    status: 'ACTIVE',
    imageUrl: 'https://example.com/image.png',
  };

  const publicRecord = toPublicProperty(record);
  assert.equal(publicRecord.postcode, '94105');
  assert.equal(publicRecord.type, 'Residential');
  assert.deepEqual(publicRecord.images, ['https://example.com/image.png']);
});
