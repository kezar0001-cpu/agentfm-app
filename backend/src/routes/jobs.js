const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const JOB_STATUSES = ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const parseDateString = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return Number.NaN;
  }
  return date;
};

const jobCreateSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  serviceRequestId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  scheduledFor: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(parseDateString(value)), {
      message: 'scheduledFor must be a valid ISO date string',
    }),
  priority: z.enum(PRIORITIES).optional(),
});

const jobUpdateSchema = z.object({
  status: z.enum(JOB_STATUSES).optional(),
  scheduledFor: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(parseDateString(value)), {
      message: 'scheduledFor must be a valid ISO date string',
    }),
  vendorId: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().optional().nullable(),
});

// GET /jobs - list jobs with optional filters
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, propertyId } = req.query;
    const where = { orgId: req.user.orgId };
    if (status) {
      const normalisedStatus = String(status).toUpperCase();
      if (JOB_STATUSES.includes(normalisedStatus)) {
        where.status = normalisedStatus;
      }
    }
    if (propertyId) where.propertyId = propertyId;
    const jobs = await prisma.job.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, label: true } },
        serviceRequest: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// POST /jobs - create a one-off job
router.post('/', requireAuth, validate(jobCreateSchema), async (req, res, next) => {
  try {
    // verify property belongs to org
    const prop = await prisma.property.findFirst({ where: { id: req.body.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    // verify unit belongs to property (if provided)
    if (req.body.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: req.body.unitId, propertyId: req.body.propertyId, orgId: req.user.orgId },
      });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
    }
    if (req.body.serviceRequestId) {
      const request = await prisma.serviceRequest.findFirst({
        where: { id: req.body.serviceRequestId, orgId: req.user.orgId },
        select: { id: true },
      });
      if (!request) return res.status(404).json({ error: 'Service request not found' });
    }
    const job = await prisma.job.create({
      data: {
        orgId: req.user.orgId,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId || null,
        serviceRequestId: req.body.serviceRequestId || null,
        source: req.body.serviceRequestId ? 'SERVICE_REQUEST' : 'ONE_OFF',
        title: req.body.title,
        description: req.body.description,
        status: 'OPEN',
        priority: req.body.priority || 'MEDIUM',
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        vendorId: null,
        slaHours: null,
      },
    });
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// PATCH /jobs/:id - update a job (status, scheduledFor, vendorId)
router.patch('/:id', requireAuth, validate(jobUpdateSchema), async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    // update job
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: req.body.status || job.status,
        scheduledFor: req.body.scheduledFor
          ? new Date(req.body.scheduledFor)
          : job.scheduledFor,
        vendorId:
          req.body.vendorId !== undefined
            ? req.body.vendorId || null
            : job.vendorId,
        priority: req.body.priority || job.priority,
        assigneeId:
          req.body.assigneeId !== undefined
            ? req.body.assigneeId || null
            : job.assigneeId,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;