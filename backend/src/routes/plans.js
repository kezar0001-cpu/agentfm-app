import getJwtSecret from '../utils/getJwtSecret.js';
import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { listPlans, addPlan } from '../data/memoryStore.js';

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

router.use(requireAuth);

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  description: z.string().optional(),
});

router.get('/', (req, res) => {
  res.json(listPlans(req.user.orgId));
});

router.post('/', (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const plan = addPlan(req.user.orgId, parsed.data);
  res.status(201).json(plan);
});

export default router;
