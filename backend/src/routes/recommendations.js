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
    
    const recommendations = await prisma.recommendation.findMany({
      where,
      include: {
        report: {
          select: {
            id: true,
            title: true,
            inspectionId: true,
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
    });
    
    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
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
    });
    
    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
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
