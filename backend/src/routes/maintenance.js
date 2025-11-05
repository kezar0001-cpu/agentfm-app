import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = Router();

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'No token provided', ErrorCodes.AUTH_NO_TOKEN);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { org: true }
    });

    if (!user) {
      return sendError(res, 401, 'User not found', ErrorCodes.RES_USER_NOT_FOUND);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, 'Invalid token', ErrorCodes.AUTH_INVALID_TOKEN);
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
    return sendError(res, 500, 'Failed to fetch maintenance requests', ErrorCodes.ERR_INTERNAL_SERVER);
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
      return sendError(res, 404, 'Unit not found or access denied', ErrorCodes.RES_UNIT_NOT_FOUND);
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
      return sendError(res, 400, 'Validation error', ErrorCodes.VAL_VALIDATION_ERROR, error.errors);
    }

    console.error('Create maintenance request error:', error);
    return sendError(res, 500, 'Failed to create maintenance request', ErrorCodes.ERR_INTERNAL_SERVER);
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
      return sendError(res, 404, 'Maintenance request not found', ErrorCodes.RES_MAINTENANCE_NOT_FOUND);
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Get maintenance request error:', error);
    return sendError(res, 500, 'Failed to fetch maintenance request', ErrorCodes.ERR_INTERNAL_SERVER);
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
      return sendError(res, 404, 'Maintenance request not found', ErrorCodes.RES_MAINTENANCE_NOT_FOUND);
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
    return sendError(res, 500, 'Failed to update maintenance request', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// POST /api/maintenance/:id/messages - Add message to request
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return sendError(res, 400, 'Message is required', ErrorCodes.VAL_MISSING_FIELD);
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
      return sendError(res, 404, 'Maintenance request not found', ErrorCodes.RES_MAINTENANCE_NOT_FOUND);
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
    return sendError(res, 500, 'Failed to add message', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

export default router;