// backend/src/routes/properties.js
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prismaClient.js';
import { redisGet, redisSet } from '../config/redisClient.js';
import { requireAuth, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import unitsRouter from './units.js';
import { cacheMiddleware, invalidate } from '../utils/cache.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = Router();

// All property routes require authentication
router.use(requireAuth);

// Nested units routes
router.use('/:id/units', unitsRouter);

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

const STATUS_VALUES = ['ACTIVE', 'INACTIVE', 'FOR_SALE', 'FOR_RENT', 'UNDER_CONTRACT', 'SOLD', 'RENTED', 'UNDER_RENOVATION', 'UNDER_MAINTENANCE'];

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
    imageUrl: optionalUrl(),
    managerId: optionalString(),

    // Enhanced property details
    lotSize: optionalFloat(),
    buildingSize: optionalFloat(),
    numberOfFloors: optionalInt({ min: 0 }),
    constructionType: optionalString(),
    heatingSystem: optionalString(),
    coolingSystem: optionalString(),

    // Amenities (stored as JSON object)
    amenities: z.any().optional().nullable(),

    // Financial information (PM/Owner access only)
    purchasePrice: optionalFloat(),
    purchaseDate: z.preprocess((value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }, z.date().nullable().optional()),
    currentMarketValue: optionalFloat(),
    annualPropertyTax: optionalFloat(),
    annualInsurance: optionalFloat(),
    monthlyHOA: optionalFloat(),

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Helper to invalidate property-related caches
const invalidatePropertyCaches = async (userId) => {
  const cacheKeys = [
    `cache:/api/properties:user:${userId}`,
    `cache:/api/dashboard/summary:user:${userId}`,
  ];

  await Promise.all(cacheKeys.map(key => invalidate(key)));
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

// Helper function to check document access based on role and access level
const canAccessDocument = (document, user, property) => {
  if (document.accessLevel === 'PUBLIC') return true;
  if (document.accessLevel === 'PROPERTY_MANAGER' && user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) return true;
  if (document.accessLevel === 'OWNER' && (user.role === 'OWNER' || user.role === 'PROPERTY_MANAGER') && (property.managerId === user.id || property.owners?.some(o => o.ownerId === user.id))) return true;
  if (document.accessLevel === 'TENANT' && user.role === 'TENANT') return true;
  return false;
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

    const select = {
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
      _count: { select: { units: true } },
    };

    // Fetch properties and total count in parallel
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

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
    const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

    // Property managers can only create properties for themselves
    const managerId = req.user.id;

    // Ensure converted fields are included in the data
    const propertyData = {
      ...data,
      managerId,
      // Include converted fields if they exist
      ...(parsed.zipCode && { zipCode: parsed.zipCode }),
      ...(parsed.propertyType && { propertyType: parsed.propertyType }),
      ...(parsed.imageUrl && { imageUrl: parsed.imageUrl }),
    };

    const property = await prisma.property.create({
      data: propertyData,
    });

    // Invalidate property and dashboard caches
    await invalidatePropertyCaches(req.user.id);

    res.status(201).json({ success: true, property: toPublicProperty(property) });
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
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
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
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    // Filter documents based on access level
    if (property.documents) {
      property.documents = property.documents.filter(doc => canAccessDocument(doc, req.user, property));
    }

    // Filter notes based on role (owners can only see non-private notes unless they created them)
    if (property.notes && req.user.role === 'OWNER') {
      property.notes = property.notes.filter(note => !note.isPrivate || note.userId === req.user.id);
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
    const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

    // Property manager can only update their own properties (already checked by ensurePropertyAccess)
    const managerId = property.managerId;

    // Ensure converted fields are included in the data
    const updateData = {
      ...data,
      managerId,
      // Include converted fields if they exist
      ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
      ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
      ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
    };

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: updateData,
    });

    // Invalidate property and dashboard caches
    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, property: toPublicProperty(updated) });
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

    // Invalidate property and dashboard caches
    await invalidatePropertyCaches(req.user.id);

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

// ---------------------------------------------------------------------------
// Property Images Routes
// ---------------------------------------------------------------------------

// GET /:id/images - List all images for a property
router.get('/:id/images', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const images = await prisma.propertyImage.findMany({
      where: { propertyId: req.params.id },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ success: true, images });
  } catch (error) {
    console.error('Get property images error:', error);
    return sendError(res, 500, 'Failed to fetch property images', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST /:id/images - Upload/add images to a property (PROPERTY_MANAGER only)
router.post('/:id/images', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const imageSchema = z.object({
      imageUrl: z.string().url('Must be a valid URL'),
      caption: z.string().optional().nullable(),
      isPrimary: z.boolean().optional().default(false),
    });

    const { imageUrl, caption, isPrimary } = imageSchema.parse(req.body);

    // If setting as primary, unset all other primary images first
    if (isPrimary) {
      await prisma.propertyImage.updateMany({
        where: { propertyId: req.params.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Get the current max displayOrder
    const maxOrder = await prisma.propertyImage.aggregate({
      where: { propertyId: req.params.id },
      _max: { displayOrder: true },
    });

    const image = await prisma.propertyImage.create({
      data: {
        propertyId: req.params.id,
        imageUrl,
        caption,
        isPrimary,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        uploadedBy: req.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await invalidatePropertyCaches(req.user.id);

    res.status(201).json({ success: true, image });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Create property image error:', error);
    return sendError(res, 500, 'Failed to add property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// PATCH /:id/images/:imageId - Update image details
router.patch('/:id/images/:imageId', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const imageUpdateSchema = z.object({
      caption: z.string().optional().nullable(),
      isPrimary: z.boolean().optional(),
      displayOrder: z.number().int().min(0).optional(),
    });

    const updates = imageUpdateSchema.parse(req.body);

    // If setting as primary, unset all other primary images first
    if (updates.isPrimary) {
      await prisma.propertyImage.updateMany({
        where: { propertyId: req.params.id, isPrimary: true, id: { not: req.params.imageId } },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.propertyImage.update({
      where: { id: req.params.imageId, propertyId: req.params.id },
      data: updates,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, image });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Update property image error:', error);
    return sendError(res, 500, 'Failed to update property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// DELETE /:id/images/:imageId - Delete an image
router.delete('/:id/images/:imageId', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    await prisma.propertyImage.delete({
      where: { id: req.params.imageId, propertyId: req.params.id },
    });

    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete property image error:', error);
    return sendError(res, 500, 'Failed to delete property image', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST /:id/images/reorder - Reorder images
router.post('/:id/images/reorder', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const reorderSchema = z.object({
      imageIds: z.array(z.string()),
    });

    const { imageIds } = reorderSchema.parse(req.body);

    // Update display order for each image
    const updates = imageIds.map((imageId, index) =>
      prisma.propertyImage.update({
        where: { id: imageId, propertyId: req.params.id },
        data: { displayOrder: index },
      })
    );

    await prisma.$transaction(updates);
    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, message: 'Images reordered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Reorder property images error:', error);
    return sendError(res, 500, 'Failed to reorder property images', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// ---------------------------------------------------------------------------
// Property Documents Routes
// ---------------------------------------------------------------------------

// GET /:id/documents - List property documents (filtered by access level)
router.get('/:id/documents', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const documents = await prisma.propertyDocument.findMany({
      where: { propertyId: req.params.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter based on access level
    const accessibleDocs = documents.filter(doc => canAccessDocument(doc, req.user, property));

    res.json({ success: true, documents: accessibleDocs });
  } catch (error) {
    console.error('Get property documents error:', error);
    return sendError(res, 500, 'Failed to fetch property documents', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST /:id/documents - Upload a document (PROPERTY_MANAGER only)
router.post('/:id/documents', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const documentSchema = z.object({
      fileName: z.string().min(1, 'File name is required'),
      fileUrl: z.string().url('Must be a valid URL'),
      fileSize: z.number().int().min(0),
      mimeType: z.string().min(1),
      category: z.enum(['LEASE', 'INSURANCE', 'CERTIFICATE', 'INSPECTION', 'TAX_DOCUMENT', 'WARRANTY', 'MAINTENANCE', 'DEED', 'MORTGAGE', 'APPRAISAL', 'OTHER']),
      description: z.string().optional().nullable(),
      accessLevel: z.enum(['PUBLIC', 'TENANT', 'OWNER', 'PROPERTY_MANAGER']).default('PROPERTY_MANAGER'),
    });

    const data = documentSchema.parse(req.body);

    const document = await prisma.propertyDocument.create({
      data: {
        ...data,
        propertyId: req.params.id,
        uploadedBy: req.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await invalidatePropertyCaches(req.user.id);

    res.status(201).json({ success: true, document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Create property document error:', error);
    return sendError(res, 500, 'Failed to add property document', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// GET /:id/documents/:docId - Get document details (with access check)
router.get('/:id/documents/:docId', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const document = await prisma.propertyDocument.findUnique({
      where: { id: req.params.docId, propertyId: req.params.id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return sendError(res, 404, 'Document not found', ErrorCodes.RES_RESOURCE_NOT_FOUND);
    }

    if (!canAccessDocument(document, req.user, property)) {
      return sendError(res, 403, 'Access denied to this document', ErrorCodes.ACC_ACCESS_DENIED);
    }

    res.json({ success: true, document });
  } catch (error) {
    console.error('Get property document error:', error);
    return sendError(res, 500, 'Failed to fetch property document', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// DELETE /:id/documents/:docId - Delete a document (PROPERTY_MANAGER only)
router.delete('/:id/documents/:docId', requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user, { requireWrite: true });
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    await prisma.propertyDocument.delete({
      where: { id: req.params.docId, propertyId: req.params.id },
    });

    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete property document error:', error);
    return sendError(res, 500, 'Failed to delete property document', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// ---------------------------------------------------------------------------
// Property Notes Routes
// ---------------------------------------------------------------------------

// GET /:id/notes - List property notes (PM and Owners only)
router.get('/:id/notes', requireRole('PROPERTY_MANAGER', 'OWNER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const notes = await prisma.propertyNote.findMany({
      where: {
        propertyId: req.params.id,
        // Owners can only see non-private notes unless they created them
        ...(req.user.role === 'OWNER' && {
          OR: [
            { isPrivate: false },
            { userId: req.user.id },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Get property notes error:', error);
    return sendError(res, 500, 'Failed to fetch property notes', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST /:id/notes - Create a property note (PM and Owners only)
router.post('/:id/notes', requireRole('PROPERTY_MANAGER', 'OWNER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const noteSchema = z.object({
      content: z.string().min(1, 'Note content is required'),
      isPrivate: z.boolean().default(false),
    });

    const { content, isPrivate } = noteSchema.parse(req.body);

    // Only property managers can create private notes
    const actualIsPrivate = req.user.role === 'PROPERTY_MANAGER' ? isPrivate : false;

    const note = await prisma.propertyNote.create({
      data: {
        propertyId: req.params.id,
        userId: req.user.id,
        content,
        isPrivate: actualIsPrivate,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    await invalidatePropertyCaches(req.user.id);

    res.status(201).json({ success: true, note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Create property note error:', error);
    return sendError(res, 500, 'Failed to create property note', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// PATCH /:id/notes/:noteId - Update a note (author only)
router.patch('/:id/notes/:noteId', requireRole('PROPERTY_MANAGER', 'OWNER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const existingNote = await prisma.propertyNote.findUnique({
      where: { id: req.params.noteId },
    });

    if (!existingNote || existingNote.propertyId !== req.params.id) {
      return sendError(res, 404, 'Note not found', ErrorCodes.RES_RESOURCE_NOT_FOUND);
    }

    if (existingNote.userId !== req.user.id) {
      return sendError(res, 403, 'You can only edit your own notes', ErrorCodes.ACC_ACCESS_DENIED);
    }

    const noteUpdateSchema = z.object({
      content: z.string().min(1).optional(),
      isPrivate: z.boolean().optional(),
    });

    const updates = noteUpdateSchema.parse(req.body);

    // Only property managers can update isPrivate
    if (updates.isPrivate !== undefined && req.user.role !== 'PROPERTY_MANAGER') {
      delete updates.isPrivate;
    }

    const note = await prisma.propertyNote.update({
      where: { id: req.params.noteId },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.flatten());
    }
    console.error('Update property note error:', error);
    return sendError(res, 500, 'Failed to update property note', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// DELETE /:id/notes/:noteId - Delete a note (author only)
router.delete('/:id/notes/:noteId', requireRole('PROPERTY_MANAGER', 'OWNER'), async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { owners: { select: { ownerId: true } } },
    });

    const access = ensurePropertyAccess(property, req.user);
    if (!access.allowed) {
      const errorCode = access.status === 404 ? ErrorCodes.RES_PROPERTY_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED;
      return sendError(res, access.status, access.reason, errorCode);
    }

    const existingNote = await prisma.propertyNote.findUnique({
      where: { id: req.params.noteId },
    });

    if (!existingNote || existingNote.propertyId !== req.params.id) {
      return sendError(res, 404, 'Note not found', ErrorCodes.RES_RESOURCE_NOT_FOUND);
    }

    if (existingNote.userId !== req.user.id) {
      return sendError(res, 403, 'You can only delete your own notes', ErrorCodes.ACC_ACCESS_DENIED);
    }

    await prisma.propertyNote.delete({
      where: { id: req.params.noteId },
    });

    await invalidatePropertyCaches(req.user.id);

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete property note error:', error);
    return sendError(res, 500, 'Failed to delete property note', ErrorCodes.ERR_INTERNAL_SERVER);
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
