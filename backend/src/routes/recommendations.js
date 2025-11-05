import express from 'express';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = express.Router();


router.get('/', requireAuth, async (req, res) => {
  try {
    const { reportId, status } = req.query;
    
    const where = {};
    if (reportId) where.reportId = reportId;
    if (status) where.status = status;
    
    // Add role-based access control
    // Recommendations are tied to inspection reports, which are tied to properties
    if (req.user.role === 'PROPERTY_MANAGER') {
      // Property managers see recommendations for their properties
      where.report = {
        inspection: {
          property: {
            managerId: req.user.id,
          },
        },
      };
    } else if (req.user.role === 'OWNER') {
      // Owners see recommendations for properties they own
      where.report = {
        inspection: {
          property: {
            owners: {
              some: {
                ownerId: req.user.id,
              },
            },
          },
        },
      };
    } else if (req.user.role === 'TECHNICIAN') {
      // Technicians see recommendations for inspections assigned to them
      where.report = {
        inspection: {
          assignedToId: req.user.id,
        },
      };
    } else {
      // Tenants and other roles have no access to recommendations
      return sendError(res, 403, 'Access denied. You do not have permission to view recommendations.', ErrorCodes.ACC_ACCESS_DENIED);
    }
    
    const recommendations = await prisma.recommendation.findMany({
      where,
      include: {
        report: {
          select: {
            id: true,
            title: true,
            inspectionId: true,
            inspection: {
              select: {
                id: true,
                title: true,
                propertyId: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return sendError(res, 500, 'Failed to fetch recommendations', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        report: {
          include: {
            inspection: {
              include: {
                property: {
                  include: {
                    owners: {
                      select: { ownerId: true },
                    },
                    manager: {
                      select: {
                        id: true,
                        subscriptionStatus: true,
                        trialEndDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!recommendation) {
      return sendError(res, 404, 'Recommendation not found', ErrorCodes.RES_NOT_FOUND);
    }

    // Access control: Only property managers and owners can approve recommendations
    const property = recommendation.report?.inspection?.property;
    if (!property) {
      return sendError(res, 404, 'Associated property not found', ErrorCodes.RES_PROPERTY_NOT_FOUND);
    }

    let hasAccess = false;
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      hasAccess = property.owners?.some(o => o.ownerId === req.user.id);
    }

    if (!hasAccess) {
      return sendError(res, 403, 'Access denied. You do not have permission to approve this recommendation.', ErrorCodes.ACC_ACCESS_DENIED);
    }

    // Check property manager's subscription
    const manager = property.manager;
    const isManagerSubscriptionActive =
      manager.subscriptionStatus === 'ACTIVE' ||
      (manager.subscriptionStatus === 'TRIAL' && manager.trialEndDate && new Date(manager.trialEndDate) > new Date());

    if (!isManagerSubscriptionActive) {
      const message = req.user.role === 'PROPERTY_MANAGER'
        ? 'Your trial period has expired. Please upgrade your plan to continue.'
        : 'This property\'s subscription has expired. Please contact your property manager.';
      return sendError(res, 403, message, ErrorCodes.SUB_MANAGER_SUBSCRIPTION_REQUIRED);
    }
    
    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        report: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error approving recommendation:', error);
    return sendError(res, 500, 'Failed to approve recommendation', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        report: {
          include: {
            inspection: {
              include: {
                property: {
                  include: {
                    owners: {
                      select: { ownerId: true },
                    },
                    manager: {
                      select: {
                        id: true,
                        subscriptionStatus: true,
                        trialEndDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!recommendation) {
      return sendError(res, 404, 'Recommendation not found', ErrorCodes.RES_NOT_FOUND);
    }

    // Access control: Only property managers and owners can reject recommendations
    const property = recommendation.report?.inspection?.property;
    if (!property) {
      return sendError(res, 404, 'Associated property not found', ErrorCodes.RES_PROPERTY_NOT_FOUND);
    }

    let hasAccess = false;
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      hasAccess = property.owners?.some(o => o.ownerId === req.user.id);
    }

    if (!hasAccess) {
      return sendError(res, 403, 'Access denied. You do not have permission to reject this recommendation.', ErrorCodes.ACC_ACCESS_DENIED);
    }

    // Check property manager's subscription
    const manager = property.manager;
    const isManagerSubscriptionActive =
      manager.subscriptionStatus === 'ACTIVE' ||
      (manager.subscriptionStatus === 'TRIAL' && manager.trialEndDate && new Date(manager.trialEndDate) > new Date());

    if (!isManagerSubscriptionActive) {
      const message = req.user.role === 'PROPERTY_MANAGER'
        ? 'Your trial period has expired. Please upgrade your plan to continue.'
        : 'This property\'s subscription has expired. Please contact your property manager.';
      return sendError(res, 403, message, ErrorCodes.SUB_MANAGER_SUBSCRIPTION_REQUIRED);
    }
    
    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason || null,
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting recommendation:', error);
    return sendError(res, 500, 'Failed to reject recommendation', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

export default router;
