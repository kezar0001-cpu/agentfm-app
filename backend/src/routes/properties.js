import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireRole, ROLES } from '../middleware/roleAuth.js';

const router = Router();

// --- Middleware ---
// All property routes require at least a PROPERTY_MANAGER role
router.use(requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER));

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

const unitSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required'),
  address: z.string().optional(),
  bedrooms: z.number().int().optional(),
  status: z.string().optional().default('Vacant'),
});

// --- API Endpoints ---

// GET /api/properties - List all properties for the user's organization
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.user.orgId },
      include: {
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

// POST /api/properties - Create a new property
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
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
});

// GET /api/properties/:id - Get a specific property
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
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
    // Implementation for updating a property would go here
    res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', async (req, res) => {
    // Implementation for deleting a property would go here
    res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/properties/:propertyId/units - Create a unit for a property
router.post('/:propertyId/units', async (req, res) => {
    // Implementation for adding a unit would go here
    res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;