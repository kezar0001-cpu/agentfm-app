import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { listJobs, createJob, updateJob } from '../data/memoryStore.js';

const router = express.Router();

// Middleware to verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { org: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

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

export default router;
