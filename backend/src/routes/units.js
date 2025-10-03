const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// Router with mergeParams so we can access propertyId from parent route
const router = express.Router({ mergeParams: true });

const numberFromString = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, schema);

const unitSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  floor: z.string().min(1, { message: 'Floor is required' }),
  area: numberFromString(z.number().positive({ message: 'Area must be positive' })),
  usageType: z.string().optional().nullable(),
  occupancyStatus: z.string().optional().nullable(),
});

// GET /properties/:propertyId/units - list units for a property
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    const property = await prisma.property.findFirst({
      where: { id: propertyId, orgId: req.user.orgId },
      select: { id: true },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const units = await prisma.unit.findMany({
      where: { propertyId, orgId: req.user.orgId },
      orderBy: { label: 'asc' },
    });
    res.json(units);
  } catch (err) {
    next(err);
  }
});

// POST /properties/:propertyId/units - create unit for property
router.post('/', requireAuth, validate(unitSchema), async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    // verify property belongs to org
    const prop = await prisma.property.findFirst({ where: { id: propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    const unit = await prisma.unit.create({
      data: {
        orgId: req.user.orgId,
        propertyId,
        label: req.body.name,
        floor: req.body.floor,
        area: req.body.area,
        usageType: req.body.usageType ?? null,
        occupancyStatus: req.body.occupancyStatus ?? null,
      },
    });
    res.status(201).json(unit);
  } catch (err) {
    next(err);
  }
});

// GET /units/:id - fetch a single unit by id
router.get('/:unitId', requireAuth, async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.unitId, orgId: req.user.orgId },
      include: { inspections: true, jobs: true, subscriptions: true },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    next(err);
  }
});

// PATCH /units/:id - update a unit
router.patch('/:unitId', requireAuth, validate(unitSchema.partial()), async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({ where: { id: req.params.unitId, orgId: req.user.orgId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const payload = {
      label: req.body.name ?? unit.label,
      floor: req.body.floor ?? unit.floor,
      area: req.body.area ?? unit.area,
      usageType: req.body.usageType ?? unit.usageType,
      occupancyStatus: req.body.occupancyStatus ?? unit.occupancyStatus,
    };

    const updated = await prisma.unit.update({
      where: { id: req.params.unitId },
      data: payload,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /units/:id - delete a unit
router.delete('/:unitId', requireAuth, async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({ where: { id: req.params.unitId, orgId: req.user.orgId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    // cascade delete related jobs, inspections and subscriptions
    await prisma.job.deleteMany({ where: { unitId: unit.id } });
    await prisma.inspection.deleteMany({ where: { unitId: unit.id } });
    await prisma.subscription.deleteMany({ where: { unitId: unit.id } });
    await prisma.unit.delete({ where: { id: unit.id } });
    res.json({ status: 'deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;