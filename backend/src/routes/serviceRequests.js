const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const ACTIVE_STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS'];
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return date;
};

const requestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(parseDate(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
});

const requestUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(parseDate(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
  title: z.string().optional(),
  description: z.string().optional(),
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { status, propertyId } = req.query;
    const now = new Date();
    const where = { orgId: req.user.orgId };
    if (propertyId) where.propertyId = propertyId;
    if (status) {
      const normalised = String(status).toUpperCase();
      if (STATUSES.includes(normalised)) {
        where.status = normalised;
      }
    }

    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, label: true } },
        job: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const shaped = requests.map((request) => {
      const isActive = ACTIVE_STATUSES.includes(request.status);
      const ageDays = Number(((now - request.createdAt) / MS_IN_DAY).toFixed(1));
      const isOverdue = Boolean(isActive && request.dueAt && request.dueAt < now);
      return { ...request, ageDays, isOverdue };
    });

    res.json(shaped);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(requestSchema), async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.body.propertyId, orgId: req.user.orgId },
      select: { id: true },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    if (req.body.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: req.body.unitId, propertyId: req.body.propertyId, orgId: req.user.orgId },
        select: { id: true },
      });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
    }

    const created = await prisma.serviceRequest.create({
      data: {
        orgId: req.user.orgId,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId || null,
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || 'MEDIUM',
        dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null,
        raisedBy: req.user.email,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', validate(requestUpdateSchema), async (req, res, next) => {
  try {
    const request = await prisma.serviceRequest.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });
    if (!request) return res.status(404).json({ error: 'Service request not found' });

    const updated = await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: req.body.status || request.status,
        priority: req.body.priority || request.priority,
        dueAt: req.body.dueAt ? new Date(req.body.dueAt) : request.dueAt,
        title: req.body.title || request.title,
        description: req.body.description || request.description,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, label: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
