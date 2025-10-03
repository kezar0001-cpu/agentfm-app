const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Schema for creating a job
const jobCreateSchema = z.object({
  propertyId: z.string(),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  scheduledFor: z.string().optional().refine((d) => d === undefined || !isNaN(Date.parse(d)), {
    message: 'scheduledFor must be a valid ISO date string'
  })
});

// Schema for updating a job
const jobUpdateSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CANCELED']).optional(),
  scheduledFor: z.string().optional().refine((d) => d === undefined || !isNaN(Date.parse(d)), {
    message: 'scheduledFor must be a valid ISO date string'
  }),
  vendorId: z.string().optional()
});

// GET /jobs - list jobs with optional filters
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, propertyId } = req.query;
    const where = { orgId: req.user.orgId };
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    const jobs = await prisma.job.findMany({
      where,
      include: { property: true, unit: true, recommendation: true }
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
      const unit = await prisma.unit.findFirst({ where: { id: req.body.unitId, propertyId: req.body.propertyId } });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
    }
    const job = await prisma.job.create({
      data: {
        orgId: req.user.orgId,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId,
        source: 'ONE_OFF',
        title: req.body.title,
        description: req.body.description,
        status: 'PLANNED',
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        vendorId: null,
        slaHours: null
      }
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
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : job.scheduledFor,
        vendorId: req.body.vendorId !== undefined ? req.body.vendorId : job.vendorId
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;