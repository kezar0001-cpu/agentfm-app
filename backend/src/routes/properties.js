import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import jwt from 'jsonwebtoken';
import { requireRole, ROLES } from '../../middleware/roleAuth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// --- Helpers ---

const uploadPath = path.join(process.cwd(), 'uploads');
const absoluteUploadPath = path.resolve(uploadPath);
const fsp = fs.promises;

const ensureUserOrg = async (user, prismaClient = prisma) => {
  if (!user) throw new Error('User context is required');

  const hasOrgId = typeof user.orgId === 'string' && user.orgId.trim().length > 0;
  if (hasOrgId) {
    const existingOrg = await prismaClient.org.findUnique({
      where: { id: user.orgId },
      select: { id: true },
    });

    if (existingOrg) {
      if (user.orgId !== existingOrg.id) {
        user.orgId = existingOrg.id;
      }
      return existingOrg.id;
    }
  }

  const orgId = await prismaClient.$transaction(async (tx) => {
    const freshUser = await tx.user.findUnique({
      where: { id: user.id },
      select: { orgId: true, company: true, name: true },
    });

    if (freshUser?.orgId) {
      const verifiedOrg = await tx.org.findUnique({
        where: { id: freshUser.orgId },
        select: { id: true },
      });

      if (verifiedOrg) {
        if (user.orgId !== verifiedOrg.id) {
          user.orgId = verifiedOrg.id;
        }
        return verifiedOrg.id;
      }
    }

    const orgName =
      (freshUser?.company && freshUser.company.trim()) ||
      (freshUser?.name && freshUser.name.trim()) ||
      'New Organization';

    const newOrg = await tx.org.create({
      data: { name: orgName },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { orgId: newOrg.id },
    });

    user.orgId = newOrg.id;
    return newOrg.id;
  });

  user.orgId = orgId;
  return orgId;
};

const normalizePropertyPayload = (payload = {}) => {
  const normalized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        if (key === 'status') return; // keep current status if the field is emptied
        normalized[key] = null;
        return;
      }
      normalized[key] = trimmed;
      return;
    }

    normalized[key] = value;
  });

  return normalized;
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
    imagePaths.map(async (imagePath) => {
      const absolutePath = toAbsoluteUploadPath(imagePath);
      if (!absolutePath) return;

      try {
        await fsp.unlink(absolutePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to remove image ${absolutePath}:`, error);
        }
      }
    }),
  );
};

const normaliseSingleImage = (value, { defaultToNull = false } = {}) => {
  if (value === undefined) {
    return defaultToNull ? null : undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return defaultToNull ? null : undefined;
    }
    return trimmed;
  }

  if (value && typeof value === 'object' && typeof value.url === 'string') {
    const trimmed = value.url.trim();
    if (!trimmed) {
      return defaultToNull ? null : undefined;
    }
    return trimmed;
  }

  return defaultToNull ? null : undefined;
};

const normaliseImageList = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normaliseSingleImage(item, { defaultToNull: false }))
    .filter((item) => typeof item === 'string' && item.trim().length > 0);
};

const parseExistingImages = (value, fallback = []) => {
  if (value === undefined || value === null) return Array.isArray(fallback) ? fallback : [];

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error('existingImages must be an array');
      }
      return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
    } catch (error) {
      throw new Error('Invalid existingImages payload');
    }
  }

  throw new Error('Invalid existingImages payload');
};

const dedupeImages = (images = []) => {
  const seen = new Set();
  const result = [];

  images.forEach((image) => {
    if (typeof image !== 'string') return;
    const trimmed = image.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });

  return result;
};

// --- Middleware ---

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
router.use(requireAuth);

// All property routes require at least a PROPERTY_MANAGER or ADMIN role.
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));

// --- Multer Configuration for Image Uploads ---
const UPLOAD_DIR = uploadPath;
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// --- Zod Schemas for Validation ---
const optionalStringField = z
  .preprocess((value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().min(1).nullable().optional());

const imageField = z.preprocess(
  (value) => normaliseSingleImage(value),
  z.string().min(1).nullable().optional(),
);

const imageListField = z.preprocess(
  (value) => normaliseImageList(value),
  z.array(z.string().min(1)).nullable().optional(),
);

const propertyFieldSchemas = {
  name: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1, 'Name is required'),
  ),
  address: optionalStringField,
  city: optionalStringField,
  postcode: optionalStringField,
  country: optionalStringField,
  type: optionalStringField,
  coverImage: imageField,
  images: imageListField,
  status: z
    .preprocess((value) => {
      if (value === undefined || value === null) return value;
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
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
  bedrooms: z
    .preprocess((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return null;
        const numeric = Number(trimmed);
        return Number.isNaN(numeric) ? value : numeric;
      }
      return value;
    }, z.number().int().min(0).nullable())
    .optional(),
  status: z.string().optional(),
});

// --- Routes ---

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const orgId = await ensureUserOrg(req.user);

    // If your schema has no maintenanceRequests relation, selecting it will 500.
    // Keep selection minimal and safe.
    const properties = await prisma.property.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        type: true,
        status: true,
        images: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { units: true }, // <-- removed maintenanceRequests
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, properties });
  } catch (error) {
    // more helpful server-side logging
    console.error('Get properties error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
    });

    // return clear JSON to FE
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch properties' });
  }
});

// POST /api/properties
router.post('/', upload.array('images', 10), async (req, res) => {
  const uploadedImagePaths = (req.files ? req.files.map((file) => `/uploads/${file.filename}`) : []);
  try {
    const orgId = await ensureUserOrg(req.user);
    const {
      name,
      address,
      city,
      postcode,
      country,
      type,
      status,
      coverImage,
      images,
    } = req.body;
    const payload = normalizePropertyPayload({
      name,
      address,
      city,
      postcode,
      country,
      type,
      status,
      coverImage,
      images,
    });
    const validatedData = propertySchema.parse(payload);
    const {
      coverImage: coverImageInput,
      images: bodyImages,
      ...propertyData
    } = validatedData;

    const coverImagePath = typeof coverImageInput === 'string' ? coverImageInput : undefined;
    const bodyImageList = Array.isArray(bodyImages) ? bodyImages : [];
    const imagesToPersist = dedupeImages([
      ...(coverImagePath ? [coverImagePath] : []),
      ...bodyImageList,
      ...uploadedImagePaths,
    ]);

    const property = await prisma.property.create({
      data: {
        ...propertyData,
        images: imagesToPersist,
        orgId,
      },
    });
    res.status(201).json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Create property error:', error);
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
        id: true,
        name: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        type: true,
        status: true,
        images: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        units: {
          orderBy: { unitCode: 'asc' },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

// PATCH /api/properties/:id - Update a property
router.patch('/:id', upload.array('images', 10), async (req, res) => {
  const uploadedImagePaths = (req.files ? req.files.map((file) => `/uploads/${file.filename}`) : []);
  try {
    const { id } = req.params;
    const orgId = await ensureUserOrg(req.user);
    const existingProperty = await prisma.property.findFirst({
      where: { id, orgId },
    });

    if (!existingProperty) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const {
      name,
      address,
      city,
      postcode,
      country,
      type,
      status,
      coverImage,
      images,
    } = req.body;
    const payload = normalizePropertyPayload({
      name,
      address,
      city,
      postcode,
      country,
      type,
      status,
      coverImage,
      images,
    });
    const validatedData = propertyUpdateSchema.parse(payload);
    const {
      coverImage: coverImageInput,
      images: bodyImages,
      ...propertyData
    } = validatedData;

    let keepImages;
    try {
      keepImages = parseExistingImages(req.body.existingImages, existingProperty.images);
    } catch (parseError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: parseError.message });
    }

    const bodyImageList = Array.isArray(bodyImages) ? bodyImages : [];
    let nextImages = [...keepImages, ...bodyImageList, ...uploadedImagePaths];

    const coverImagePath = typeof coverImageInput === 'string' ? coverImageInput : undefined;
    if (coverImagePath) {
      nextImages = [coverImagePath, ...nextImages.filter((image) => image !== coverImagePath)];
    }

    const imagesToPersist = dedupeImages(nextImages);
    const updateData = {
      ...propertyData,
      images: imagesToPersist,
    };

    const updatedPropertyRecord = await prisma.property.update({
      where: { id: existingProperty.id },
      data: updateData,
    });

    const removedImages = existingProperty.images.filter((imagePath) => !keepImages.includes(imagePath));
    await removeImageFiles(removedImages);

    const property = await prisma.property.findFirst({
      where: { id: updatedPropertyRecord.id, orgId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        type: true,
        status: true,
        images: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        units: {
          orderBy: { unitCode: 'asc' },
        },
      },
    });

    res.json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await removeImageFiles(uploadedImagePaths);
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Update property error:', error);
    await removeImageFiles(uploadedImagePaths);
    res.status(500).json({ success: false, message: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = await ensureUserOrg(req.user);
    const property = await prisma.property.findFirst({
      where: { id, orgId },
      select: { id: true, images: true },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    await prisma.property.delete({ where: { id: property.id } });
    await removeImageFiles(property.images || []);

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
});

// POST /api/properties/:propertyId/units - Create a unit for a property
router.post('/:propertyId/units', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const orgId = await ensureUserOrg(req.user);
    const property = await prisma.property.findFirst({
      where: { id: propertyId, orgId },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const parsedBody = unitSchema.parse(req.body);

    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitCode: parsedBody.unitCode,
        address: parsedBody.address || null,
        bedrooms: parsedBody.bedrooms ?? null,
        status: parsedBody.status || 'Vacant',
      },
    });

    res.status(201).json({ success: true, unit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Create unit error:', error);
    res.status(500).json({ success: false, message: 'Failed to create unit' });
  }
});

router._test = {
  propertySchema,
  normaliseSingleImage,
  normaliseImageList,
  ensureUserOrg,
};

export default router;
