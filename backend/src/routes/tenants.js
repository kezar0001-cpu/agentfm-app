import { Router } from 'express';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/tenants - Get all tenants for the organization
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenants = await prisma.user.findMany({
      where: {
        orgId: req.user.orgId,
        role: 'TENANT'
      },
      include: {
        tenantProfile: true,
        tenantUnits: {
          include: {
            unit: {
              include: {
                property: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      tenants
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants'
    });
  }
});

// GET /api/tenants/:id - Get specific tenant
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenant = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
        role: 'TENANT'
      },
      include: {
        tenantProfile: true,
        tenantUnits: {
          include: {
            unit: {
              include: {
                property: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant'
    });
  }
});

export default router;