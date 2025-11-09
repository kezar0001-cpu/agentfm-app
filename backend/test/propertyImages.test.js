import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import prisma from '../src/config/prismaClient.js';

import propertiesRouter from '../src/routes/properties.js';

const {
  normalizePropertyImages,
  propertyImageCreateSchema,
  propertyImageUpdateSchema,
  propertyImageReorderSchema,
  propertyImagesRouter,
  maybeHandleImageUpload,
  isMultipartRequest,
  determineNewImagePrimaryFlag,
  extractImageUrlFromInput,
  normaliseSubmittedPropertyImages,
  applyLegacyAliases,
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

test('propertyImageCreateSchema normalises altText alias', () => {
  const parsed = propertyImageCreateSchema.parse({
    imageUrl: 'https://example.com/front.jpg',
    altText: 'Front elevation',
  });

  assert.equal(parsed.caption, 'Front elevation');
  assert.equal(parsed.isPrimary, undefined);
});

test('propertyImageUpdateSchema rejects empty payload', () => {
  const failure = propertyImageUpdateSchema.safeParse({});
  assert.equal(failure.success, false);
  const success = propertyImageUpdateSchema.safeParse({ caption: 'Updated caption' });
  assert.equal(success.success, true);
});

test('propertyImageUpdateSchema maps altText to caption field', () => {
  const parsed = propertyImageUpdateSchema.parse({ altText: 'Balcony view' });
  assert.equal(parsed.caption, 'Balcony view');
});

test('propertyImageReorderSchema enforces non-empty ordered ids array', () => {
  const failure = propertyImageReorderSchema.safeParse({ orderedImageIds: [] });
  assert.equal(failure.success, false);
  const success = propertyImageReorderSchema.safeParse({ orderedImageIds: ['img-1', 'img-2'] });
  assert.equal(success.success, true);
});

test('determineNewImagePrimaryFlag promotes first upload even when explicitly false', () => {
  assert.equal(
    determineNewImagePrimaryFlag(false, { hasExistingImages: false, hasExistingPrimary: false }),
    true
  );
});

test('extractImageUrlFromInput resolves mixed payloads', () => {
  assert.equal(extractImageUrlFromInput(' https://example.com/test.jpg '), 'https://example.com/test.jpg');
  assert.equal(
    extractImageUrlFromInput({ imageUrl: ' /uploads/image.png ' }),
    '/uploads/image.png'
  );
  assert.equal(
    extractImageUrlFromInput({ url: 'https://example.com/gallery.jpg' }),
    'https://example.com/gallery.jpg'
  );
  assert.equal(extractImageUrlFromInput({}), null);
});

test('normaliseSubmittedPropertyImages keeps captions and primary selection', () => {
  const result = normaliseSubmittedPropertyImages([
    'https://example.com/first.jpg',
    { imageUrl: 'https://example.com/second.jpg', altText: 'Second', isPrimary: true },
    { imageUrl: 'invalid-url' },
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0].imageUrl, 'https://example.com/first.jpg');
  assert.equal(result[0].isPrimary, false);
  assert.equal(result[0].captionProvided, false);
  assert.equal(result[1].imageUrl, 'https://example.com/second.jpg');
  assert.equal(result[1].isPrimary, true);
  assert.equal(result[1].caption, 'Second');
  assert.equal(result[1].captionProvided, true);
});

test('applyLegacyAliases prefers structured imageMetadata alias when provided', () => {
  const result = applyLegacyAliases({
    images: ['https://example.com/legacy.jpg'],
    imageMetadata: [
      { imageUrl: 'https://example.com/structured.jpg', caption: 'Front', isPrimary: true },
      { url: '/uploads/lobby.png', caption: 'Lobby' },
    ],
  });

  assert.ok(Array.isArray(result.images));
  assert.equal(result.images.length, 2);
  assert.equal(result.images[0].imageUrl, 'https://example.com/structured.jpg');
  assert.equal(result.images[0].caption, 'Front');
  assert.equal(result.images[0].isPrimary, true);
  assert.equal(extractImageUrlFromInput(result.images[1]), '/uploads/lobby.png');
  assert.equal(result.imageMetadata, undefined);
});

test('determineNewImagePrimaryFlag keeps existing primary unless explicitly overridden', () => {
  assert.equal(
    determineNewImagePrimaryFlag(undefined, { hasExistingImages: true, hasExistingPrimary: true }),
    false
  );
  assert.equal(
    determineNewImagePrimaryFlag(false, { hasExistingImages: true, hasExistingPrimary: true }),
    false
  );
  assert.equal(
    determineNewImagePrimaryFlag(true, { hasExistingImages: true, hasExistingPrimary: true }),
    true
  );
  assert.equal(
    determineNewImagePrimaryFlag(false, { hasExistingImages: true, hasExistingPrimary: false }),
    true
  );
});

test('isMultipartRequest detects multipart form submissions', () => {
  assert.equal(isMultipartRequest({ headers: { 'content-type': 'multipart/form-data; boundary=abc' } }), true);
  assert.equal(isMultipartRequest({ headers: { 'content-type': 'application/json' } }), false);
  assert.equal(isMultipartRequest({ headers: {} }), false);
  assert.equal(isMultipartRequest({}), false);
});

test('maybeHandleImageUpload preserves JSON bodies when request is not multipart', async () => {
  const req = {
    headers: { 'content-type': 'application/json' },
    body: { imageUrl: 'https://example.com/example.jpg', caption: 'Sample' },
  };
  const res = {};

  let nextCalls = 0;
  await new Promise((resolve, reject) => {
    maybeHandleImageUpload(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      nextCalls += 1;
      resolve();
    });
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(req.body, { imageUrl: 'https://example.com/example.jpg', caption: 'Sample' });
});

test('property image upload removes orphaned files when access is denied', async () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const tempFilename = `test-upload-${Date.now()}.png`;
  const tempFilePath = path.join(uploadDir, tempFilename);
  fs.writeFileSync(tempFilePath, 'test');

  const originalPropertyDelegate = prisma.property;
  prisma.property = {
    async findUnique() {
      return { id: 'prop-denied', managerId: 'other-manager', owners: [] };
    },
  };

  const routeLayer = propertyImagesRouter.stack.find(
    (layer) => layer.route?.path === '/' && layer.route.methods?.post
  );

  assert.ok(routeLayer?.route?.stack?.length >= 1, 'Upload route handler should be registered');

  const handlerLayer = routeLayer.route.stack[routeLayer.route.stack.length - 1];
  const handler = handlerLayer.handle;

  const req = {
    params: { id: 'prop-denied' },
    body: {},
    file: { path: tempFilePath, filename: tempFilename },
    user: { id: 'manager-1', role: 'PROPERTY_MANAGER' },
  };

  let statusCode = null;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return data;
    },
  };

  try {
    await handler(req, res);

    assert.equal(statusCode, 403);
    assert.equal(payload?.success, false);
    assert.equal(fs.existsSync(tempFilePath), false);
  } finally {
    prisma.property = originalPropertyDelegate;
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});
