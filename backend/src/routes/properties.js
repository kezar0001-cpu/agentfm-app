import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const router = Router();

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
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

// Validation schemas
const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional().default('Active')
});

const unitSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required'),
  address: z.string().optional(),
  bedrooms: z.number().int().optional(),
  status: z.string().optional().default('Vacant')
});

// GET /api/properties - List all properties
router.get('/', authenticate, async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        orgId: req.user.orgId
      },
      include: {
        units: true,
        _count: {
          select: {
            units: true,
            maintenanceRequests: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
});

// POST /api/properties - Create property
router.post('/', authenticate, async (req, res) => {
  try {
    const validatedData = propertySchema.parse(req.body);

    const property = await prisma.property.create({
      data: {
        ...validatedData,
        orgId: req.user.orgId
      },
      include: {
        units: true
      }
    });

    res.status(201).json({
      success: true,
      property
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property'
    });
  }
});

// GET /api/properties/:id - Get specific property
router.get('/:id', authenticate, async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId
      },
      include: {
        units: {
          include: {
            tenantLinks: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        maintenanceRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        announcements: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        documents: true
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property'
    });
  }
});

// PATCH /api/properties/:id - Update property
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const validatedData = propertySchema.partial().parse(req.body);

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        units: true
      }
    });

    res.json({
      success: true,
      property: updated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property'
    });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    await prisma.property.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property'
    });
  }
});

// GET /api/properties/:propertyId/units - List units for property
router.get('/:propertyId/units', authenticate, async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const units = await prisma.unit.findMany({
      where: {
        propertyId: req.params.propertyId
      },
      include: {
        tenantLinks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        _count: {
          select: {
            maintenanceRequests: true
          }
        }
      },
      orderBy: {
        unitCode: 'asc'
      }
    });

    res.json({
      success: true,
      units
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units'
    });
  }
});

// POST /api/properties/:propertyId/units - Create unit
router.post('/:propertyId/units', authenticate, async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const validatedData = unitSchema.parse(req.body);

    const unit = await prisma.unit.create({
      data: {
        ...validatedData,
        propertyId: req.params.propertyId
      }
    });

    res.status(201).json({
      success: true,
      unit
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unit'
    });
  }
});

export default router;