// backend/src/routes/properties.js
import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../config/prismaClient.js';
import { redisGet, redisSet } from '../config/redisClient.js';
import { requireAuth, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import unitsRouter from './units.js';
import { cacheMiddleware, invalidate, invalidatePattern } from '../utils/cache.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base =
      path
        .basename(file.originalname || 'image', ext)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .slice(0, 40) || 'image';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
    }
    cb(null, true);
  },
});

const propertyImagesListSelection = {
  select: {
    id: true,
    propertyId: true,
    imageUrl: true,
    caption: true,
    isPrimary: true,
    displayOrder: true,
    uploadedById: true,
    createdAt: true,
    updatedAt: true,
  },
  orderBy: [
    { displayOrder: 'asc' },
    { createdAt: 'asc' },
  ],
  take: 10,
};

const propertyListSelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  propertyType: true,
  status: true,
  description: true,
  imageUrl: true,
  totalUnits: true,
  totalArea: true,
  yearBuilt: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  propertyImages: propertyImagesListSelection,
  _count: {
    select: {
      units: true,
      jobs: true,
      inspections: true,
    },
  },
};

// All property routes require authentication
router.use(requireAuth);

// Nested units routes
router.use('/:propertyId/units', unitsRouter);

// Nested property image routes (defined later)
const propertyImagesRouter = Router({ mergeParams: true });
router.use('/:id/images', propertyImagesRouter);

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

const preprocessImageValue = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value === undefined || value === null) {
    return null;
  }
  return value;
};

const isValidImageLocation = (value) => {
  if (typeof value !== 'string') return false;
  if (!value.trim()) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith('data:')) return true;
  if (value.startsWith('/uploads/')) return true;
  return false;
};

const requiredImageLocation = () =>
  z
    .preprocess(preprocessImageValue, z.union([z.string(), z.null()]))
    .refine((value) => typeof value === 'string' && isValidImageLocation(value), {
      message: 'Image URL is required',
    })
    .transform((value) => value);

const optionalImageLocation = () =>
  z
    .preprocess(preprocessImageValue, z.union([z.string(), z.null()]))
    .refine((value) => value === null || isValidImageLocation(value), {
      message: 'Must be a valid URL or upload path',
    })
    .transform((value) => (value === null ? null : value))
    .optional();

const booleanLike = () =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
      if (['false', '0', 'no', 'off'].includes(normalised)) return false;
    }
    return value;
  }, z.boolean({ invalid_type_error: 'Must be true or false' }));

const requiredUrl = (message) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().url({ message: message || 'Must be a valid URL' })
  );

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

const propertyImagesIncludeConfig = {
  orderBy: [
    { displayOrder: 'asc' },
    { createdAt: 'asc' },
  ],
};

const PROPERTY_IMAGES_CHECK_TTL_MS = 30 * 1000;

let propertyImagesFeatureCache = null;
let propertyImagesFeatureLastCheck = 0;
let propertyImagesFeatureLogged = false;

const logPropertyImagesUnavailable = () => {
  if (!propertyImagesFeatureLogged && process.env.NODE_ENV !== 'test') {
    console.warn(
      'Property images table not found. Falling back to legacy property.imageUrl field.'
    );
    propertyImagesFeatureLogged = true;
  }
};

const isPropertyImagesMissingError = (error) => {
  if (!error) return false;
  if (error.code === 'P2021') return true;
  if (error.code === 'P2010' && error.meta?.modelName === 'PropertyImage') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('propertyimage');
};

const shouldRecheckPropertyImagesSupport = () => {
  if (propertyImagesFeatureCache === null) {
    return true;
  }

  if (propertyImagesFeatureCache === true) {
    return false;
  }

  const age = Date.now() - propertyImagesFeatureLastCheck;
  return age >= PROPERTY_IMAGES_CHECK_TTL_MS;
};

const markPropertyImagesSupported = () => {
  propertyImagesFeatureCache = true;
  propertyImagesFeatureLastCheck = Date.now();
};

const markPropertyImagesUnsupported = () => {
  if (propertyImagesFeatureCache !== false) {
    logPropertyImagesUnavailable();
  }
  propertyImagesFeatureCache = false;
  propertyImagesFeatureLastCheck = Date.now();
};

const propertyImagesFeatureAvailable = async () => {
  if (!shouldRecheckPropertyImagesSupport()) {
    return propertyImagesFeatureCache === true;
  }

  try {
    await prisma.propertyImage.findFirst({ select: { id: true } });
    markPropertyImagesSupported();
    return true;
  } catch (error) {
    if (isPropertyImagesMissingError(error)) {
      markPropertyImagesUnsupported();
      return false;
    }

    console.warn('Failed to verify property images support:', error.message);
    propertyImagesFeatureLastCheck = Date.now();
    throw error;
  }
};

const withPropertyImagesSupport = async (operation) => {
  const includeImages = await propertyImagesFeatureAvailable();

  try {
    return await operation(includeImages);
  } catch (error) {
    if (includeImages && isPropertyImagesMissingError(error)) {
      markPropertyImagesUnsupported();
      return operation(false);
    }
    throw error;
  }
};

const buildPropertyListSelect = (includeImages) => {
  if (includeImages) return propertyListSelect;
  const { propertyImages: _omit, ...rest } = propertyListSelect;
  return rest;
};

const buildPropertyImagesInclude = (includeImages) =>
  includeImages ? { propertyImages: propertyImagesIncludeConfig } : {};

const buildPropertyDetailInclude = (includeImages) => ({
  units: { orderBy: { unitNumber: 'asc' } },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  owners: {
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  ...buildPropertyImagesInclude(includeImages),
});

const basePropertySchema = z.object({
    name: requiredString('Property name is required'),
    address: requiredString('Address is required'),
    city: requiredString('City is required'),
    state: optionalString(),
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
    imageUrl: optionalImageLocation(),
    managerId: optionalString(),

    // Legacy aliases – accepted but converted internally
    coverImage: optionalString(),
    images: z.array(z.string()).optional(),
  });

const withAliasValidation = (schema, { requireCoreFields = true } = {}) =>
  schema.superRefine((data, ctx) => {
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

const propertyImageCreateSchema = z.object({
  imageUrl: requiredImageLocation(),
  caption: optionalString(),
  isPrimary: booleanLike().optional(),
});

const propertyImageUpdateSchema = z
  .object({
    caption: optionalString(),
    isPrimary: booleanLike().optional(),
  })
  .refine((data) => data.caption !== undefined || data.isPrimary !== undefined, {
    message: 'No updates provided',
  });

const propertyImageReorderSchema = z.object({
  orderedImageIds: z.array(z.string().min(1)).min(1, 'At least one image id is required'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Helper to invalidate property-related caches
const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
};

const collectPropertyCacheUserIds = (property, currentUserId) => {
  const uniqueIds = new Set();

  toArray(currentUserId).forEach((id) => {
    if (id) uniqueIds.add(id);
  });

  if (property) {
    if (property.managerId) {
      uniqueIds.add(property.managerId);
    }

    if (Array.isArray(property.owners)) {
      property.owners.forEach((ownerRecord) => {
        const ownerId = ownerRecord?.ownerId || ownerRecord?.owner?.id;
        if (ownerId) {
          uniqueIds.add(ownerId);
        }
      });
    }
  }

  return Array.from(uniqueIds);
};

const invalidatePropertyCaches = async (userIdentifiers, helpers = {}) => {
  const userIds = toArray(userIdentifiers).filter(Boolean);
  if (!userIds.length) return;

  const { invalidateFn = invalidate, invalidatePatternFn = invalidatePattern } = helpers;

  const tasks = userIds.map((userId) => {
    const propertyPattern = `cache:/api/properties*user:${userId}`;
    const cacheKeys = [
      `cache:/api/properties:user:${userId}`,
      `cache:/api/dashboard/summary:user:${userId}`,
    ];

    return Promise.all([
      invalidatePatternFn(propertyPattern),
      ...cacheKeys.map((key) => invalidateFn(key)),
    ]);
  });

  await Promise.all(tasks);
};

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

const normalizePropertyImages = (property) => {
  if (!property) return [];

  const records = Array.isArray(property.propertyImages) ? property.propertyImages : [];

  if (!records.length) {
    if (property.imageUrl) {
      return [
        {
          id: `${property.id}:primary`,
          propertyId: property.id,
          imageUrl: property.imageUrl,
          caption: null,
          isPrimary: true,
          displayOrder: 0,
          uploadedById: property.managerId ?? null,
          createdAt: property.createdAt ?? null,
          updatedAt: property.updatedAt ?? null,
        },
      ];
    }

    return [];
  }

  return records
    .slice()
    .sort((a, b) => {
      const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    })
    .map((image) => ({
      id: image.id,
      propertyId: image.propertyId,
      imageUrl: image.imageUrl,
      caption: image.caption ?? null,
      isPrimary: Boolean(image.isPrimary),
      displayOrder: image.displayOrder ?? 0,
      uploadedById: image.uploadedById ?? null,
      createdAt: image.createdAt ?? null,
      updatedAt: image.updatedAt ?? null,
    }));
};

const toPublicProperty = (property) => {
  if (!property) return property;

  const { propertyImages, ...rest } = property;

  return {
    ...rest,
    postcode: property.postcode ?? property.zipCode ?? null,
    type: property.type ?? property.propertyType ?? null,
    coverImage: property.coverImage ?? property.imageUrl ?? null,
    images: normalizePropertyImages(property),
  };
};

const ensurePropertyAccess = (property, user, options = {}) => {
  const { requireWrite = false } = options;
  
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Property managers who manage the property have full access
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true, canWrite: true };
  }
  
  // Owners who own the property have read-only access
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) {
    if (requireWrite) {
      return { allowed: false, reason: 'Owners have read-only access', status: 403 };
    }
    return { allowed: true, canWrite: false };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// GET / - List properties (PROPERTY_MANAGER sees their properties, OWNER sees owned properties)
// Cached for 5 minutes
router.get('/', cacheMiddleware({ ttl: 300 }), async (req, res) => {
  try {
    let where = {};

    // Property managers see properties they manage
    if (req.user.role === 'PROPERTY_MANAGER') {
      where = { managerId: req.user.id };
    }

    // Owners see properties they own
    if (req.user.role === 'OWNER') {
      where = {
        owners: {
          some: {
            ownerId: req.user.id,
          },
        },
      };
    }

    // Technicians and tenants should not access this route
    if (req.user.role === 'TECHNICIAN' || req.user.role === 'TENANT') {
      return sendError(
        res,
        403,
        'Access denied. This endpoint is for property managers and owners only.',
        ErrorCodes.ACC_ACCESS_DENIED
      );
    }

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const { items: properties, total } = await withPropertyImagesSupport(async (includeImages) => {
      const select = buildPropertyListSelect(includeImages);

      const [items, count] = await Promise.all([
        prisma.property.findMany({
          where,
          select,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.property.count({ where }),
      ]);

      return { items, total: count };
    });

    // Calculate page number and hasMore
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    // Return paginated response
    res.json({
      items: properties.map(toPublicProperty),
      total,
      page,
      hasMore,
    });
  } catch (error) {
    console.error('Get properties error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return sendError(res, 500, 'Failed to fetch properties', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST / - Create property (PROPERTY_MANAGER only, requires active subscription)
router.post('/', requireRole('PROPERTY_MANAGER'), requireActiveSubscription, async (req, res) => {
  try {
    const parsed = applyLegacyAliases(propertySchema.parse(req.body ?? {}));
    // Remove legacy alias fields (they've been converted to standard fields)
    // Keep the converted fields: zipCode, propertyType, imageUrl
    const { managerId: managerIdInput, postcode, type, coverImage, images: rawImages, ...data } = parsed;

    // Property managers can only create properties for themselves
    const managerId = req.user.id;

    const initialImages = Array.isArray(rawImages)
      ? rawImages
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => isValidImageLocation(value))
      : [];

    const coverImageUrl = data.imageUrl ?? initialImages[0] ?? null;

    // Ensure converted fields are included in the data
    const propertyData = {
      ...data,
      managerId,
      // Include converted fields if they exist
      ...(parsed.zipCode && { zipCode: parsed.zipCode }),
      ...(parsed.propertyType && { propertyType: parsed.propertyType }),
      ...(coverImageUrl ? { imageUrl: coverImageUrl } : {}),
    };

    const { property, propertyWithImages } = await withPropertyImagesSupport(async (includeImages) => {
      const createdProperty = await prisma.$transaction(async (tx) => {
        const newProperty = await tx.property.create({
          data: propertyData,
        });

        if (includeImages && initialImages.length) {
          const records = initialImages.map((imageUrl, index) => ({
            propertyId: newProperty.id,
            imageUrl,
            caption: null,
            isPrimary: index === 0,
            displayOrder: index,
            uploadedById: req.user.id,
          }));

          await tx.propertyImage.createMany({ data: records });
        }

        return newProperty;
      });

      if (!includeImages) {
        return { property: createdProperty, propertyWithImages: null };
      }

      const withImages = await prisma.property.findUnique({
        where: { id: createdProperty.id },
        include: buildPropertyImagesInclude(true),
      });

      return { property: createdProperty, propertyWithImages: withImages };
    });

    // Invalidate property and dashboard caches for all affected users
    const cacheUserIds = collectPropertyCacheUserIds(propertyWithImages ?? property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    const responsePayload = propertyWithImages ? toPublicProperty(propertyWithImages) : toPublicProperty(property);

    res.status(201).json({ success: true, property: responsePayload });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }

    console.error('Create property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return sendError(res, 500, 'Failed to create property', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// GET /:id - Get property by ID (with access check)
router.get('/:id', async (req, res) => {
  try {
    const property = await withPropertyImagesSupport((includeImages) =>
      prisma.property.findUnique({
        where: { id: req.params.id },
        include: buildPropertyDetailInclude(includeImages),
      })
    );

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    res.json({ success: true, property: toPublicProperty(property) });
  } catch (error) {
    console.error('Get property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return sendError(res, 500, 'Failed to fetch property', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// PATCH /:id - Update property (PROPERTY_MANAGER only, must be property manager)
router.patch('/:id', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ 
      where: { id: req.params.id },
      include: {
        owners: {
          select: { ownerId: true },
        },
      },
    });
    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const parsed = applyLegacyAliases(propertyUpdateSchema.parse(req.body ?? {}));
    // Remove legacy alias fields (they've been converted to standard fields)
    // Keep the converted fields: zipCode, propertyType, imageUrl
    const { managerId: managerIdInput, postcode, type, coverImage, images: rawImages, ...data } = parsed;

    // Property manager can only update their own properties (already checked by ensurePropertyAccess)
    const managerId = property.managerId;

    const imageUpdates = Array.isArray(rawImages)
      ? rawImages
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => isValidImageLocation(value))
      : null;

    // Ensure converted fields are included in the data
    const updateData = {
      ...data,
      managerId,
      // Include converted fields if they exist
      ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
      ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
      ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
    };

    if (imageUpdates) {
      if (imageUpdates.length > 0) {
        if (parsed.imageUrl === undefined) {
          updateData.imageUrl = imageUpdates[0];
        }
      } else if (parsed.imageUrl === undefined) {
        updateData.imageUrl = null;
      }
    }

    const { property: updatedProperty, propertyWithImages } = await withPropertyImagesSupport(async (includeImages) => {
      const result = await prisma.$transaction(async (tx) => {
        const updatedRecord = await tx.property.update({
          where: { id: property.id },
          data: updateData,
        });

        if (includeImages && imageUpdates) {
          const existingImages = await tx.propertyImage.findMany({
            where: { propertyId: property.id },
            select: { imageUrl: true, caption: true },
            orderBy: [
              { displayOrder: 'asc' },
              { createdAt: 'asc' },
            ],
          });

          const existingImagesByUrl = existingImages.reduce((map, image) => {
            if (!map.has(image.imageUrl)) {
              map.set(image.imageUrl, []);
            }
            map.get(image.imageUrl).push(image);
            return map;
          }, new Map());

          await tx.propertyImage.deleteMany({ where: { propertyId: property.id } });

          if (imageUpdates.length) {
            const records = imageUpdates.map((imageUrl, index) => ({
              propertyId: property.id,
              imageUrl,
              caption: existingImagesByUrl.get(imageUrl)?.shift()?.caption ?? null,
              isPrimary: index === 0,
              displayOrder: index,
              uploadedById: req.user.id,
            }));

            await tx.propertyImage.createMany({ data: records });
          }
        }

        return updatedRecord;
      });

      if (!includeImages) {
        return { property: result, propertyWithImages: null };
      }

      const withImages = await prisma.property.findUnique({
        where: { id: property.id },
        include: {
          owners: {
            select: { ownerId: true },
          },
          ...buildPropertyImagesInclude(true),
        },
      });

      return { property: result, propertyWithImages: withImages };
    });

    // Invalidate property and dashboard caches for all affected users
    const propertyForCache = propertyWithImages ?? { ...updatedProperty, owners: property.owners };
    const cacheUserIds = collectPropertyCacheUserIds(propertyForCache, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    const propertyForResponse = propertyWithImages ?? { ...updatedProperty, owners: property.owners };
    res.json({ success: true, property: toPublicProperty(propertyForResponse) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }

    console.error('Update property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return sendError(res, 500, 'Failed to update property', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// DELETE /:id - Delete property (PROPERTY_MANAGER only, must be property manager)
router.delete('/:id', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        owners: {
          select: { ownerId: true },
        },
      },
    });
    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    await prisma.property.delete({ where: { id: property.id } });

    // Invalidate property and dashboard caches for all affected users
    const cacheUserIds = collectPropertyCacheUserIds(property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return sendError(res, 500, 'Failed to delete property', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// ---------------------------------------------------------------------------
// Property image routes
// ---------------------------------------------------------------------------

propertyImagesRouter.use(async (req, res, next) => {
  try {
    const available = await propertyImagesFeatureAvailable();
    if (!available) {
      return sendError(
        res,
        503,
        'Property image management is not available. Please run the latest database migrations.',
        ErrorCodes.EXT_SERVICE_UNAVAILABLE
      );
    }
    return next();
  } catch (error) {
    console.error('Property image availability check failed:', error);
    return sendError(res, 500, 'Failed to process request', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

propertyImagesRouter.get('/', async (req, res) => {
  const propertyId = req.params.id;

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const images = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({ success: true, images: normalizePropertyImages({ ...property, propertyImages: images }) });
  } catch (error) {
    console.error('Get property images error:', error);
    return sendError(res, 500, 'Failed to fetch property images', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

propertyImagesRouter.post('/', requireRole('PROPERTY_MANAGER'), imageUpload.single('image'), async (req, res) => {
  const propertyId = req.params.id;

  const cleanupUploadedFile = () => {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to remove uploaded file after error:', cleanupError);
      }
    }
  };

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      cleanupUploadedFile();
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const body = { ...(req.body ?? {}) };
    if (req.file?.filename) {
      body.imageUrl = `/uploads/${req.file.filename}`;
    }

    const parsed = propertyImageCreateSchema.parse(body);

    const existingImages = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'desc' },
      take: 1,
    });

    const nextDisplayOrder = existingImages.length ? (existingImages[0].displayOrder ?? 0) + 1 : 0;
    const shouldBePrimary = parsed.isPrimary ?? existingImages.length === 0;

    const createdImage = await prisma.$transaction(async (tx) => {
      const image = await tx.propertyImage.create({
        data: {
          propertyId,
          imageUrl: parsed.imageUrl,
          caption: parsed.caption ?? null,
          isPrimary: shouldBePrimary,
          displayOrder: nextDisplayOrder,
          uploadedById: req.user.id,
        },
      });

      if (shouldBePrimary) {
        await tx.propertyImage.updateMany({
          where: {
            propertyId,
            NOT: { id: image.id },
          },
          data: { isPrimary: false },
        });
      }

      return image;
    });

    const cacheUserIds = collectPropertyCacheUserIds(property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    res.status(201).json({ success: true, image: normalizePropertyImages({ ...property, propertyImages: [createdImage] })[0] });
  } catch (error) {
    cleanupUploadedFile();

    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }

    console.error('Create property image error:', error);
    return sendError(res, 500, 'Failed to add property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

propertyImagesRouter.patch('/:imageId', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  const propertyId = req.params.id;
  const imageId = req.params.imageId;

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const parsed = propertyImageUpdateSchema.parse(req.body ?? {});

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.propertyImage.findUnique({ where: { id: imageId } });
      if (!existing || existing.propertyId !== propertyId) {
        return null;
      }

      const updateData = {};
      if (parsed.caption !== undefined) updateData.caption = parsed.caption ?? null;
      if (parsed.isPrimary !== undefined) updateData.isPrimary = parsed.isPrimary;

      const result = await tx.propertyImage.update({
        where: { id: imageId },
        data: updateData,
      });

      if (parsed.isPrimary) {
        await tx.propertyImage.updateMany({
          where: {
            propertyId,
            NOT: { id: imageId },
          },
          data: { isPrimary: false },
        });
      }

      return result;
    });

    if (!updated) {
      return sendError(res, 404, 'Property image not found', ErrorCodes.RES_PROPERTY_NOT_FOUND);
    }

    const cacheUserIds = collectPropertyCacheUserIds(property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    res.json({ success: true, image: normalizePropertyImages({ ...property, propertyImages: [updated] })[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }

    console.error('Update property image error:', error);
    return sendError(res, 500, 'Failed to update property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

propertyImagesRouter.delete('/:imageId', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  const propertyId = req.params.id;
  const imageId = req.params.imageId;

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.propertyImage.findUnique({ where: { id: imageId } });
      if (!existing || existing.propertyId !== propertyId) {
        return null;
      }

      await tx.propertyImage.delete({ where: { id: imageId } });

      if (existing.isPrimary) {
        const nextPrimary = await tx.propertyImage.findFirst({
          where: { propertyId },
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        });

        if (nextPrimary) {
          await tx.propertyImage.update({
            where: { id: nextPrimary.id },
            data: { isPrimary: true },
          });
        }
      }

      return existing;
    });

    if (!deleted) {
      return sendError(res, 404, 'Property image not found', ErrorCodes.RES_PROPERTY_NOT_FOUND);
    }

    const cacheUserIds = collectPropertyCacheUserIds(property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete property image error:', error);
    return sendError(res, 500, 'Failed to delete property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

propertyImagesRouter.post('/reorder', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  const propertyId = req.params.id;

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const parsed = propertyImageReorderSchema.parse(req.body ?? {});

    const existingImages = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const existingIds = existingImages.map((img) => img.id);
    const providedIds = parsed.orderedImageIds;

    if (existingIds.length !== providedIds.length || !providedIds.every((id) => existingIds.includes(id))) {
      return sendError(res, 400, 'Ordered image ids do not match existing images', ErrorCodes.VAL_VALIDATION_ERROR);
    }

    await prisma.$transaction(
      providedIds.map((id, index) =>
        prisma.propertyImage.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    const cacheUserIds = collectPropertyCacheUserIds(property, req.user.id);
    await invalidatePropertyCaches(cacheUserIds);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }

    console.error('Reorder property images error:', error);
    return sendError(res, 500, 'Failed to reorder property images', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// GET /:id/activity - Get recent activity for a property
router.get('/:id/activity', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ 
      where: { id: req.params.id },
      include: {
        owners: {
          select: { ownerId: true },
        },
      },
    });
    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cacheKey = `property:${req.params.id}:activity:${limit}`;

    const cached = await redisGet(cacheKey);
    if (cached) {
      try {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (parsed?.activities) {
          return res.json(parsed);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[PropertyActivity] Failed to parse cached payload:', error.message);
        }
      }
    }

    const propertyId = req.params.id;

    const rows = await prisma.propertyActivity.findMany({
      where: {
        propertyId: req.params.id,
      },
      take: limit,
      orderBy: {
        date: 'desc',
      },
    });

    const activities = rows.map((row) => {
      switch (row.type) {
        case 'job':
          return {
            type: 'job',
            id: row.id,
            title: row.title,
            description: row.assigned_first_name
              ? `Assigned to ${row.assigned_first_name} ${row.assigned_last_name}`
              : 'Job update',
            status: row.status,
            priority: row.priority,
            date: row.date,
          };
        case 'inspection':
          return {
            type: 'inspection',
            id: row.id,
            title: row.title,
            description: row.status ? `Inspection ${row.status.toLowerCase()}` : 'Inspection update',
            status: row.status,
            date: row.date,
          };
        case 'service_request':
          return {
            type: 'service_request',
            id: row.id,
            title: row.title,
            description: row.requested_first_name
              ? `Requested by ${row.requested_first_name} ${row.requested_last_name}`
              : 'Service request update',
            status: row.status,
            priority: row.priority,
            date: row.date,
          };
        case 'unit':
          return {
            type: 'unit',
            id: row.id,
            title: row.unit_number ? `Unit ${row.unit_number}` : 'Unit update',
            description: `Status: ${row.status}`,
            status: row.status,
            date: row.date,
          };
        default:
          return null;
      }
    }).filter(Boolean);

    const payload = { success: true, activities };

    await redisSet(cacheKey, payload, 300);

    res.json(payload);
  } catch (error) {
    console.error('Get property activity error:', error);
    return sendError(res, 500, 'Failed to fetch property activity', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

router._test = {
  propertySchema,
  propertyUpdateSchema,
  unitSchema,
  propertyImageCreateSchema,
  propertyImageUpdateSchema,
  propertyImageReorderSchema,
  applyLegacyAliases,
  toPublicProperty,
  normalizePropertyImages,
  STATUS_VALUES,
  invalidatePropertyCaches,
  propertyListSelect,
  collectPropertyCacheUserIds,
  propertyImagesRouter,
};

export default router;
