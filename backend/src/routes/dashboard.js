// src/routes/dashboard.js
const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

// Minimal dashboard metrics for the current schema (no scheduledFor yet)
router.get('/', async (req, res, next) => {
  try {
    const orgId = (req.user && req.user.orgId) || 'org1';
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [openJobsCount, completedLast30Count] = await Promise.all([
      prisma.job.count({
        where: {
          orgId,
          status: { in: ['PLANNED', 'IN_PROGRESS', 'QC'] },
        },
      }),
      prisma.job.count({
        where: {
          orgId,
          status: 'COMPLETED',
          // Use updatedAt to approximate “completed in last 30 days”
          updatedAt: { gte: last30 },
        },
      }),
    ]);

    // We don’t track due dates yet, so “overdue” is 0 for now.
    const overdueJobsCount = 0;

    // No PCI stored yet in your simplified schema — return null.
    const avgPCI = null;

    res.json({
      openJobs: openJobsCount,
      overdueJobs: overdueJobsCount,
      completedLast30: completedLast30Count,
      avgPCI,
      currency: 'AED',
      vatPercent: 5,
      timezone: 'Asia/Dubai',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
