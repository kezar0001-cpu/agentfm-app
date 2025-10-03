// agentfm-backend/src/routes/properties.js
const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All property routes require an authenticated user so we can scope
// queries to the caller's organisation. Without this guard, hitting any
// endpoint without `req.user` would previously throw when attempting to
// read `req.user.orgId`, resulting in a 500 error instead of a 401.
router.use(requireAuth);

/** Accept relative or absolute URLs (just a non-empty string). */
const relOrAbsString = z.string().min(1);

/** Accept either a direct URL string or an object with a url property. */
const imageValueSchema = z.union([
  relOrAbsString,
  z.object({ url: relOrAbsString })
]);

/** Validation schema for incoming JSON */
const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  coverImage: imageValueSchema.optional().nullable(),
  images: z.array(imageValueSchema).optional().nullable(), // optional array of strings
});

/** Helper: respond with readable Zod error (400) */
function sendZodError(res, err) {
  const first = err?.issues?.[0];
  if (first?.message) return res.status(400).json({ error: first.message });
  return res.status(400).json({ error: 'Invalid request' });
}

/** Helper: strip undefined keys (so Prisma ignores them) */
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Normalize a single image value into a URL string/null/undefined. */
function normaliseSingleImage(value, { defaultToNull = false } = {}) {
  if (value === undefined) return defaultToNull ? null : undefined;
  if (value === null) return null;
  return typeof value === 'string' ? value : value.url;
}

/** Normalize an array of image values into an array of URL strings/null/undefined. */
function normaliseImageList(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.map((item) => (typeof item === 'string' ? item : item.url));
}

/** GET /properties (all for org) */
router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.property.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /properties (create) */
router.post('/', async (req, res, next) => {
  try {
    const parsed = propertySchema
      .partial({ city: true, state: true, zipCode: true, country: true })
      .safeParse(req.body);
    if (!parsed.success) return sendZodError(res, parsed.error);
    const data = parsed.data;

    const coverImage = normaliseSingleImage(data.coverImage, { defaultToNull: true });
    const images = normaliseImageList(data.images);

    // First attempt: include images if present
    const common = {
      orgId: req.user.orgId,
      name: data.name,
      address: data.address,
      city: data.city ?? null,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      country: data.country ?? null,
      coverImage,
    };

    const withImages = clean({
      ...common,
      images, // ONLY send if provided
    });

    try {
      const created = await prisma.property.create({ data: withImages });
      return res.status(201).json(created);
    } catch (e) {
      // If DB doesn't have "images" column, Prisma throws.
      const msg = String(e?.message || '');
      const looksLikeMissingImagesColumn =
        msg.includes('Unknown arg `images`') ||
        msg.includes('column "images" does not exist') ||
        msg.includes('no such column: images');

      if (!looksLikeMissingImagesColumn) throw e;

      // Retry WITHOUT images
      const created = await prisma.property.create({ data: common });
      return res.status(201).json(created);
    }
  } catch (err) { next(err); }
});

/** GET /properties/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });
    if (!row) return res.status(404).json({ error: 'Property not found' });
    res.json(row);
  } catch (err) { next(err); }
});

/** PATCH /properties/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) return sendZodError(res, parsed.error);
    const data = parsed.data;

    const coverImage = normaliseSingleImage(data.coverImage);
    const images = normaliseImageList(data.images);

    const updateData = clean({
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      coverImage,
      images, // only if provided
    });

    try {
      const result = await prisma.property.updateMany({
        where: { id: req.params.id, orgId: req.user.orgId },
        data: updateData,
      });
      if (result.count === 0) return res.status(404).json({ error: 'Property not found' });
    } catch (e) {
      // If images column doesn't exist, retry without it
      const msg = String(e?.message || '');
      const looksLikeMissingImagesColumn =
        msg.includes('Unknown arg `images`') ||
        msg.includes('column "images" does not exist') ||
        msg.includes('no such column: images');

      if (!looksLikeMissingImagesColumn) throw e;

      const { images, ...withoutImages } = updateData;
      const result = await prisma.property.updateMany({
        where: { id: req.params.id, orgId: req.user.orgId },
        data: withoutImages,
      });
      if (result.count === 0) return res.status(404).json({ error: 'Property not found' });
    }

    const fresh = await prisma.property.findUnique({ where: { id: req.params.id } });
    res.json(fresh);
  } catch (err) { next(err); }
});

/** DELETE /properties/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await prisma.property.deleteMany({
      where: { id: req.params.id, orgId: req.user.orgId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ status: 'deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports._test = {
  relOrAbsString,
  imageValueSchema,
  propertySchema,
  normaliseSingleImage,
  normaliseImageList,
};
