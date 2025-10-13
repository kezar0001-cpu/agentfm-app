import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import jwt from 'jsonwebtoken';
import { requireRole, ROLES } from '../../middleware/roleAuth.js'; // Ensure correct path to roleAuth

const router = Router();

// --- Middleware ---

// 1. Authenticate the user and attach user object to the request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// 2. Apply authentication to all routes in this file
router.use(authenticate);

// 3. Apply role-based authorization
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));


// --- Zod Schemas ---
const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  type: z.string().optional().default('Residential'),
  status: z.string().optional().default('Active'),
  images: z.array(z.string().url()).optional().default([]), // Accept an array of image URLs
});

// --- API Endpoints ---

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.user.orgId },
      include: {
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
});

// POST /api/properties
router.post('/', async (req, res) => {
  try {
    const validatedData = propertySchema.parse(req.body);
    const property = await prisma.property.create({
      data: {
        ...validatedData,
        orgId: req.user.orgId,
      },
    });
    res.status(201).json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        units: { orderBy: { unitCode: 'asc' } },
      },
    });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, property });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

export default router;