import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';

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
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

router.use(requireAuth);

const unitSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required'),
  address: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional().nullable(),
  status: z.string().optional().default('Vacant'),
});

// GET /api/properties/:propertyId/units - Get all units for a property
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Verify property exists and user has access
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }

    // Get all units for the property
    const units = await prisma.unit.findMany({
      where: { propertyId },
      orderBy: { unitCode: 'asc' },
      include: {
        tenantLinks: {
          where: { active: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
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

// POST /api/properties/:propertyId/units - Create a new unit
router.post('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Validate input
    const parsed = unitSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ 
        success: false, 
        message: issue?.message || 'Invalid request',
        errors: parsed.error.errors
      });
    }

    // Verify property exists and user has access
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }

    // Check if unit code already exists for this property
    const existingUnit = await prisma.unit.findFirst({
      where: {
        propertyId,
        unitCode: parsed.data.unitCode
      }
    });

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: 'A unit with this code already exists for this property'
      });
    }

    // Create the unit
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitCode: parsed.data.unitCode,
        address: parsed.data.address || null,
        bedrooms: parsed.data.bedrooms || null,
        status: parsed.data.status || 'Vacant'
      },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      unit 
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create unit' 
    });
  }
});

// GET /api/properties/:propertyId/units/:id - Get a specific unit
router.get('/:id', async (req, res) => {
  try {
    const { propertyId, id } = req.params;

    const unit = await prisma.unit.findFirst({
      where: {
        id,
        propertyId,
        property: {
          orgId: req.user.orgId
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        tenantLinks: {
          where: { active: true },
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
        maintenanceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Unit not found' 
      });
    }

    res.json({ 
      success: true, 
      unit 
    });
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unit' 
    });
  }
});

// PATCH /api/properties/:propertyId/units/:id - Update a unit
router.patch('/:id', async (req, res) => {
  try {
    const { propertyId, id } = req.params;

    // Verify unit exists and user has access
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id,
        propertyId,
        property: {
          orgId: req.user.orgId
        }
      }
    });

    if (!existingUnit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Unit not found' 
      });
    }

    // Validate partial update
    const updateSchema = unitSchema.partial();
    const parsed = updateSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: parsed.error.errors
      });
    }

    // Check for duplicate unit code if it's being changed
    if (parsed.data.unitCode && parsed.data.unitCode !== existingUnit.unitCode) {
      const duplicate = await prisma.unit.findFirst({
        where: {
          propertyId,
          unitCode: parsed.data.unitCode,
          id: { not: id }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'A unit with this code already exists for this property'
        });
      }
    }

    // Update the unit
    const unit = await prisma.unit.update({
      where: { id },
      data: parsed.data,
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      unit 
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update unit' 
    });
  }
});

// DELETE /api/properties/:propertyId/units/:id - Delete a unit
router.delete('/:id', async (req, res) => {
  try {
    const { propertyId, id } = req.params;

    // Verify unit exists and user has access
    const unit = await prisma.unit.findFirst({
      where: {
        id,
        propertyId,
        property: {
          orgId: req.user.orgId
        }
      },
      include: {
        tenantLinks: true,
        maintenanceRequests: true
      }
    });

    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Unit not found' 
      });
    }

    // Check if unit has active tenants
    const activeTenants = unit.tenantLinks.filter(link => link.active);
    if (activeTenants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete unit with active tenants. Please remove tenants first.'
      });
    }

    // Check if unit has open maintenance requests
    const openRequests = unit.maintenanceRequests.filter(
      req => !['CLOSED', 'CANCELLED'].includes(req.status)
    );
    if (openRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete unit with open maintenance requests. Please close them first.'
      });
    }

    // Delete the unit (cascade will handle related records)
    await prisma.unit.delete({
      where: { id }
    });

    res.json({ 
      success: true, 
      message: 'Unit deleted successfully' 
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete unit' 
    });
  }
});

export default router;
