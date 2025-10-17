// backend/src/routes/properties.js
import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

import prisma from '../config/prismaClient.js';
import { requireRole, ROLES } from '../../middleware/roleAuth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------------------
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      console.error('JWT verification failed:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
      });
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error?.message);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));

// ---------------------------------------------------------------------------
// Zod helpers
// ---------------------------------------------------------------------------
const trimToNull = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const requiredString = (message) =>
  z.preprocess((value) => (typeof value === 'string' ? value.trim() : value), z.string().min(1, message));

const optionalString = () =>
  z.preprocess((value) => trimToNull(value), z.string().min(1).nullable().optional());

const optionalUrl = () =>
  z
    .preprocess((value) => trimToNull(value), z.string().url({ message: 'Must be a valid URL' }))
    .nullable()
    .optional();

const optionalInt = (opts = {}) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
    }, z.number({ invalid_type_error: 'Must be a number' }).int())
    .nullable()
    .optional()
    .refine((value) => (value == null ? true : value >= (opts.min ?? Number.MIN_SAFE_INTEGER)), {
      message: opts.minMessage || 'Value is too small',
    })
    .refine((value) => (value == null ? true : value <= (opts.max ?? Number.MAX_SAFE_INTEGER)), {
      message: opts.maxMessage || 'Value is too large',
    });

const optionalFloat = () =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }, z.number({ invalid_type_error: 'Must be a number' }))
    .nullable()
    .optional();

const STATUS_VALUES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];

const basePropertySchema = z.object({
    name: requiredString('Property name is required'),
    address: requiredString('Address is required'),
    city: requiredString('City is required'),
    state: requiredString('State is required'),
    zipCode: optionalString(),
    postcode: optionalString(),
    country: requiredString('Country is required'),
    propertyType: optionalString(),
    type: optionalString(),
    status: z
      .preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value), z.enum(STATUS_VALUES))
      .default('ACTIVE'),
    yearBuilt: optionalInt({
      min: 1800,
      minMessage: 'Year must be 1800 or later',
      max: new Date().getFullYear(),
      maxMessage: `Year cannot be later than ${new Date().getFullYear()}`,
    }),
    totalUnits: optionalInt({ min: 0, minMessage: 'Total units cannot be negative' }).default(0),
    totalArea: optionalFloat(),
    description: optionalString(),
    imageUrl: optionalUrl(),
    managerId: optionalString(),

    // Legacy aliases – accepted but converted internally
    coverImage: optionalString(),
    images: z.array(z.string()).optional(),
  });

const withAliasValidation = (schema, { requireCoreFields = true } = {}) =>
  schema.superRefine((data, ctx) => {
    if (requireCoreFields && !data.zipCode && !data.postcode) {
      ctx.addIssue({
        path: ['zipCode'],
        code: z.ZodIssueCode.custom,
        message: 'ZIP code is required',
      });
    }

    if (requireCoreFields && !data.propertyType && !data.type) {
      ctx.addIssue({
        path: ['propertyType'],
        code: z.ZodIssueCode.custom,
        message: 'Property type is required',
      });
    }
  });

const propertySchema = withAliasValidation(basePropertySchema);
const propertyUpdateSchema = withAliasValidation(basePropertySchema.partial(), { requireCoreFields: false });

const unitSchema = z.object({
  unitNumber: requiredString('Unit number is required'),
  address: optionalString(),
  bedrooms: optionalInt({ min: 0, minMessage: 'Bedrooms cannot be negative' }),
  status: optionalString(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const applyLegacyAliases = (input = {}) => {
  const data = { ...input };
  if (!data.zipCode && data.postcode) {
    data.zipCode = data.postcode;
  }
  if (!data.propertyType && data.type) {
    data.propertyType = data.type;
  }
  if (!data.imageUrl && (data.coverImage || data.images?.length)) {
    const candidates = [data.coverImage, ...(Array.isArray(data.images) ? data.images : [])];
    const firstUrl = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (firstUrl) {
      data.imageUrl = firstUrl;
    }
  }
  return data;
};

const toPublicProperty = (property) => {
  if (!property) return property;

  return {
    ...property,
    postcode: property.postcode ?? property.zipCode ?? null,
    type: property.type ?? property.propertyType ?? null,
    coverImage: property.coverImage ?? property.imageUrl ?? null,
    images: property.images ?? (property.imageUrl ? [property.imageUrl] : []),
  };
};

const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  if (user.role === ROLES.ADMIN) return { allowed: true };
  if (property.managerId === user.id) return { allowed: true };
  return { allowed: false, reason: 'Forbidden', status: 403 };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const where = req.user.role === ROLES.ADMIN ? {} : { managerId: req.user.id };

    const select = {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      postcode: true,
      country: true,
      propertyType: true,
      type: true,
      status: true,
      description: true,
      imageUrl: true,
      coverImage: true,
      images: true,
      totalUnits: true,
      totalArea: true,
      yearBuilt: true,
      managerId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { units: true } },
    };

    const properties = await prisma.property.findMany({
      where,
      select,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, properties: properties.map(toPublicProperty) });
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

router.post('/', async (req, res) => {
  try {
    const parsed = applyLegacyAliases(propertySchema.parse(req.body ?? {}));
    const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

    const managerId = req.user.role === ROLES.ADMIN && managerIdInput ? managerIdInput : req.user.id;

    const property = await prisma.property.create({
      data: {
        ...data,
        managerId,
      },
    });

    res.status(201).json({ success: true, property: toPublicProperty(property) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.flatten() });
    }

    console.error('Create property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { units: { orderBy: { unitNumber: 'asc' } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.reason });
    }

    res.json({ success: true, property: toPublicProperty(property) });
  } catch (error) {
    console.error('Get property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.reason });
    }

    const parsed = applyLegacyAliases(propertyUpdateSchema.parse(req.body ?? {}));
    const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

    const managerId = req.user.role === ROLES.ADMIN && managerIdInput ? managerIdInput : property.managerId;

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        ...data,
        managerId,
      },
    });

    res.json({ success: true, property: toPublicProperty(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.flatten() });
    }

    console.error('Update property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    res.status(500).json({ success: false, message: 'Failed to update property' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.reason });
    }

    await prisma.property.delete({ where: { id: property.id } });
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
});

router._test = {
  propertySchema,
  propertyUpdateSchema,
  unitSchema,
  applyLegacyAliases,
  toPublicProperty,
};

export default router;
