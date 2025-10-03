// agentfm-backend/src/routes/properties.js
const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const relOrAbsString = z.string().min(1);
const imageValueSchema = z.union([relOrAbsString, z.object({ url: relOrAbsString })]);

const ACTIVE_JOB_STATUSES = ['OPEN', 'SCHEDULED', 'IN_PROGRESS'];
const ACTIVE_REQUEST_STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS'];

const numericOptional = (schema) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, schema);

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  portfolioValue: numericOptional(z.number().nonnegative().nullable().optional()),
  occupancyRate: numericOptional(z.number().min(0).max(1).nullable().optional()),
  healthScore: numericOptional(z.number().min(0).max(100).nullable().optional()),
  tags: z.array(z.string().min(1)).optional(),
  coverImage: imageValueSchema.optional().nullable(),
  images: z.array(imageValueSchema).optional().nullable(),
});

function sendZodError(res, err) {
  const first = err?.issues?.[0];
  if (first?.message) return res.status(400).json({ error: first.message });
  return res.status(400).json({ error: 'Invalid request' });
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function normaliseSingleImage(value, { defaultToNull = false } = {}) {
  if (value === undefined) return defaultToNull ? null : undefined;
  if (value === null) return null;
  return typeof value === 'string' ? value : value.url;
}

function normaliseImageList(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.map((item) => (typeof item === 'string' ? item : item.url));
}

function serialiseNumber(value) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function shapeSummary(property) {
  const latestInspection = property.inspections?.[0] ?? null;
  const nextInspection = latestInspection && !latestInspection.completedAt ? latestInspection : null;

  return {
    id: property.id,
    name: property.name,
    type: property.type,
    city: property.city,
    country: property.country,
    addressLine1: property.addressLine1,
    tags: property.tags ?? [],
    portfolioValue: serialiseNumber(property.portfolioValue ?? null),
    occupancyRate: property.occupancyRate ?? null,
    healthScore: property.healthScore ?? latestInspection?.overallPCI ?? null,
    coverImage: property.coverImage ?? null,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    metrics: {
      unitCount: property.units?.length ?? 0,
      openJobs: property.jobs?.length ?? 0,
      activeRequests: property.serviceRequests?.length ?? 0,
      nextInspection,
    },
  };
}

router.get('/', async (req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.user.orgId },
      include: {
        units: { select: { id: true } },
        jobs: {
          where: { status: { in: ACTIVE_JOB_STATUSES } },
          select: { id: true },
        },
        serviceRequests: {
          where: { status: { in: ACTIVE_REQUEST_STATUSES } },
          select: { id: true },
        },
        inspections: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { scheduledAt: true, completedAt: true, overallPCI: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(properties.map(shapeSummary));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) return sendZodError(res, parsed.error);
    const data = parsed.data;

    const coverImage = normaliseSingleImage(data.coverImage, { defaultToNull: true });
    const images = normaliseImageList(data.images);

    const payload = clean({
      orgId: req.user.orgId,
      name: data.name,
      type: data.type,
      city: data.city,
      country: data.country,
      addressLine1: data.addressLine1 ?? null,
      addressLine2: data.addressLine2 ?? null,
      postalCode: data.postalCode ?? null,
      portfolioValue: data.portfolioValue ?? null,
      occupancyRate: data.occupancyRate ?? null,
      healthScore: data.healthScore ?? null,
      tags: data.tags ?? [],
      coverImage,
      images,
    });

    const created = await prisma.property.create({ data: payload });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        units: {
          orderBy: { label: 'asc' },
        },
        inspections: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
          select: {
            id: true,
            scheduledAt: true,
            completedAt: true,
            inspectorName: true,
            overallPCI: true,
          },
        },
        jobs: {
          where: { status: { in: ACTIVE_JOB_STATUSES } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            scheduledFor: true,
            createdAt: true,
          },
        },
        serviceRequests: {
          where: { status: { in: ACTIVE_REQUEST_STATUSES } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!property) return res.status(404).json({ error: 'Property not found' });

    const summary = shapeSummary(property);

    res.json({
      ...summary,
      addressLine2: property.addressLine2,
      postalCode: property.postalCode,
      images: property.images ?? [],
      units: property.units.map((unit) => ({
        id: unit.id,
        name: unit.label,
        floor: unit.floor ?? null,
        area: unit.area ?? null,
        usageType: unit.usageType ?? null,
        occupancyStatus: unit.occupancyStatus ?? null,
      })),
      recentInspections: property.inspections,
      recentJobs: property.jobs,
      serviceRequests: property.serviceRequests,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) return sendZodError(res, parsed.error);
    const data = parsed.data;

    const payload = clean({
      name: data.name,
      type: data.type,
      city: data.city,
      country: data.country,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      postalCode: data.postalCode,
      portfolioValue: data.portfolioValue,
      occupancyRate: data.occupancyRate,
      healthScore: data.healthScore,
      tags: data.tags,
      coverImage: normaliseSingleImage(data.coverImage),
      images: normaliseImageList(data.images),
    });

    const result = await prisma.property.updateMany({
      where: { id: req.params.id, orgId: req.user.orgId },
      data: payload,
    });

    if (result.count === 0) return res.status(404).json({ error: 'Property not found' });

    const updated = await prisma.property.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await prisma.property.deleteMany({
      where: { id: req.params.id, orgId: req.user.orgId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ status: 'deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports._test = {
  relOrAbsString,
  imageValueSchema,
  propertySchema,
  normaliseSingleImage,
  normaliseImageList,
  numericOptional,
};
