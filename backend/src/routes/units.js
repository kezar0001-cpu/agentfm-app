const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// Router with mergeParams so we can access propertyId from parent route
const router = express.Router({ mergeParams: true });

// Schema for creating/updating a unit
const unitSchema = z.object({
  label: z.string().min(1, { message: 'Label is required' })
});

// GET /properties/:propertyId/units - list units for a property
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    const units = await prisma.unit.findMany({
      where: { propertyId },
      include: { inspections: true, jobs: true }
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
        propertyId,
        label: req.body.label
      }
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
      where: { id: req.params.unitId },
      include: { inspections: true, jobs: true, subscriptions: true }
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    // ensure unit belongs to org
    const prop = await prisma.property.findFirst({ where: { id: unit.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    next(err);
  }
});

// PATCH /units/:id - update a unit
router.patch('/:unitId', requireAuth, validate(unitSchema.partial()), async (req, res, next) => {
  try {
    // fetch unit and ensure within org
    const unit = await prisma.unit.findUnique({ where: { id: req.params.unitId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    const prop = await prisma.property.findFirst({ where: { id: unit.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Unit not found' });
    const updated = await prisma.unit.update({
      where: { id: req.params.unitId },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /units/:id - delete a unit
router.delete('/:unitId', requireAuth, async (req, res, next) => {
  try {
    const unit = await prisma.unit.findUnique({ where: { id: req.params.unitId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    const prop = await prisma.property.findFirst({ where: { id: unit.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Unit not found' });
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