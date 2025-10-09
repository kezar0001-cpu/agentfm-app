import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

// Validation schema
const maintenanceRequestSchema = z.object({
  unitId: z.string(),
  propertyId: z.string(),
  category: z.string(),
  urgency: z.string(),
  title: z.string(),
  description: z.string(),
  accessNotes: z.string().optional(),
  availabilityWindows: z.any().optional(),
  mediaUrls: z.any().optional()
});

// GET /api/maintenance - Get all maintenance requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, propertyId } = req.query;

    const where = {};
    
    // Filter by user's organization through property relationship
    if (req.user.role === 'tenant') {
      // Tenants can only see their own requests
      where.createdByUserId = req.user.id;
    } else {
      // Admins/clients see all requests for their org
      where.property = {
        orgId: req.user.orgId
      };
    }

    if (status) {
      where.status = status;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        unit: true,
        property: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' }
        },
        events: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Get maintenance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance requests'
    });
  }
});

// POST /api/maintenance - Create maintenance request
router.post('/', authenticate, async (req, res) => {
  try {
    const validatedData = maintenanceRequestSchema.parse(req.body);

    // Verify unit belongs to property and user has access
    const unit = await prisma.unit.findFirst({
      where: {
        id: validatedData.unitId,
        propertyId: validatedData.propertyId,
        property: {
          orgId: req.user.orgId
        }
      },
      include: {
        property: true
      }
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found or access denied'
      });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        ...validatedData,
        createdByUserId: req.user.id,
        status: 'SUBMITTED',
        mediaUrls: validatedData.mediaUrls || undefined,
        availabilityWindows: validatedData.availabilityWindows || undefined
      },
      include: {
        unit: true,
        property: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create event
    await prisma.requestEvent.create({
      data: {
        requestId: request.id,
        type: 'CREATED',
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email
      }
    });

    res.status(201).json({
      success: true,
      request
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Create maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create maintenance request'
    });
  }
});

// GET /api/maintenance/:id - Get specific request
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: req.params.id,
        property: {
          orgId: req.user.orgId
        }
      },
      include: {
        unit: true,
        property: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Get maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance request'
    });
  }
});

// PATCH /api/maintenance/:id - Update request status
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status, technicianId, rating } = req.body;

    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: req.params.id,
        property: {
          orgId: req.user.orgId
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (technicianId !== undefined) updateData.technicianId = technicianId;
    if (rating) updateData.rating = rating;
    if (status === 'CLOSED') updateData.closedAt = new Date();

    const updated = await prisma.maintenanceRequest.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        unit: true,
        property: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create event
    if (status) {
      await prisma.requestEvent.create({
        data: {
          requestId: updated.id,
          type: 'STATUS_CHANGED',
          actorRole: req.user.role,
          actorName: req.user.name || req.user.email,
          notes: `Status changed to ${status}`
        }
      });
    }

    res.json({
      success: true,
      request: updated
    });
  } catch (error) {
    console.error('Update maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance request'
    });
  }
});

// POST /api/maintenance/:id/messages - Add message to request
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: req.params.id,
        property: {
          orgId: req.user.orgId
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    const newMessage = await prisma.requestMessage.create({
      data: {
        requestId: req.params.id,
        authorId: req.user.id,
        authorName: req.user.name || req.user.email,
        authorRole: req.user.role,
        message,
        attachments: attachments || undefined
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message'
    });
  }
});

export default router;