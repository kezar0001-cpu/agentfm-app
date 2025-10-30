import express from 'express';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

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
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You do not have permission to view recommendations.' 
      });
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
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
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
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
    }
    
    // Access control: Only property managers and owners can approve recommendations
    const property = recommendation.report?.inspection?.property;
    if (!property) {
      return res.status(404).json({ success: false, message: 'Associated property not found' });
    }
    
    let hasAccess = false;
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      hasAccess = property.owners?.some(o => o.ownerId === req.user.id);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You do not have permission to approve this recommendation.' 
      });
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
    res.status(500).json({ success: false, message: 'Failed to approve recommendation' });
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
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
    }
    
    // Access control: Only property managers and owners can reject recommendations
    const property = recommendation.report?.inspection?.property;
    if (!property) {
      return res.status(404).json({ success: false, message: 'Associated property not found' });
    }
    
    let hasAccess = false;
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      hasAccess = property.owners?.some(o => o.ownerId === req.user.id);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You do not have permission to reject this recommendation.' 
      });
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
    res.status(500).json({ success: false, message: 'Failed to reject recommendation' });
  }
});

export default router;
