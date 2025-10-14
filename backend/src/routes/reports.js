import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { createReportRequest } from '../data/memoryStore.js';

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

const reportSchema = z.object({
  propertyId: z.string().min(1),
  from: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'from must be a valid ISO date',
    }),
  to: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'to must be a valid ISO date',
    }),
});

router.post('/', requireAuth, validate(reportSchema), (req, res) => {
  const result = createReportRequest(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(202).json({ reportId: result.id, message: 'Report request queued' });
});

router.get('/:id.pdf', requireAuth, (req, res) => {
  res.status(404).send('Report not generated in demo environment');
});

export default router;
