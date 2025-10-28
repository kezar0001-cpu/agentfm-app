import getJwtSecret from '../utils/getJwtSecret.js';
import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { listSubscriptions, createSubscription, updateSubscription } from '../data/memoryStore.js';

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

const STATUS_OPTIONS = ['active', 'pending', 'suspended', 'cancelled'];

const subscriptionSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  planId: z.string().min(1),
});

const subscriptionUpdateSchema = z.object({
  status: z.enum(STATUS_OPTIONS).optional(),
});

router.get('/', requireAuth, (req, res) => {
  res.json(listSubscriptions(req.user.orgId));
});

router.post('/', requireAuth, validate(subscriptionSchema), (req, res) => {
  const result = createSubscription(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

router.patch('/:id', requireAuth, validate(subscriptionUpdateSchema), (req, res) => {
  const result = updateSubscription(req.user.orgId, req.params.id, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

export default router;
