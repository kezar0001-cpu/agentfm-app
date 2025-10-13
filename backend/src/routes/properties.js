import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireRole, ROLES } from '../../middleware/roleAuth.js';

const router = Router();

// --- Middleware ---
// All property routes require at least a PROPERTY_MANAGER or ADMIN role.
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
  coverImage: z.string().url().optional().nullable(), // Accepts a URL for the cover image
});

const unitSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required'),
  address: z.string().optional(),
  bedrooms: z.number().int().positive().optional(),
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
          select: { units: true },
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

// GET /api/properties/:id - Get a specific property by ID
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

// PATCH /api/properties/:id - Update an existing property
router.patch('/:id', async (req, res) => {
  try {
    const validatedData = propertySchema.partial().parse(req.body);

    // Ensure the property exists and belongs to the user's org before updating
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: validatedData,
    });

    res.json({ success: true, property: updatedProperty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Update property error:', error);
    res.status(500).json({ success: false, message: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    await prisma.property.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
});

// POST /api/properties/:propertyId/units - Add a unit to a property
router.post('/:propertyId/units', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const validatedData = unitSchema.parse(req.body);

    // Verify the property exists and belongs to the user's org
    const property = await prisma.property.findFirst({
      where: { id: propertyId, orgId: req.user.orgId },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const unit = await prisma.unit.create({
      data: {
        ...validatedData,
        propertyId: propertyId,
      },
    });

    res.status(201).json({ success: true, unit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Create unit error:', error);
    res.status(500).json({ success: false, message: 'Failed to create unit' });
  }
});

export default router;