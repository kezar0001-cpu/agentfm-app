import test from 'node:test';
import assert from 'node:assert/strict';

import propertiesRouter from '../src/routes/properties.js';

const {
  normalizePropertyImages,
  propertyImageCreateSchema,
  propertyImageUpdateSchema,
  propertyImageReorderSchema,
  propertyImagesRouter,
} = propertiesRouter._test;

test('property images router is exposed and configured with merge params', () => {
  assert.ok(propertyImagesRouter, 'propertyImagesRouter should be defined');
  assert.equal(propertyImagesRouter.mergeParams, true);
});

test('normalizePropertyImages returns legacy fallback when no records exist', () => {
  const property = {
    id: 'prop-1',
    imageUrl: 'https://example.com/image.png',
    managerId: 'manager-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  };

  const result = normalizePropertyImages(property);
  assert.equal(result.length, 1);
  assert.equal(result[0].imageUrl, property.imageUrl);
  assert.equal(result[0].isPrimary, true);
});

test('normalizePropertyImages sorts images by displayOrder then createdAt', () => {
  const property = {
    id: 'prop-2',
    propertyImages: [
      { id: 'img-2', propertyId: 'prop-2', imageUrl: 'b.png', displayOrder: 2, isPrimary: false, createdAt: new Date('2024-02-01T00:00:00Z') },
      { id: 'img-1', propertyId: 'prop-2', imageUrl: 'a.png', displayOrder: 1, isPrimary: true, createdAt: new Date('2024-01-01T00:00:00Z') },
      { id: 'img-3', propertyId: 'prop-2', imageUrl: 'c.png', displayOrder: 2, isPrimary: false, createdAt: new Date('2024-01-15T00:00:00Z') },
    ],
  };

  const result = normalizePropertyImages(property);
  assert.deepEqual(result.map((img) => img.id), ['img-1', 'img-3', 'img-2']);
});

test('propertyImageCreateSchema accepts hosted or uploaded image sources', () => {
  const hosted = propertyImageCreateSchema.safeParse({ imageUrl: ' https://example.com/test.jpg ' });
  assert.equal(hosted.success, true);

  const uploaded = propertyImageCreateSchema.safeParse({ imageUrl: '/uploads/example.png' });
  assert.equal(uploaded.success, true);

  const failure = propertyImageCreateSchema.safeParse({ imageUrl: 'not-a-url' });
  assert.equal(failure.success, false);
});

test('propertyImageUpdateSchema rejects empty payload', () => {
  const failure = propertyImageUpdateSchema.safeParse({});
  assert.equal(failure.success, false);
  const success = propertyImageUpdateSchema.safeParse({ caption: 'Updated caption' });
  assert.equal(success.success, true);
});

test('propertyImageReorderSchema enforces non-empty ordered ids array', () => {
  const failure = propertyImageReorderSchema.safeParse({ orderedImageIds: [] });
  assert.equal(failure.success, false);
  const success = propertyImageReorderSchema.safeParse({ orderedImageIds: ['img-1', 'img-2'] });
  assert.equal(success.success, true);
});
