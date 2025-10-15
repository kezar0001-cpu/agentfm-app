const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// DASHBOARD CONTROLLER
// ============================================

/**
 * Get dashboard summary with role-based filtering
 * Returns aggregated stats for properties, units, jobs, inspections, etc.
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let summary = {
      properties: {
        total: 0,
        active: 0,
        inactive: 0,
        underMaintenance: 0,
      },
      units: {
        total: 0,
        occupied: 0,
        available: 0,
        maintenance: 0,
      },
      jobs: {
        total: 0,
        open: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      },
      inspections: {
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        upcoming: 0, // Next 7 days
      },
      serviceRequests: {
        total: 0,
        submitted: 0,
        underReview: 0,
        approved: 0,
      },
      alerts: [],
    };

    // Build filters based on role
    let propertyFilter = {};
    let unitFilter = {};
    let jobFilter = {};
    let inspectionFilter = {};
    let serviceRequestFilter = {};

    if (role === 'PROPERTY_MANAGER') {
      propertyFilter = { managerId: userId };
    } else if (role === 'OWNER') {
      propertyFilter = {
        owners: {
          some: { ownerId: userId },
        },
      };
    } else if (role === 'TENANT') {
      const tenantUnits = await prisma.unitTenant.findMany({
        where: { tenantId: userId, isActive: true },
        select: { unit: { select: { propertyId: true } } },
      });
      const propertyIds = [...new Set(tenantUnits.map(ut => ut.unit.propertyId))];
      propertyFilter = { id: { in: propertyIds } };
    } else if (role === 'TECHNICIAN') {
      jobFilter = { assignedToId: userId };
      inspectionFilter = { assignedToId: userId };
    }

    // Fetch Properties Stats
    if (role !== 'TECHNICIAN') {
      const properties = await prisma.property.groupBy({
        by: ['status'],
        where: propertyFilter,
        _count: true,
      });

      summary.properties.total = properties.reduce((sum, p) => sum + p._count, 0);
      properties.forEach((p) => {
        if (p.status === 'ACTIVE') summary.properties.active = p._count;
        else if (p.status === 'INACTIVE') summary.properties.inactive = p._count;
        else if (p.status === 'UNDER_MAINTENANCE') summary.properties.underMaintenance = p._count;
      });
    }

    // Fetch Units Stats
    if (role !== 'TECHNICIAN') {
      const propertyIds = await prisma.property.findMany({
        where: propertyFilter,
        select: { id: true },
      });

      unitFilter = {
        propertyId: { in: propertyIds.map(p => p.id) },
      };

      const units = await prisma.unit.groupBy({
        by: ['status'],
        where: unitFilter,
        _count: true,
      });

      summary.units.total = units.reduce((sum, u) => sum + u._count, 0);
      units.forEach((u) => {
        if (u.status === 'OCCUPIED') summary.units.occupied = u._count;
        else if (u.status === 'AVAILABLE') summary.units.available = u._count;
        else if (u.status === 'MAINTENANCE') summary.units.maintenance = u._count;
      });
    }

    // Fetch Jobs Stats
    const jobs = await prisma.job.groupBy({
      by: ['status'],
      where: jobFilter,
      _count: true,
    });

    summary.jobs.total = jobs.reduce((sum, j) => sum + j._count, 0);
    jobs.forEach((j) => {
      if (j.status === 'OPEN') summary.jobs.open = j._count;
      else if (j.status === 'ASSIGNED') summary.jobs.assigned = j._count;
      else if (j.status === 'IN_PROGRESS') summary.jobs.inProgress = j._count;
      else if (j.status === 'COMPLETED') summary.jobs.completed = j._count;
    });

    // Check for overdue jobs
    const overdueJobs = await prisma.job.count({
      where: {
        ...jobFilter,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        scheduledDate: { lt: new Date() },
      },
    });
    summary.jobs.overdue = overdueJobs;

    // Fetch Inspections Stats
    const inspections = await prisma.inspection.groupBy({
      by: ['status'],
      where: inspectionFilter,
      _count: true,
    });

    summary.inspections.total = inspections.reduce((sum, i) => sum + i._count, 0);
    inspections.forEach((i) => {
      if (i.status === 'SCHEDULED') summary.inspections.scheduled = i._count;
      else if (i.status === 'IN_PROGRESS') summary.inspections.inProgress = i._count;
      else if (i.status === 'COMPLETED') summary.inspections.completed = i._count;
    });

    // Upcoming inspections (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingInspections = await prisma.inspection.count({
      where: {
        ...inspectionFilter,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
          lte: nextWeek,
        },
      },
    });
    summary.inspections.upcoming = upcomingInspections;

    // Fetch Service Requests Stats (for Managers and Owners)
    if (role === 'PROPERTY_MANAGER' || role === 'OWNER') {
      const serviceRequests = await prisma.serviceRequest.groupBy({
        by: ['status'],
        where: serviceRequestFilter,
        _count: true,
      });

      summary.serviceRequests.total = serviceRequests.reduce((sum, sr) => sum + sr._count, 0);
      serviceRequests.forEach((sr) => {
        if (sr.status === 'SUBMITTED') summary.serviceRequests.submitted = sr._count;
        else if (sr.status === 'UNDER_REVIEW') summary.serviceRequests.underReview = sr._count;
        else if (sr.status === 'APPROVED') summary.serviceRequests.approved = sr._count;
      });
    }

    // Generate Alerts
    const alerts = [];

    // Check subscription status
    if (role === 'PROPERTY_MANAGER') {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: ['TRIAL', 'ACTIVE'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription) {
        if (subscription.status === 'TRIAL' && subscription.trialEndDate) {
          const daysLeft = Math.ceil(
            (new Date(subscription.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysLeft <= 3 && daysLeft > 0) {
            alerts.push({
              type: 'warning',
              title: 'Trial Ending Soon',
              message: `Your trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Subscribe to continue using AgentFM.`,
              action: { label: 'Subscribe Now', link: '/subscriptions' },
            });
          } else if (daysLeft <= 0) {
            alerts.push({
              type: 'error',
              title: 'Trial Expired',
              message: 'Your trial has expired. Subscribe to continue managing your properties.',
              action: { label: 'Subscribe Now', link: '/subscriptions' },
            });
          }
        }

        if (subscription.status === 'ACTIVE' && subscription.stripeCurrentPeriodEnd) {
          const daysLeft = Math.ceil(
            (new Date(subscription.stripeCurrentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysLeft <= 3 && daysLeft > 0) {
            alerts.push({
              type: 'info',
              title: 'Subscription Renewal',
              message: `Your subscription renews in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
              action: { label: 'Manage Subscription', link: '/subscriptions' },
            });
          }
        }
      } else {
        alerts.push({
          type: 'error',
          title: 'No Active Subscription',
          message: 'You need an active subscription to access all features.',
          action: { label: 'Subscribe Now', link: '/subscriptions' },
        });
      }
    }

    // Alert for overdue jobs
    if (summary.jobs.overdue > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Jobs',
        message: `You have ${summary.jobs.overdue} overdue job${summary.jobs.overdue > 1 ? 's' : ''}.`,
        action: { label: 'View Jobs', link: '/jobs?filter=overdue' },
      });
    }

    // Alert for upcoming inspections
    if (summary.inspections.upcoming > 0) {
      alerts.push({
        type: 'info',
        title: 'Upcoming Inspections',
        message: `You have ${summary.inspections.upcoming} inspection${summary.inspections.upcoming > 1 ? 's' : ''} scheduled in the next 7 days.`,
        action: { label: 'View Inspections', link: '/inspections' },
      });
    }

    // Alert for pending service requests (Managers only)
    if (role === 'PROPERTY_MANAGER' && summary.serviceRequests.submitted > 0) {
      alerts.push({
        type: 'info',
        title: 'New Service Requests',
        message: `You have ${summary.serviceRequests.submitted} new service request${summary.serviceRequests.submitted > 1 ? 's' : ''} to review.`,
        action: { label: 'Review Requests', link: '/service-requests' },
      });
    }

    summary.alerts = alerts;

    res.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

/**
 * Get recent activity feed for dashboard
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { limit = 10 } = req.query;

    let activities = [];

    // Build filters
    let propertyFilter = {};
    if (role === 'PROPERTY_MANAGER') {
      propertyFilter = { managerId: userId };
    } else if (role === 'OWNER') {
      propertyFilter = {
        owners: { some: { ownerId: userId } },
      };
    }

    // Recent inspections
    const inspections = await prisma.inspection.findMany({
      where: role === 'TECHNICIAN' 
        ? { assignedToId: userId }
        : propertyFilter.managerId || propertyFilter.owners
        ? { property: propertyFilter }
        : {},
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledDate: true,
        updatedAt: true,
        property: { select: { name: true } },
      },
    });

    inspections.forEach((i) => {
      activities.push({
        type: 'inspection',
        id: i.id,
        title: i.title,
        description: `Inspection at ${i.property?.name || 'property'}`,
        status: i.status,
        date: i.updatedAt,
      });
    });

    // Recent jobs
    const jobs = await prisma.job.findMany({
      where: role === 'TECHNICIAN'
        ? { assignedToId: userId }
        : {},
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
        property: { select: { name: true } },
      },
    });

    jobs.forEach((j) => {
      activities.push({
        type: 'job',
        id: j.id,
        title: j.title,
        description: `Job at ${j.property?.name || 'property'}`,
        status: j.status,
        priority: j.priority,
        date: j.updatedAt,
      });
    });

    // Sort by date and limit
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    activities = activities.slice(0, parseInt(limit));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};
