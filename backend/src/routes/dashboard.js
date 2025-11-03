import express from 'express';
import { getDashboardSummary, getRecentActivity } from '../../controllers/dashboardController.js';
import { requireAuth, requireActiveSubscription } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import prisma from '../config/prismaClient.js';
import { cacheMiddleware } from '../utils/cache.js';

const router = express.Router();

/**
 * All routes below are protected by JWT authentication.
 * The requireAuth middleware verifies the token,
 * attaches the user to req.user, and proceeds if valid.
 */
router.use(requireAuth);

// GET /api/dashboard/summary - Returns dashboard summary data (cached for 5 minutes)
router.get('/summary', cacheMiddleware({ ttl: 300 }), asyncHandler(async (req, res) => {
  const data = await getDashboardSummary(req, res);
  return data;
}));

// GET /api/dashboard/activity - Returns recent activity data
router.get('/activity', asyncHandler(async (req, res) => {
  const data = await getRecentActivity(req, res);
  return data;
}));

// GET /api/dashboard/analytics - Returns detailed analytics
router.get('/analytics', requireActiveSubscription, asyncHandler(async (req, res) => {
  const { startDate, endDate, propertyId } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);
  
  // Build property filter based on user role
  let propertyFilter = {};
  if (req.user.role === 'PROPERTY_MANAGER') {
    const properties = await prisma.property.findMany({
      where: { managerId: req.user.id },
      select: { id: true }
    });
    propertyFilter = { propertyId: { in: properties.map(p => p.id) } };
  } else if (req.user.role === 'OWNER') {
    const ownerships = await prisma.propertyOwner.findMany({
      where: { ownerId: req.user.id },
      select: { propertyId: true }
    });
    propertyFilter = { propertyId: { in: ownerships.map(o => o.propertyId) } };
  }
  
  // If specific property requested, add to filter
  if (propertyId) {
    propertyFilter.propertyId = propertyId;
  }
  
  // Calculate job completion rate
  const totalJobs = await prisma.job.count({
    where: {
      ...propertyFilter,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    }
  });
  
  const completedJobs = await prisma.job.count({
    where: {
      ...propertyFilter,
      status: 'COMPLETED',
      ...(Object.keys(dateFilter).length > 0 && { completedDate: dateFilter })
    }
  });
  
  const jobCompletionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  
  // Calculate average response time (time from job creation to assignment)
  const assignedJobs = await prisma.job.findMany({
    where: {
      ...propertyFilter,
      assignedToId: { not: null },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    select: {
      createdAt: true,
      updatedAt: true,
    }
  });
  
  const avgResponseTime = assignedJobs.length > 0
    ? assignedJobs.reduce((sum, job) => {
        const diff = new Date(job.updatedAt) - new Date(job.createdAt);
        return sum + diff;
      }, 0) / assignedJobs.length / (1000 * 60 * 60) // Convert to hours
    : 0;
  
  // Calculate cost trends
  const jobsWithCost = await prisma.job.findMany({
    where: {
      ...propertyFilter,
      actualCost: { not: null },
      ...(Object.keys(dateFilter).length > 0 && { completedDate: dateFilter })
    },
    select: {
      actualCost: true,
      completedDate: true,
    },
    orderBy: { completedDate: 'asc' }
  });
  
  const totalCost = jobsWithCost.reduce((sum, job) => sum + (job.actualCost || 0), 0);
  const avgCost = jobsWithCost.length > 0 ? totalCost / jobsWithCost.length : 0;
  
  // Top issues by category
  const serviceRequests = await prisma.serviceRequest.groupBy({
    by: ['category'],
    where: {
      ...propertyFilter,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    _count: {
      category: true
    },
    orderBy: {
      _count: {
        category: 'desc'
      }
    },
    take: 5
  });
  
  const topIssues = serviceRequests.map(sr => ({
    category: sr.category,
    count: sr._count.category
  }));
  
  // Job status distribution
  const jobsByStatus = await prisma.job.groupBy({
    by: ['status'],
    where: {
      ...propertyFilter,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    _count: {
      status: true
    }
  });
  
  const statusDistribution = jobsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});
  
  const analytics = {
    jobCompletionRate: Math.round(jobCompletionRate * 10) / 10,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10, // hours
    totalCost,
    avgCost: Math.round(avgCost * 100) / 100,
    costTrends: jobsWithCost.map(job => ({
      date: job.completedDate,
      cost: job.actualCost
    })),
    topIssues,
    statusDistribution,
    totalJobs,
    completedJobs,
  };
  
  res.json({ success: true, data: analytics });
}));

export default router;