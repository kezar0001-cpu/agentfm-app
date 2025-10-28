import getJwtSecret from '../utils/getJwtSecret.js';
import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import {
  listServiceRequests,
  createServiceRequest,
  updateServiceRequest,
} from '../data/memoryStore.js';

const router = express.Router();

// Middleware to verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

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

const STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const requestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
});

const requestUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
  title: z.string().optional(),
  description: z.string().optional(),
});

router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, propertyId } = req.query;
  let requests = listServiceRequests(req.user.orgId);
  if (propertyId) {
    requests = requests.filter((request) => request.propertyId === propertyId);
  }
  if (status) {
    const normalised = String(status).toUpperCase();
    if (STATUSES.includes(normalised)) {
      requests = requests.filter((request) => request.status === normalised);
    }
  }
  res.json(requests);
});

router.post('/', validate(requestSchema), (req, res) => {
  const result = createServiceRequest(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

router.patch('/:id', validate(requestUpdateSchema), (req, res) => {
  const result = updateServiceRequest(req.user.orgId, req.params.id, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

export default router;
