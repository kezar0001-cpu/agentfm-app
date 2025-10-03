// src/routes/dashboard.js
const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ACTIVE_JOB_STATUSES = ['OPEN', 'SCHEDULED', 'IN_PROGRESS'];
const ACTIVE_REQUEST_STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS'];
const MS_IN_DAY = 24 * 60 * 60 * 1000;

async function buildOverview(orgId) {
  const now = new Date();
  const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [properties, jobs, serviceRequests, inspections, recommendations, subscriptions] = await Promise.all([
    prisma.property.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        occupancyRate: true,
        healthScore: true,
        portfolioValue: true,
        tags: true,
        units: { select: { id: true } },
        serviceRequests: {
          where: { status: { in: ACTIVE_REQUEST_STATUSES } },
          select: { id: true },
        },
        jobs: {
          where: { status: { in: ACTIVE_JOB_STATUSES } },
          select: { id: true },
        },
      },
    }),
    prisma.job.findMany({
      where: { orgId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        scheduledFor: true,
        propertyId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceRequest.findMany({
      where: { orgId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        propertyId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inspection.findMany({
      where: { orgId },
      select: {
        id: true,
        propertyId: true,
        scheduledAt: true,
        completedAt: true,
        overallPCI: true,
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.recommendation.findMany({
      where: { orgId, status: 'PENDING' },
      select: {
        id: true,
        propertyId: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findMany({
      where: { orgId },
      select: {
        id: true,
        propertyId: true,
        status: true,
      },
    }),
  ]);

  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  const adminOpenJobs = jobs.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status));
  const jobsDueSoon = adminOpenJobs.filter(
    (job) => job.scheduledFor && job.scheduledFor >= now && job.scheduledFor <= nextSevenDays
  );
  const completedThisMonth = jobs.filter((job) => job.status === 'COMPLETED' && job.updatedAt >= new Date(now.getFullYear(), now.getMonth(), 1));

  const activeRequests = serviceRequests.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.status));
  const overdueRequests = activeRequests.filter((request) => request.dueAt && request.dueAt < now);
  const avgRequestAgeDays = activeRequests.length
    ? Number(
        (
          activeRequests.reduce((sum, request) => sum + (now - request.createdAt) / MS_IN_DAY, 0) /
          activeRequests.length
        ).toFixed(1)
      )
    : null;

  const serviceQueueByPriority = activeRequests.reduce((acc, request) => {
    const key = request.priority || 'MEDIUM';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalPortfolioValue = properties.reduce((sum, property) => sum + (Number(property.portfolioValue) || 0), 0);
  const occupancyValues = properties
    .map((property) => {
      if (typeof property.occupancyRate !== 'number') return null;
      const value = property.occupancyRate;
      return value > 1 ? value / 100 : value;
    })
    .filter((value) => typeof value === 'number');
  const avgOccupancy = occupancyValues.length
    ? Number((occupancyValues.reduce((sum, value) => sum + value, 0) / occupancyValues.length).toFixed(2))
    : null;

  const healthValues = properties.map((property) => property.healthScore).filter((value) => typeof value === 'number');
  const avgHealth = healthValues.length
    ? Number((healthValues.reduce((sum, value) => sum + value, 0) / healthValues.length).toFixed(1))
    : null;

  const upcomingInspections = inspections
    .filter(
      (inspection) => !inspection.completedAt && inspection.scheduledAt >= now && inspection.scheduledAt <= nextThirtyDays
    )
    .slice(0, 5)
    .map((inspection) => ({
      ...inspection,
      propertyName: propertyMap.get(inspection.propertyId)?.name || 'Unknown property',
    }));

  const topProperties = [...properties]
    .sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0))
    .slice(0, 4)
    .map((property) => ({
      id: property.id,
      name: property.name,
      city: property.city,
      country: property.country,
      healthScore: property.healthScore,
      occupancyRate: property.occupancyRate,
      openJobs: property.jobs.length,
      activeRequests: property.serviceRequests.length,
      tags: property.tags,
    }));

  const portfolioMixMap = properties.reduce((acc, property) => {
    const type = property.type || 'Other';
    if (!acc.has(type)) {
      acc.set(type, {
        type,
        propertyCount: 0,
        totalValue: 0,
        occupancySum: 0,
        occupancySamples: 0,
      });
    }
    const entry = acc.get(type);
    entry.propertyCount += 1;
    entry.totalValue += Number(property.portfolioValue) || 0;
    if (typeof property.occupancyRate === 'number') {
      const value = property.occupancyRate > 1 ? property.occupancyRate / 100 : property.occupancyRate;
      entry.occupancySum += value;
      entry.occupancySamples += 1;
    }
    return acc;
  }, new Map());

  const portfolioMix = Array.from(portfolioMixMap.values())
    .map((entry) => ({
      type: entry.type,
      propertyCount: entry.propertyCount,
      totalValue: Number(entry.totalValue.toFixed(0)),
      averageOccupancy: entry.occupancySamples
        ? Number((entry.occupancySum / entry.occupancySamples).toFixed(2))
        : null,
    }))
    .sort((a, b) => b.propertyCount - a.propertyCount);

  const adminHighlights = {
    serviceRequests: activeRequests.slice(0, 5).map((request) => ({
      ...request,
      propertyName: propertyMap.get(request.propertyId)?.name || 'Unknown property',
      ageDays: Number(((now - request.createdAt) / MS_IN_DAY).toFixed(1)),
      isOverdue: Boolean(request.dueAt && request.dueAt < now),
    })),
    jobs: adminOpenJobs.slice(0, 5).map((job) => ({
      ...job,
      propertyName: propertyMap.get(job.propertyId)?.name || 'Unknown property',
      isOverdue: Boolean(job.scheduledFor && job.scheduledFor < now),
    })),
  };

  const activity = [...serviceRequests, ...jobs]
    .map((item) => {
      const base = {
        id: item.id,
        createdAt: item.createdAt,
        propertyId: item.propertyId,
        propertyName: propertyMap.get(item.propertyId)?.name || 'Unknown property',
      };
      if ('status' in item && 'priority' in item && 'dueAt' in item) {
        return {
          ...base,
          type: 'serviceRequest',
          title: item.title,
          status: item.status,
          priority: item.priority,
        };
      }
      return {
        ...base,
        type: 'job',
        title: item.title,
        status: item.status,
        priority: item.priority,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length;

  return {
    updatedAt: now.toISOString(),
    admin: {
      metrics: {
        openJobs: adminOpenJobs.length,
        jobsDueSoon: jobsDueSoon.length,
        serviceQueue: activeRequests.length,
        completedThisMonth: completedThisMonth.length,
        overdueRequests: overdueRequests.length,
        avgRequestAgeDays,
        activeRequestsByPriority: serviceQueueByPriority,
      },
      highlights: adminHighlights,
    },
    client: {
      metrics: {
        propertiesManaged: properties.length,
        portfolioValue: Number(totalPortfolioValue.toFixed(0)),
        averageOccupancy: avgOccupancy,
        averageHealth: avgHealth,
        inspectionsDue: upcomingInspections.length,
        pendingRecommendations: recommendations.length,
        activeSubscriptions,
      },
      topProperties,
      upcomingInspections,
      portfolioMix,
      activity,
    },
  };
}

router.use(requireAuth);

router.get('/overview', async (req, res, next) => {
  try {
    const data = await buildOverview(req.user.orgId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const data = await buildOverview(req.user.orgId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
