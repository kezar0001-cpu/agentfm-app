import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = Router({ mergeParams: true });

// All unit routes require authentication
router.use(requireAuth);

const UNIT_STATUSES = [
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'VACANT',
  'PENDING_MOVE_IN',
  'PENDING_MOVE_OUT',
];

const tenantIncludeSelection = {
  include: {
    tenant: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    },
  },
};

const tenantListArgs = {
  ...tenantIncludeSelection,
  orderBy: [
    { isActive: 'desc' },
    { createdAt: 'desc' },
  ],
};

const unitIncludeConfig = {
  property: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      managerId: true,
      owners: {
        select: {
          ownerId: true,
        },
      },
    },
  },
  tenants: tenantListArgs,
};

const unitCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z
    .preprocess((value) => (value === '' || value == null ? null : Number(value)), z.number().int().nullable())
    .optional(),
  bedrooms: z
    .preprocess((value) => (value === '' || value == null ? null : Number(value)), z.number().int().nullable())
    .optional(),
  bathrooms: z
    .preprocess((value) => (value === '' || value == null ? null : Number(value)), z.number().nullable())
    .optional(),
  area: z
    .preprocess((value) => (value === '' || value == null ? null : Number(value)), z.number().nullable())
    .optional(),
  rentAmount: z
    .preprocess((value) => (value === '' || value == null ? null : Number(value)), z.number().nullable())
    .optional(),
  status: z.enum(UNIT_STATUSES).optional().default('AVAILABLE'),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

const unitUpdateSchema = unitCreateSchema.partial().omit({ propertyId: true }).extend({
  status: z.enum(UNIT_STATUSES).optional(),
});

const tenantAssignmentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required').optional(),
  leaseStart: z.string().min(1, 'Lease start date is required'),
  leaseEnd: z.string().min(1, 'Lease end date is required'),
  rentAmount: z.number().positive('Rent amount must be greater than zero'),
  depositAmount: z.number().min(0, 'Deposit amount cannot be negative').optional(),
});

const moveInSchema = tenantAssignmentSchema.extend({
  tenantId: z.string().min(1, 'Tenant is required'),
});

const moveOutSchema = z.object({
  moveOutDate: z.string().min(1, 'Move out date is required'),
});

const toPublicTenant = (tenant) => {
  if (!tenant) return tenant;

  return {
    id: tenant.id,
    unitId: tenant.unitId,
    tenantId: tenant.tenantId,
    leaseStart: tenant.leaseStart,
    leaseEnd: tenant.leaseEnd,
    rentAmount: tenant.rentAmount,
    depositAmount: tenant.depositAmount ?? null,
    isActive: Boolean(tenant.isActive),
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    tenant: tenant.tenant
      ? {
          id: tenant.tenant.id,
          firstName: tenant.tenant.firstName,
          lastName: tenant.tenant.lastName,
          email: tenant.tenant.email,
          phone: tenant.tenant.phone,
        }
      : null,
  };
};

const toPublicUnit = (unit) => {
  if (!unit) return unit;

  const { property, tenants, ...rest } = unit;

  return {
    ...rest,
    floor: unit.floor ?? null,
    bedrooms: unit.bedrooms ?? null,
    bathrooms: unit.bathrooms ?? null,
    area: unit.area ?? null,
    rentAmount: unit.rentAmount ?? null,
    description: unit.description ?? null,
    imageUrl: unit.imageUrl ?? null,
    property: property
      ? {
          id: property.id,
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          managerId: property.managerId,
        }
      : null,
    tenants: Array.isArray(tenants) ? tenants.map(toPublicTenant) : [],
  };
};

const ensurePropertyAccess = async (propertyId, user, { requireWrite = false } = {}) => {
  if (!propertyId) {
    return { allowed: false, status: 400, reason: 'Property ID is required' };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owners: { select: { ownerId: true } } },
  });

  if (!property) {
    return { allowed: false, status: 404, reason: 'Property not found' };
  }

  if (user.role === 'ADMIN') {
    return { allowed: true, property, canWrite: true };
  }

  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true, property, canWrite: true };
  }

  if (user.role === 'OWNER' && property.owners.some((owner) => owner.ownerId === user.id)) {
    if (requireWrite) {
      return { allowed: false, status: 403, reason: 'Owners have read-only access' };
    }
    return { allowed: true, property, canWrite: false };
  }

  if (user.role === 'TENANT') {
    const hasActiveLease = await prisma.unitTenant.findFirst({
      where: {
        tenantId: user.id,
        isActive: true,
        unit: { propertyId },
      },
    });

    if (hasActiveLease) {
      return { allowed: true, property, canWrite: false };
    }
  }

  return { allowed: false, status: 403, reason: 'Access denied to this property' };
};

const ensureUnitAccess = async (unitId, user, options = {}) => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: unitIncludeConfig,
  });

  if (!unit) {
    return { allowed: false, status: 404, reason: 'Unit not found' };
  }

  const access = await ensurePropertyAccess(unit.propertyId, user, options);
  if (!access.allowed) {
    return { ...access, unit: null };
  }

  return { ...access, unit };
};

const parseLimit = (value, defaultValue = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, 1), 100);
};

const parseOffset = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId || req.params.propertyId || null;
    const statusFilter = req.query.status;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const includeTenants = (req.query.includeTenants || '').toString().toLowerCase() !== 'false';
    const includeProperty = (req.query.includeProperty || '').toString().toLowerCase() !== 'false';

    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const where = {};

    if (propertyId) {
      const access = await ensurePropertyAccess(propertyId, req.user);
      if (!access.allowed) {
        return sendError(
          res,
          access.status,
          access.reason,
          access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
        );
      }
      where.propertyId = propertyId;
    } else {
      switch (req.user.role) {
        case 'ADMIN':
          break;
        case 'PROPERTY_MANAGER':
          where.property = { managerId: req.user.id };
          break;
        case 'OWNER':
          where.property = { owners: { some: { ownerId: req.user.id } } };
          break;
        case 'TENANT':
          where.tenants = { some: { tenantId: req.user.id, isActive: true } };
          break;
        default:
          return sendError(res, 403, 'Access denied to units', ErrorCodes.ACC_ACCESS_DENIED);
      }
    }

    if (statusFilter) {
      const statuses = Array.isArray(statusFilter)
        ? statusFilter
        : statusFilter
            .toString()
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    if (search) {
      where.OR = [
        { unitNumber: { contains: search, mode: 'insensitive' } },
        { property: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const include = {};
    if (includeTenants) {
      include.tenants = tenantListArgs;
    }
    if (includeProperty || !propertyId) {
      include.property = unitIncludeConfig.property;
    }

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.unit.count({ where }),
    ]);

    const items = units.map(toPublicUnit);
    const nextOffset = offset + limit < total ? offset + limit : null;

    res.json({
      items,
      total,
      limit,
      offset,
      hasMore: Boolean(nextOffset != null),
      nextOffset,
      page: Math.floor(offset / limit) + 1,
    });
  })
);

router.get(
  '/:unitId',
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user);

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    res.json({ unit: toPublicUnit(access.unit) });
  })
);

router.post(
  '/',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = unitCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        'Validation error',
        ErrorCodes.VAL_VALIDATION_ERROR,
        parsed.error.flatten().fieldErrors,
      );
    }

    const data = parsed.data;
    const access = await ensurePropertyAccess(data.propertyId, req.user, { requireWrite: true });
    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId: data.propertyId,
        unitNumber: data.unitNumber,
        floor: data.floor ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        area: data.area ?? null,
        rentAmount: data.rentAmount ?? null,
        status: data.status ?? 'AVAILABLE',
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
      },
      include: unitIncludeConfig,
    });

    res.status(201).json({ unit: toPublicUnit(unit) });
  })
);

router.patch(
  '/:unitId',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;

    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });
    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const parsed = unitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        'Validation error',
        ErrorCodes.VAL_VALIDATION_ERROR,
        parsed.error.flatten().fieldErrors,
      );
    }

    const data = parsed.data;

    const unit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        ...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
        ...(data.floor !== undefined && { floor: data.floor ?? null }),
        ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms ?? null }),
        ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms ?? null }),
        ...(data.area !== undefined && { area: data.area ?? null }),
        ...(data.rentAmount !== undefined && { rentAmount: data.rentAmount ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl ?? null }),
      },
      include: unitIncludeConfig,
    });

    res.json({ unit: toPublicUnit(unit) });
  })
);

router.delete(
  '/:unitId',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    await prisma.unit.delete({ where: { id: unitId } });
    res.status(204).send();
  })
);

router.get(
  '/:unitId/tenants',
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user);

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const tenants = await prisma.unitTenant.findMany({
      where: { unitId },
      ...tenantListArgs,
    });

    res.json({ tenants: tenants.map(toPublicTenant) });
  })
);

router.post(
  '/:unitId/tenants',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const parsed = tenantAssignmentSchema.extend({ tenantId: z.string().min(1, 'Tenant is required') }).safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        'Validation error',
        ErrorCodes.VAL_VALIDATION_ERROR,
        parsed.error.flatten().fieldErrors,
      );
    }

    const data = parsed.data;

    const tenant = await prisma.unitTenant.create({
      data: {
        unitId,
        tenantId: data.tenantId,
        leaseStart: new Date(data.leaseStart),
        leaseEnd: new Date(data.leaseEnd),
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount ?? null,
        isActive: true,
      },
      ...tenantIncludeSelection,
    });

    await prisma.unit.update({
      where: { id: unitId },
      data: { status: 'OCCUPIED' },
    });

    res.status(201).json({ tenant: toPublicTenant(tenant) });
  })
);

router.patch(
  '/:unitId/tenants/:tenantId',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { unitId, tenantId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const parsed = tenantAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        'Validation error',
        ErrorCodes.VAL_VALIDATION_ERROR,
        parsed.error.flatten().fieldErrors,
      );
    }

    const data = parsed.data;

    const existing = await prisma.unitTenant.findFirst({
      where: { unitId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return sendError(res, 404, 'Tenant assignment not found', ErrorCodes.RES_NOT_FOUND);
    }

    const tenant = await prisma.unitTenant.update({
      where: { id: existing.id },
      data: {
        leaseStart: new Date(data.leaseStart),
        leaseEnd: new Date(data.leaseEnd),
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount ?? null,
      },
      ...tenantIncludeSelection,
    });

    res.json({ tenant: toPublicTenant(tenant) });
  })
);

router.delete(
  '/:unitId/tenants/:tenantId',
  requireRole('PROPERTY_MANAGER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { unitId, tenantId } = req.params;
    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });

    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    const existing = await prisma.unitTenant.findFirst({
      where: { unitId, tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!existing) {
      return sendError(res, 404, 'Tenant assignment not found', ErrorCodes.RES_NOT_FOUND);
    }

    await prisma.unitTenant.delete({
      where: { id: existing.id },
    });

    const remaining = await prisma.unitTenant.count({ where: { unitId, isActive: true } });
    if (remaining === 0) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { status: 'AVAILABLE' },
      });
    }

    res.status(204).send();
  })
);

// Move-in workflow endpoints
router.post(
  '/:unitId/move-in',
  requireRole('PROPERTY_MANAGER'),
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const { step, ...payload } = req.body || {};

    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });
    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    switch (step) {
      case 0: {
        const parsed = moveInSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(
            res,
            400,
            'Validation error',
            ErrorCodes.VAL_VALIDATION_ERROR,
            parsed.error.flatten().fieldErrors,
          );
        }

        const data = parsed.data;

        await prisma.unit.update({
          where: { id: unitId },
          data: { status: 'PENDING_MOVE_IN' },
        });

        await prisma.unitTenant.create({
          data: {
            unitId,
            tenantId: data.tenantId,
            leaseStart: new Date(data.leaseStart),
            leaseEnd: new Date(data.leaseEnd),
            rentAmount: data.rentAmount,
            depositAmount: data.depositAmount ?? null,
            isActive: false,
          },
        });

        return res.json({ message: 'Tenant invited and lease created' });
      }

      case 1: {
        const inspectionSchema = z.object({
          inspectionDate: z.string().min(1, 'Inspection date is required'),
        });
        const parsed = inspectionSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(
            res,
            400,
            'Validation error',
            ErrorCodes.VAL_VALIDATION_ERROR,
            parsed.error.flatten().fieldErrors,
          );
        }

        const inspectionDate = new Date(parsed.data.inspectionDate);

        await prisma.inspection.create({
          data: {
            title: `Move-in inspection for Unit ${access.unit.unitNumber}`,
            type: 'MOVE_IN',
            scheduledDate: inspectionDate,
            propertyId: access.unit.propertyId,
            unitId,
            status: 'SCHEDULED',
          },
        });

        return res.json({ message: 'Move-in inspection scheduled' });
      }

      case 4: {
        const pendingLease = await prisma.unitTenant.findFirst({
          where: { unitId, isActive: false },
          orderBy: { createdAt: 'desc' },
        });

        if (!pendingLease) {
          return sendError(res, 400, 'No pending lease found for unit', ErrorCodes.RES_NOT_FOUND);
        }

        await prisma.unitTenant.update({
          where: { id: pendingLease.id },
          data: { isActive: true },
        });

        await prisma.unit.update({
          where: { id: unitId },
          data: { status: 'OCCUPIED' },
        });

        return res.json({ message: 'Lease activated and move-in complete' });
      }

      default:
        return sendError(res, 400, 'Invalid move-in step', ErrorCodes.VAL_VALIDATION_ERROR);
    }
  })
);

router.post(
  '/:unitId/move-out',
  requireRole('PROPERTY_MANAGER'),
  asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const { step, ...payload } = req.body || {};

    const access = await ensureUnitAccess(unitId, req.user, { requireWrite: true });
    if (!access.allowed) {
      return sendError(
        res,
        access.status,
        access.reason,
        access.status === 404 ? ErrorCodes.RES_NOT_FOUND : ErrorCodes.ACC_PROPERTY_ACCESS_DENIED,
      );
    }

    switch (step) {
      case 0: {
        const parsed = moveOutSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(
            res,
            400,
            'Validation error',
            ErrorCodes.VAL_VALIDATION_ERROR,
            parsed.error.flatten().fieldErrors,
          );
        }

        await prisma.unit.update({
          where: { id: unitId },
          data: { status: 'PENDING_MOVE_OUT' },
        });

        return res.json({ message: 'Notice given' });
      }

      case 1: {
        const inspectionSchema = z.object({
          inspectionDate: z.string().min(1, 'Inspection date is required'),
        });
        const parsed = inspectionSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(
            res,
            400,
            'Validation error',
            ErrorCodes.VAL_VALIDATION_ERROR,
            parsed.error.flatten().fieldErrors,
          );
        }

        const inspectionDate = new Date(parsed.data.inspectionDate);

        await prisma.inspection.create({
          data: {
            title: `Move-out inspection for Unit ${access.unit.unitNumber}`,
            type: 'MOVE_OUT',
            scheduledDate: inspectionDate,
            propertyId: access.unit.propertyId,
            unitId,
            status: 'SCHEDULED',
          },
        });

        return res.json({ message: 'Move-out inspection scheduled' });
      }

      case 5: {
        const activeLease = await prisma.unitTenant.findFirst({
          where: { unitId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        if (activeLease) {
          await prisma.unitTenant.update({
            where: { id: activeLease.id },
            data: { isActive: false },
          });
        }

        await prisma.unit.update({
          where: { id: unitId },
          data: { status: 'AVAILABLE' },
        });

        return res.json({ message: 'Unit marked as available and move-out complete' });
      }

      default:
        return sendError(res, 400, 'Invalid move-out step', ErrorCodes.VAL_VALIDATION_ERROR);
    }
  })
);

export default router;
