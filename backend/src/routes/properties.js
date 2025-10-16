// backend/src/routes/properties.js
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prismaClient.js';
import { requireAuth as authMiddleware } from '../middleware/auth.js';
import { requireRole, ROLES } from '../../middleware/roleAuth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const F_MINIMAL = process.env.PROPS_MINIMAL === '1';

// --- Helpers ---
const uploadPath = path.join(process.cwd(), 'uploads');
const absoluteUploadPath = path.resolve(uploadPath);
const fsp = fs.promises;

const ensureUserOrg = async (user) => {
  if (!user) throw new Error('User context is required');

  if (user.orgId && typeof user.orgId === 'string') {
    const found = await prisma.org.findUnique({ where: { id: user.orgId }, select: { id: true } });
    if (found) return found.id;
  }

  const orgId = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { orgId: true, company: true, name: true } });
    if (fresh?.orgId) {
      const chk = await tx.org.findUnique({ where: { id: fresh.orgId }, select: { id: true } });
      if (chk) return chk.id;
    }
    const orgName = (fresh?.company?.trim() || fresh?.name?.trim() || 'New Organization');
    const org = await tx.org.create({ data: { name: orgName }, select: { id: true } });
    await tx.user.update({ where: { id: user.id }, data: { orgId: org.id } });
    return org.id;
  });

  return orgId;
};

const normalizePropertyPayload = (payload = {}) => {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === '') {
        if (k === 'status') continue;
        out[k] = null;
      } else {
        out[k] = t;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
};

const toAbsoluteUploadPath = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  if (!imagePath.startsWith('/uploads')) return null;
  const relative = imagePath.replace(/^\/+/, '');
  const resolved = path.resolve(process.cwd(), relative);
  if (!resolved.startsWith(absoluteUploadPath)) return null;
  return resolved;
};

const removeImageFiles = async (imagePaths = []) => {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) return;
  await Promise.allSettled(
    imagePaths.map(async (p) => {
      const absolutePath = toAbsoluteUploadPath(p);
      if (!absolutePath) return;
      try {
        await fsp.unlink(absolutePath);
      } catch (e) {
        if (e.code !== 'ENOENT') console.warn('unlink failed:', absolutePath, e.message);
      }
    }),
  );
};

const normaliseSingleImage = (value, { defaultToNull = false } = {}) => {
  if (value === undefined) return defaultToNull ? null : undefined;
  if (value === null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t ? t : (defaultToNull ? null : undefined);
  }
  if (value && typeof value === 'object' && typeof value.url === 'string') {
    const t = value.url.trim();
    return t ? t : (defaultToNull ? null : undefined);
  }
  return defaultToNull ? null : undefined;
};

const normaliseImageList = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return [];
  return value
    .map((it) => normaliseSingleImage(it, { defaultToNull: false }))
    .filter((s) => typeof s === 'string' && s.trim().length > 0);
};

const parseExistingImages = (value, fallback = []) => {
  if (value === undefined || value === null) return Array.isArray(fallback) ? fallback : [];
  if (Array.isArray(value)) return value.filter((s) => typeof s === 'string' && s.trim().length > 0);
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) throw new Error('existingImages must be an array');
      return parsed.filter((s) => typeof s === 'string' && s.trim().length > 0);
    } catch {
      throw new Error('Invalid existingImages payload');
    }
  }
  throw new Error('Invalid existingImages payload');
};

const dedupeImages = (images = []) => {
  const seen = new Set();
  const out = [];
  for (const img of images) {
    if (typeof img !== 'string') continue;
    const t = img.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
};

// --- Auth/Role ---
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));

// --- Multer ---
const UPLOAD_DIR = uploadPath;
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// --- Zod ---
const optionalStringField = z.preprocess((v) => {
  if (v === undefined || v === null) return v;
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? null : t;
}, z.string().min(1).nullable().optional());

const imageField = z.preprocess((v) => normaliseSingleImage(v), z.string().min(1).nullable().optional());
const imageListField = z.preprocess((v) => normaliseImageList(v), z.array(z.string().min(1)).nullable().optional());

const propertyFieldSchemas = {
  name: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1, 'Name is required')),
  address: optionalStringField,
  city: optionalStringField,
  postcode: optionalStringField,
  country: optionalStringField,
  type: optionalStringField,
  coverImage: imageField,
  images: imageListField,
  status: z.preprocess((v) => {
    if (v === undefined || v === null) return v;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t === '' ? undefined : t;
  }, z.string().optional()),
};

const propertySchema = z.object({
  ...propertyFieldSchemas,
  status: propertyFieldSchemas.status.default('Active'),
  coverImage: propertyFieldSchemas.coverImage.nullish(),
  images: propertyFieldSchemas.images.default([]),
});

const propertyUpdateSchema = z.object({
  name: propertyFieldSchemas.name.optional(),
  address: propertyFieldSchemas.address,
  city: propertyFieldSchemas.city,
  postcode: propertyFieldSchemas.postcode,
  country: propertyFieldSchemas.country,
  type: propertyFieldSchemas.type,
  status: propertyFieldSchemas.status,
  coverImage: propertyFieldSchemas.coverImage,
  images: propertyFieldSchemas.images,
});

const unitSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required'),
  address: z.string().optional(),
  bedrooms: z.preprocess((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isNaN(n) ? v : n;
    }
    return v;
  }, z.number().int().min(0).nullable()).optional(),
  status: z.string().optional(),
});

// --- Routes ---

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const orgId = await ensureUserOrg(req.user);

    const selectMinimal = {
      id: true,
      name: true,
      orgId: true,
      createdAt: true,
      updatedAt: true,
    };

    const selectFull = {
      id: true,
      name: true,
      address: true,
      city: true,
      postcode: true,
      country: true,
      type: true,
      status: true,
      images: true,     // requires text[] column in DB
      orgId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { units: true } },
    };

    const properties = await prisma.property.findMany({
      where: { orgId },
      select: F_MINIMAL ? selectMinimal : selectFull,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, properties });
  } catch (error) {
    console.error('Get properties error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
});

// POST /api/properties
router.post('/', upload.array('images', 10), async (req, res) => {
  const uploadedImagePaths = (req.files ? req.files.map((f) => `/uploads/${f.filename}`) : []);
  try {
    const orgId = await ensureUserOrg(req.user);
    const { name, address, city, postcode, country, type, status, coverImage, images } = req.body;
    const payload = normalizePropertyPayload({ name, address, city, postcode, country, type, status, coverImage, images });
    const validated = propertySchema.parse(payload);
    const { coverImage: coverImageInput, images: bodyImages, ...propertyData } = validated;

    const coverImagePath = typeof coverImageInput === 'string' ? coverImageInput : undefined;
    const bodyImageList = Array.isArray(bodyImages) ? bodyImages : [];
    const imagesToPersist = dedupeImages([ ...(coverImagePath ? [coverImagePath] : []), ...bodyImageList, ...uploadedImagePaths ]);

    const property = await prisma.property.create({
      data: { ...propertyData, images: imagesToPersist, orgId },
    });

    res.status(201).json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Create property error:', { message: error?.message, code: error?.code, meta: error?.meta });
    await removeImageFiles(uploadedImagePaths);
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const orgId = await ensureUserOrg(req.user);
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId },
      select: {
        id: true, name: true, address: true, city: true, postcode: true, country: true,
        type: true, status: true, images: true, orgId: true, createdAt: true, updatedAt: true,
        units: { orderBy: { unitCode: 'asc' } },
      },
    });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property });
  } catch (error) {
    console.error('Get property error:', { message: error?.message, code: error?.code, meta: error?.meta });
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

// PATCH /api/properties/:id
router.patch('/:id', upload.array('images', 10), async (req, res) => {
  const uploadedImagePaths = (req.files ? req.files.map((f) => `/uploads/${f.filename}`) : []);
  try {
    const { id } = req.params;
    const orgId = await ensureUserOrg(req.user);
    const existing = await prisma.property.findFirst({ where: { id, orgId } });
    if (!existing) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const { name, address, city, postcode, country, type, status, coverImage, images } = req.body;
    const payload = normalizePropertyPayload({ name, address, city, postcode, country, type, status, coverImage, images });
    const validated = propertyUpdateSchema.parse(payload);
    const { coverImage: coverImageInput, images: bodyImages, ...propertyData } = validated;

    let keepImages;
    try {
      keepImages = parseExistingImages(req.body.existingImages, existing.images);
    } catch (parseError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: parseError.message });
    }

    const bodyImageList = Array.isArray(bodyImages) ? bodyImages : [];
    let nextImages = [...keepImages, ...bodyImageList, ...uploadedImagePaths];

    const coverImagePath = typeof coverImageInput === 'string' ? coverImageInput : undefined;
    if (coverImagePath) nextImages = [coverImagePath, ...nextImages.filter((i) => i !== coverImagePath)];

    const imagesToPersist = dedupeImages(nextImages);
    const updateData = { ...propertyData, images: imagesToPersist };

    const updated = await prisma.property.update({ where: { id: existing.id }, data: updateData });

    const removedImages = (existing.images || []).filter((p) => !keepImages.includes(p));
    await removeImageFiles(removedImages);

    const property = await prisma.property.findFirst({
      where: { id: updated.id, orgId },
      select: {
        id: true, name: true, address: true, city: true, postcode: true, country: true,
        type: true, status: true, images: true, orgId: true, createdAt: true, updatedAt: true,
        units: { orderBy: { unitCode: 'asc' } },
      },
    });

    res.json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Update property error:', { message: error?.message, code: error?.code, meta: error?.meta });
    await removeImageFiles(uploadedImagePaths);
    res.status(500).json({ success: false, message: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = await ensureUserOrg(req.user);
    const property = await prisma.property.findFirst({ where: { id, orgId }, select: { id: true, images: true } });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    await prisma.property.delete({ where: { id: property.id } });
    await removeImageFiles(property.images || []);
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', { message: error?.message, code: error?.code, meta: error?.meta });
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
});

router._test = { ensureUserOrg };
export default router;
