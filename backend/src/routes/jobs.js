const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { listJobs, createJob, updateJob } = require('../data/memoryStore');

const router = express.Router();

const STATUSES = ['open', 'scheduled', 'in_progress', 'completed'];

const jobCreateSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  scheduledFor: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledFor must be a valid ISO date string',
    }),
});

const jobUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  scheduledFor: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledFor must be a valid ISO date string',
    }),
  assignedTo: z.string().optional().nullable(),
});

router.get('/', requireAuth, (req, res) => {
  const { status, propertyId } = req.query;
  const jobs = listJobs(req.user.orgId, { status, propertyId });
  res.json(jobs);
});

router.post('/', requireAuth, validate(jobCreateSchema), (req, res) => {
  const result = createJob(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

router.patch('/:id', requireAuth, validate(jobUpdateSchema), (req, res) => {
  const result = updateJob(req.user.orgId, req.params.id, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

module.exports = router;
