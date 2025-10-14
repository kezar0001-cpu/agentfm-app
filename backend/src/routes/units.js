import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { findProperty, addUnit } from '../data/memoryStore.js';

const router = express.Router({ mergeParams: true });

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

router.use(requireAuth);

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z
    .coerce
    .number({ invalid_type_error: 'Area must be a number' })
    .positive('Area must be positive'),
});

router.get('/', (req, res) => {
  const property = findProperty(req.user.orgId, req.params.propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property.units || []);
});

router.post('/', (req, res) => {
  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const unit = addUnit(req.user.orgId, req.params.propertyId, parsed.data);
  if (!unit || unit instanceof Error) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.status(201).json(unit);
});

export default router;
