import prisma from '../src/config/prismaClient.js';

// ============================================
// DASHBOARD CONTROLLER
// ============================================

/**
 * GET /api/dashboard/summary
 * Role-aware, aggregated snapshot for the signed-in user.
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const summary = {
      properties: { total: 0, active: 0, inactive: 0, underMaintenance: 0 },
      units:      { total: 0, occupied: 0, available: 0, maintenance: 0 },
      jobs:       { total: 0, open: 0, assigned: 0, inProgress: 0, completed: 0, overdue: 0 },
      inspections:{ total: 0, scheduled: 0, inProgress: 0, completed: 0, upcoming: 0 },
      serviceRequests: { total: 0, submitted: 0, underReview: 0, approved: 0 },
      alerts: [],
    };

    // ---------- Role scoping
    let propertyFilter = {};
    let jobFilter = {};
    let inspectionFilter = {};
    let serviceRequestWhere = {};

    if (role === 'PROPERTY_MANAGER') {
      propertyFilter = { managerId: userId };
      serviceRequestWhere = { property: { managerId: userId } };
    } else if (role === 'OWNER') {
      propertyFilter = { owners: { some: { ownerId: userId } } };
      serviceRequestWhere = { property: { owners: { some: { ownerId: userId } } } };
    } else if (role === 'TENANT') {
      // Tenant: get properties via active unit tenancies
      const tenantUnits = await prisma.unitTenant.findMany({
        where: { tenantId: userId, isActive: true },
        select: { unit: { select: { propertyId: true } } },
      });
      const propertyIds = [...new Set(tenantUnits.map(ut => ut.unit.propertyId))];
      if (propertyIds.length > 0) propertyFilter = { id: { in: propertyIds } };
      // Service requests created by the tenant
      serviceRequestWhere = { requestedById: userId };
    } else if (role === 'TECHNICIAN') {
      jobFilter = { assignedToId: userId };
      inspectionFilter = { assignedToId: userId };
      // Tech sees SRs only if linked to their jobs (not counted in summary buckets here)
      serviceRequestWhere = { jobs: { some: { assignedToId: userId } } };
    }

    // ---------- Properties (not relevant for pure technician view)
    if (role !== 'TECHNICIAN') {
      const byStatus = await prisma.property.groupBy({
        by: ['status'],
        where: propertyFilter,
        _count: { _all: true },
      });
      summary.properties.total = byStatus.reduce((n, r) => n + r._count._all, 0);
      for (const r of byStatus) {
        if (r.status === 'ACTIVE') summary.properties.active = r._count._all;
        if (r.status === 'INACTIVE') summary.properties.inactive = r._count._all;
        if (r.status === 'UNDER_MAINTENANCE') summary.properties.underMaintenance = r._count._all;
      }
    }

    // ---------- Units (also scoped by properties)
    if (role !== 'TECHNICIAN') {
      const props = await prisma.property.findMany({
        where: propertyFilter,
        select: { id: true },
      });
      const scopedPropertyIds = props.map(p => p.id);
      if (scopedPropertyIds.length > 0) {
        const byStatus = await prisma.unit.groupBy({
          by: ['status'],
          where: { propertyId: { in: scopedPropertyIds } },
          _count: { _all: true },
        });
        summary.units.total = byStatus.reduce((n, r) => n + r._count._all, 0);
        for (const r of byStatus) {
          if (r.status === 'OCCUPIED') summary.units.occupied = r._count._all;
          if (r.status === 'AVAILABLE') summary.units.available = r._count._all;
          if (r.status === 'MAINTENANCE') summary.units.maintenance = r._count._all;
        }
      }
    }

    // ---------- Jobs
    {
      const byStatus = await prisma.job.groupBy({
        by: ['status'],
        where: jobFilter,
        _count: { _all: true },
      });
      summary.jobs.total = byStatus.reduce((n, r) => n + r._count._all, 0);
      for (const r of byStatus) {
        if (r.status === 'OPEN')        summary.jobs.open = r._count._all;
        if (r.status === 'ASSIGNED')    summary.jobs.assigned = r._count._all;
        if (r.status === 'IN_PROGRESS') summary.jobs.inProgress = r._count._all;
        if (r.status === 'COMPLETED')   summary.jobs.completed = r._count._all;
      }

      const overdueJobs = await prisma.job.count({
        where: {
          ...jobFilter,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          scheduledDate: { lt: new Date() },
        },
      });
      summary.jobs.overdue = overdueJobs;
    }

    // ---------- Inspections
    {
      const byStatus = await prisma.inspection.groupBy({
        by: ['status'],
        where: inspectionFilter,
        _count: { _all: true },
      });
      summary.inspections.total = byStatus.reduce((n, r) => n + r._count._all, 0);
      for (const r of byStatus) {
        if (r.status === 'SCHEDULED')   summary.inspections.scheduled = r._count._all;
        if (r.status === 'IN_PROGRESS') summary.inspections.inProgress = r._count._all;
        if (r.status === 'COMPLETED')   summary.inspections.completed = r._count._all;
      }

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      summary.inspections.upcoming = await prisma.inspection.count({
        where: {
          ...inspectionFilter,
          status: 'SCHEDULED',
          scheduledDate: { gte: new Date(), lte: nextWeek },
        },
      });
    }

    // ---------- Service Requests (only surfaced for PM & Owner in the buckets)
    if (role === 'PROPERTY_MANAGER' || role === 'OWNER') {
      const byStatus = await prisma.serviceRequest.groupBy({
        by: ['status'],
        where: serviceRequestWhere,
        _count: { _all: true },
      });
      summary.serviceRequests.total = byStatus.reduce((n, r) => n + r._count._all, 0);
      for (const r of byStatus) {
        if (r.status === 'SUBMITTED')     summary.serviceRequests.submitted = r._count._all;
        if (r.status === 'UNDER_REVIEW')  summary.serviceRequests.underReview = r._count._all;
        if (r.status === 'APPROVED')      summary.serviceRequests.approved = r._count._all;
      }
    }

    // ---------- Alerts
    const alerts = [];
    if (role === 'PROPERTY_MANAGER') {
      const subscription = await prisma.subscription.findFirst({
        where: { userId, status: { in: ['TRIAL', 'ACTIVE'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (subscription) {
        if (subscription.status === 'TRIAL' && subscription.trialEndDate) {
          const daysLeft = Math.ceil((new Date(subscription.trialEndDate) - new Date()) / 86400000);
          if (daysLeft <= 3 && daysLeft > 0) {
            alerts.push({
              id: 'trial_ending',
              type: 'warning',
              title: 'Trial Ending Soon',
              message: `Your trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
              action: { label: 'Subscribe Now', link: '/subscriptions' },
            });
          } else if (daysLeft <= 0) {
            alerts.push({
              id: 'trial_expired',
              type: 'error',
              title: 'Trial Expired',
              message: 'Your trial has expired.',
              action: { label: 'Subscribe Now', link: '/subscriptions' },
            });
          }
        }
        if (subscription.status === 'ACTIVE' && subscription.stripeCurrentPeriodEnd) {
          const daysLeft = Math.ceil(
            (new Date(subscription.stripeCurrentPeriodEnd) - new Date()) / 86400000
          );
          if (daysLeft <= 3 && daysLeft > 0) {
            alerts.push({
              id: 'renewal_soon',
              type: 'info',
              title: 'Subscription Renewal',
              message: `Your subscription renews in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
              action: { label: 'Manage Subscription', link: '/subscriptions' },
            });
          }
        }
      } else {
        alerts.push({
          id: 'no_subscription',
          type: 'error',
          title: 'No Active Subscription',
          message: 'You need an active subscription to access all features.',
          action: { label: 'Subscribe Now', link: '/subscriptions' },
        });
      }
    }
    if (summary.jobs.overdue > 0) {
      alerts.push({
        id: 'overdue_jobs',
        type: 'warning',
        title: 'Overdue Jobs',
        message: `You have ${summary.jobs.overdue} overdue job${summary.jobs.overdue > 1 ? 's' : ''}.`,
        action: { label: 'View Jobs', link: '/jobs?filter=overdue' },
      });
    }
    if (summary.inspections.upcoming > 0) {
      alerts.push({
        id: 'upcoming_inspections',
        type: 'info',
        title: 'Upcoming Inspections',
        message: `You have ${summary.inspections.upcoming} inspection${summary.inspections.upcoming > 1 ? 's' : ''} in the next 7 days.`,
        action: { label: 'View Inspections', link: '/inspections' },
      });
    }
    if (role === 'PROPERTY_MANAGER' && summary.serviceRequests.submitted > 0) {
      alerts.push({
        id: 'pending_requests',
        type: 'info',
        title: 'New Service Requests',
        message: `You have ${summary.serviceRequests.submitted} new service request${summary.serviceRequests.submitted > 1 ? 's' : ''}.`,
        action: { label: 'Review Requests', link: '/service-requests' },
      });
    }

    summary.alerts = alerts;

    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
};

/**
 * GET /api/dashboard/activity
 * Recent activity feed for the signed-in user.
 */
export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const limitNumber = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const activities = [];

    const propertyScope =
      role === 'PROPERTY_MANAGER'
        ? { managerId: userId }
        : role === 'OWNER'
        ? { owners: { some: { ownerId: userId } } }
        : undefined;

    const inspectionWhere =
      role === 'TECHNICIAN'
        ? { assignedToId: userId }
        : propertyScope
        ? { property: propertyScope }
        : {};

    const jobWhere =
      role === 'TECHNICIAN'
        ? { assignedToId: userId }
        : propertyScope
        ? { property: propertyScope }
        : role === 'TENANT'
        ? { serviceRequest: { requestedById: userId } }
        : {};

    const unitWhere =
      role === 'TECHNICIAN'
        ? { jobs: { some: { assignedToId: userId } } }
        : propertyScope
        ? { property: propertyScope }
        : role === 'TENANT'
        ? { tenants: { some: { tenantId: userId, isActive: true } } }
        : {};

    const serviceRequestWhere =
      role === 'PROPERTY_MANAGER'
        ? { property: { managerId: userId } }
        : role === 'OWNER'
        ? { property: { owners: { some: { ownerId: userId } } } }
        : role === 'TENANT'
        ? { requestedById: userId }
        : role === 'TECHNICIAN'
        ? { jobs: { some: { assignedToId: userId } } }
        : {};

    const [inspections, jobs, serviceRequests, properties, units, notifications] = await Promise.all([
      prisma.inspection.findMany({
        where: inspectionWhere,
        orderBy: { updatedAt: 'desc' },
        take: limitNumber,
        select: {
          id: true, title: true, status: true, scheduledDate: true, updatedAt: true,
          property: { select: { name: true, id: true } },
        },
      }),
      prisma.job.findMany({
        where: jobWhere,
        orderBy: { updatedAt: 'desc' },
        take: limitNumber,
        select: {
          id: true, title: true, status: true, priority: true, updatedAt: true,
          property: { select: { name: true, id: true } },
        },
      }),
      prisma.serviceRequest.findMany({
        where: serviceRequestWhere,
        orderBy: { updatedAt: 'desc' },
        take: limitNumber,
        select: {
          id: true, title: true, status: true, priority: true, updatedAt: true,
          property: { select: { name: true, id: true } },
          requestedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.property.findMany({
        where: propertyScope,
        orderBy: { updatedAt: 'desc' },
        take: limitNumber,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
      prisma.unit.findMany({
        where: unitWhere,
        orderBy: { updatedAt: 'desc' },
        take: limitNumber,
        select: {
          id: true, unitNumber: true, status: true, updatedAt: true,
          property: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limitNumber,
        select: {
          id: true, title: true, message: true, type: true,
          entityType: true, entityId: true, createdAt: true,
        },
      }),
    ]);

    inspections.forEach((i) => {
      activities.push({
        type: 'inspection',
        id: i.id,
        title: i.title,
        description: i.property?.name ? `Inspection at ${i.property.name}` : 'Inspection update',
        status: i.status,
        date: i.updatedAt,
        link: '/inspections',
      });
    });

    jobs.forEach((j) => {
      activities.push({
        type: 'job',
        id: j.id,
        title: j.title,
        description: j.property?.name ? `Job at ${j.property.name}` : 'Job update',
        status: j.status,
        priority: j.priority,
        date: j.updatedAt,
        link: '/jobs',
      });
    });

    serviceRequests.forEach((sr) => {
      const requesterName = sr.requestedBy
        ? `${sr.requestedBy.firstName} ${sr.requestedBy.lastName}`.trim()
        : null;
      const statusLabel = sr.status ? sr.status.replace(/_/g, ' ').toLowerCase() : 'updated';

      activities.push({
        type: 'service_request',
        id: sr.id,
        title: sr.title,
        description: `${sr.property?.name ? `${sr.property.name} · ` : ''}${statusLabel}${
          requesterName ? ` by ${requesterName}` : ''
        }`,
        status: sr.status,
        priority: sr.priority,
        date: sr.updatedAt,
        link: '/service-requests',
      });
    });

    properties.forEach((p) => {
      const statusLabel = p.status ? p.status.replace(/_/g, ' ').toLowerCase() : 'updated';
      activities.push({
        type: 'property',
        id: p.id,
        title: p.name,
        description: `Property status updated to ${statusLabel}`,
        status: p.status,
        date: p.updatedAt,
        link: `/properties/${p.id}`,
      });
    });

    units.forEach((u) => {
      activities.push({
        type: 'unit',
        id: u.id,
        title: `Unit ${u.unitNumber}`,
        description: u.property?.name ? `Unit at ${u.property.name} updated` : 'Unit update',
        status: u.status,
        date: u.updatedAt,
        link: u.property ? `/properties/${u.property.id}` : undefined,
      });
    });

    notifications.forEach((n) => {
      activities.push({
        type: n.entityType || 'notification',
        id: n.entityId || n.id,
        title: n.title,
        description: n.message,
        status: n.type,
        date: n.createdAt,
        link:
          n.entityType === 'inspection'
            ? '/inspections'
            : n.entityType === 'job'
            ? '/jobs'
            : n.entityType === 'service_request'
            ? '/service-requests'
            : undefined,
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ success: true, items: activities.slice(0, limitNumber) });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
};
