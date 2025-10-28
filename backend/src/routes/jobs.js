import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { listJobs, createJob, updateJob } from '../data/memoryStore.js';

const router = express.Router();

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const jobCreateSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledDate must be a valid ISO date string',
    }),
  assignedToId: z.string().optional(),
  estimatedCost: z.number().optional(),
  notes: z.string().optional(),
});

const jobUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledDate must be a valid ISO date string',
    }),
  assignedToId: z.string().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get('/', requireAuth, (req, res) => {
  try {
    const { status, propertyId } = req.query;
    // Use orgId if available, otherwise use user's id as fallback
    const orgId = req.user.orgId || req.user.id;
    const jobs = listJobs(orgId, { status, propertyId });
    // Always return an array
    res.json(Array.isArray(jobs) ? jobs : []);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});

router.post('/', requireAuth, validate(jobCreateSchema), (req, res) => {
  try {
    // Use orgId if available, otherwise use user's id as fallback
    const orgId = req.user.orgId || req.user.id;
    const result = createJob(orgId, req.body);
    if (result instanceof Error) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: result.message });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ success: false, message: 'Failed to create job' });
  }
});

router.patch('/:id', requireAuth, validate(jobUpdateSchema), (req, res) => {
  try {
    // Use orgId if available, otherwise use user's id as fallback
    const orgId = req.user.orgId || req.user.id;
    const result = updateJob(orgId, req.params.id, req.body);
    if (result instanceof Error) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: result.message });
    }
    res.json(result);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ success: false, message: 'Failed to update job' });
  }
});

export default router;
