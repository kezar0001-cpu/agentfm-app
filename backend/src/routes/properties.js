// backend/src/routes/properties.js
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prismaClient.js';
import { redisGet, redisSet } from '../config/redisClient.js';
import { requireAuth, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import unitsRouter from './units.js';

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

const STATUS_VALUES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];

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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// GET / - List properties (PROPERTY_MANAGER sees their properties, OWNER sees owned properties)
router.get('/', async (req, res) => {
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
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is for property managers and owners only.'
      });
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
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
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
      },
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
      return res.status(access.status).json({ success: false, message: access.reason });
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
      return res.status(access.status).json({ success: false, message: access.reason });
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

    const rows = await prisma.$queryRaw`
      SELECT *
      FROM (
        SELECT
          'job'::text AS type,
          j."id"::text AS id,
          j."title" AS title,
          j."status"::text AS status,
          j."priority"::text AS priority,
          j."updatedAt" AS date,
          assign."firstName" AS assigned_first_name,
          assign."lastName" AS assigned_last_name,
          NULL::text AS requested_first_name,
          NULL::text AS requested_last_name,
          NULL::text AS unit_number
        FROM "Job" j
        LEFT JOIN "User" assign ON assign."id" = j."assignedToId"
        WHERE j."propertyId" = ${propertyId}

        UNION ALL

        SELECT
          'inspection'::text AS type,
          i."id"::text AS id,
          i."title" AS title,
          i."status"::text AS status,
          NULL::text AS priority,
          i."updatedAt" AS date,
          NULL::text AS assigned_first_name,
          NULL::text AS assigned_last_name,
          NULL::text AS requested_first_name,
          NULL::text AS requested_last_name,
          NULL::text AS unit_number
        FROM "Inspection" i
        WHERE i."propertyId" = ${propertyId}

        UNION ALL

        SELECT
          'service_request'::text AS type,
          sr."id"::text AS id,
          sr."title" AS title,
          sr."status"::text AS status,
          sr."priority"::text AS priority,
          sr."updatedAt" AS date,
          NULL::text AS assigned_first_name,
          NULL::text AS assigned_last_name,
          requester."firstName" AS requested_first_name,
          requester."lastName" AS requested_last_name,
          NULL::text AS unit_number
        FROM "ServiceRequest" sr
        LEFT JOIN "User" requester ON requester."id" = sr."requestedById"
        WHERE sr."propertyId" = ${propertyId}

        UNION ALL

        SELECT
          'unit'::text AS type,
          u."id"::text AS id,
          u."unitNumber" AS title,
          u."status"::text AS status,
          NULL::text AS priority,
          u."updatedAt" AS date,
          NULL::text AS assigned_first_name,
          NULL::text AS assigned_last_name,
          NULL::text AS requested_first_name,
          NULL::text AS requested_last_name,
          u."unitNumber" AS unit_number
        FROM "Unit" u
        WHERE u."propertyId" = ${propertyId}
      ) AS combined
      ORDER BY date DESC
      LIMIT ${limit};
    `;

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
    res.status(500).json({ success: false, message: 'Failed to fetch property activity' });
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
