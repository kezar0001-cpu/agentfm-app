import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

import validate from '../middleware/validate.js';
import prisma from '../config/prismaClient.js';
import { ROLES, requireRole } from '../../middleware/roleAuth.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
const authenticateRequest = async (req, res, next) => {
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
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

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

router.use(authenticateRequest);

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const priorityBaseSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
);

const createPrioritySchema = priorityBaseSchema.optional().default('MEDIUM');
const optionalPrioritySchema = priorityBaseSchema.optional();

const statusSchema = z
  .preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']))
  .optional();

const optionalDateString = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }
    return value;
  }, z.string().refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' }))
  .optional();

const optionalNumber = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(num) ? num : value;
  }, z.number())
  .optional();

const jobCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  priority: createPrioritySchema,
  scheduledDate: optionalDateString,
  estimatedCost: optionalNumber,
  notes: z.string().optional().nullable(),
});

const jobUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  propertyId: z.string().min(1).optional(),
  unitId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  priority: optionalPrioritySchema,
  status: statusSchema,
  scheduledDate: optionalDateString.nullish(),
  estimatedCost: optionalNumber.nullish(),
  actualCost: optionalNumber.nullish(),
  notes: z.string().optional().nullable(),
});

const baseJobInclude = {
  property: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ensureManagerAccess = async (user, propertyId) => {
  if (!propertyId) return { allowed: true };

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    return { allowed: false, status: 404, message: 'Property not found' };
  }

  if (user.role !== ROLES.ADMIN && property.managerId !== user.id) {
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  return { allowed: true, property };
};

const ensureUnitBelongsToProperty = async (propertyId, unitId) => {
  if (!unitId) return { allowed: true };

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.propertyId !== propertyId) {
    return { allowed: false, status: 400, message: 'Unit does not belong to property' };
  }

  return { allowed: true };
};

const ensureTechnician = async (assignedToId) => {
  if (!assignedToId) return { allowed: true };

  const technician = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!technician || technician.role !== ROLES.TECHNICIAN) {
    return { allowed: false, status: 400, message: 'Invalid technician' };
  }

  return { allowed: true };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { status, priority, propertyId, unitId, assignedToId, filter } = req.query;

    const where = {};

    if (req.user.role === ROLES.PROPERTY_MANAGER) {
      where.property = { managerId: req.user.id };
    } else if (req.user.role === ROLES.TECHNICIAN) {
      where.assignedToId = req.user.id;
    } else if (propertyId) {
      where.propertyId = propertyId;
    }

    if (status) {
      where.status = status.toString().toUpperCase();
    }

    if (priority) {
      where.priority = priority.toString().toUpperCase();
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (unitId) {
      where.unitId = unitId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (filter === 'overdue') {
      where.status = { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] };
      where.scheduledDate = { lt: new Date() };
    } else if (filter === 'unassigned') {
      where.assignedToId = null;
      where.status = 'OPEN';
    } else if (filter === 'my-jobs' && req.user.role === ROLES.TECHNICIAN) {
      where.assignedToId = req.user.id;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: baseJobInclude,
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.post('/', requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER), validate(jobCreateSchema), async (req, res) => {
  try {
    const { title, description, propertyId, unitId, assignedToId, priority, scheduledDate, estimatedCost, notes } = req.body;

    const { allowed, status, message, property } = await ensureManagerAccess(req.user, propertyId);
    if (!allowed) {
      return res.status(status).json({ error: message });
    }

    const unitCheck = await ensureUnitBelongsToProperty(propertyId, unitId ?? null);
    if (!unitCheck.allowed) {
      return res.status(unitCheck.status).json({ error: unitCheck.message });
    }

    const technicianCheck = await ensureTechnician(assignedToId ?? null);
    if (!technicianCheck.allowed) {
      return res.status(technicianCheck.status).json({ error: technicianCheck.message });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        propertyId,
        unitId: unitId || null,
        assignedToId: assignedToId || null,
        priority: priority || 'MEDIUM',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost: estimatedCost ?? null,
        notes: notes ?? null,
        status: assignedToId ? 'ASSIGNED' : 'OPEN',
      },
      include: baseJobInclude,
    });

    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assigned',
          message: `You have been assigned to job: ${title}${property ? ` at ${property.name}` : ''}`,
          entityType: 'job',
          entityId: job.id,
        },
      }).catch(() => {});
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.patch('/:id', requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER), validate(jobUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (req.user.role !== ROLES.ADMIN && existingJob.property?.managerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      title,
      description,
      propertyId,
      unitId,
      assignedToId,
      priority,
      status,
      scheduledDate,
      estimatedCost,
      actualCost,
      notes,
    } = req.body;

    let targetPropertyId = propertyId || existingJob.propertyId;

    const accessCheck = await ensureManagerAccess(req.user, targetPropertyId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.message });
    }

    const unitCheck = await ensureUnitBelongsToProperty(targetPropertyId, unitId ?? existingJob.unitId);
    if (!unitCheck.allowed) {
      return res.status(unitCheck.status).json({ error: unitCheck.message });
    }

    const technicianCheck = await ensureTechnician(assignedToId ?? undefined);
    if (!technicianCheck.allowed) {
      return res.status(technicianCheck.status).json({ error: technicianCheck.message });
    }

    const data = {
      ...(title && { title }),
      ...(description && { description }),
      ...(propertyId && { propertyId }),
      ...(unitId !== undefined && { unitId: unitId || null }),
      ...(priority && { priority }),
      ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
      ...(estimatedCost !== undefined && { estimatedCost: estimatedCost ?? null }),
      ...(actualCost !== undefined && { actualCost: actualCost ?? null }),
      ...(notes !== undefined && { notes }),
    };

    if (assignedToId !== undefined) {
      data.assignedToId = assignedToId || null;
      if (assignedToId && existingJob.status === 'OPEN') {
        data.status = 'ASSIGNED';
      }
    }

    if (status) {
      data.status = status;
      if (status === 'COMPLETED' && !existingJob.completedDate) {
        data.completedDate = new Date();
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data,
      include: baseJobInclude,
    });

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

export default router;
