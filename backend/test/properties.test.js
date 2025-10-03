const test = require('node:test');
const assert = require('node:assert/strict');

const { z } = require('zod');
const propertiesRouter = require('../src/routes/properties');
const {
  propertySchema,
  normaliseSingleImage,
  normaliseImageList,
  numericOptional,
} = propertiesRouter._test;

test('properties router enforces authentication middleware', () => {
  const hasAuthGuard = propertiesRouter.stack.some(
    (layer) => layer.handle && layer.handle.name === 'requireAuth'
  );
  assert.equal(hasAuthGuard, true);
});

test('property schema accepts image objects and normalises them to URLs', () => {
  const input = {
    name: 'Sunset Plaza',
    type: 'Residential',
    city: 'Dubai',
    country: 'UAE',
    coverImage: { url: '/uploads/cover.png' },
    images: [
      { url: '/uploads/one.png' },
      '/uploads/two.png',
    ],
    tags: ['premium'],
    portfolioValue: '1250000',
    occupancyRate: '0.95',
  };

  const result = propertySchema.safeParse(input);
  assert.equal(result.success, true);
  const cover = normaliseSingleImage(result.data.coverImage);
  const gallery = normaliseImageList(result.data.images);

  assert.equal(cover, '/uploads/cover.png');
  assert.deepEqual(gallery, ['/uploads/one.png', '/uploads/two.png']);
  assert.equal(result.data.portfolioValue, 1250000);
  assert.equal(result.data.occupancyRate, 0.95);
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

test('numericOptional helper converts numeric-like values', () => {
  const schema = numericOptional(z.number().min(0));
  const parsed = schema.parse('42.5');
  assert.equal(parsed, 42.5);
  const nullValue = schema.parse('');
  assert.equal(nullValue, null);
});
