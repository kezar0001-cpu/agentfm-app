import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import jwt from 'jsonwebtoken';
import { requireRole, ROLES } from '../../middleware/roleAuth.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// --- Middleware ---

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
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
router.use(authenticate);

// All property routes require at least a PROPERTY_MANAGER or ADMIN role.
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));

// --- Multer Configuration for Image Uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// --- Zod Schemas for Validation ---
const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional().default('Active'),
});

// --- Routes ---

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.user.orgId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        type: true,
        status: true,
        images: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { units: true, maintenanceRequests: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, properties });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
});

// POST /api/properties
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const { name, address, city, postcode, country, type, status } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const validatedData = propertySchema.parse({ name, address, city, postcode, country, type, status });
    const property = await prisma.property.create({
      data: {
        ...validatedData,
        images,
        orgId: req.user.orgId,
      },
    });
    res.status(201).json({ success: true, property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        type: true,
        status: true,
        images: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        units: {
          orderBy: { unitCode: 'asc' },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

// PATCH /api/properties/:id - Update a property
router.patch('/:id', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/properties/:propertyId/units - Create a unit for a property
router.post('/:propertyId/units', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;