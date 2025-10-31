import { Router } from 'express';
import { prisma } from '../config/prismaClient.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwt.js';

const router = Router();

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
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

// GET /api/tenants - Get all tenants for the organization
router.get('/', authenticate, async (req, res) => {
  try {
    const tenants = await prisma.user.findMany({
      where: {
        orgId: req.user.orgId,
        role: 'TENANT'
      },
      include: {
        tenantProfile: true,
        tenantUnitLinks: {
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
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tenant = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
        role: 'TENANT'
      },
      include: {
        tenantProfile: true,
        tenantUnitLinks: {
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