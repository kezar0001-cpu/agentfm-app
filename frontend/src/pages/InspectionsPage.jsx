import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { listInspections, scheduleInspection } from '../data/memoryStore.js';

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

const inspectionSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  inspector: z.string().min(1),
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'scheduledAt must be a valid ISO date string',
    }),
});

router.get('/', requireAuth, (req, res) => {
  const { propertyId, status } = req.query;
  const inspections = listInspections(req.user.orgId, { propertyId, status });
  res.json(inspections);
});

router.post('/', requireAuth, validate(inspectionSchema), (req, res) => {
  const result = scheduleInspection(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

export default router;
