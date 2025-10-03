const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Schema for creating a subscription
const subscriptionSchema = z.object({
  propertyId: z.string(),
  unitId: z.string().optional(),
  planId: z.string()
});

// Schema for updating a subscription
const subscriptionUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELED']).optional()
});

// GET /subscriptions - list subscriptions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { orgId: req.user.orgId },
      include: { property: true, unit: true, plan: true }
    });
    res.json(subs);
  } catch (err) {
    next(err);
  }
});

// POST /subscriptions - create a new subscription
router.post('/', requireAuth, validate(subscriptionSchema), async (req, res, next) => {
  try {
    // verify plan belongs to org
    const plan = await prisma.plan.findFirst({ where: { id: req.body.planId, orgId: req.user.orgId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const prop = await prisma.property.findFirst({ where: { id: req.body.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (req.body.unitId) {
      const unit = await prisma.unit.findFirst({ where: { id: req.body.unitId, propertyId: req.body.propertyId } });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
    }
    const sub = await prisma.subscription.create({
      data: {
        orgId: req.user.orgId,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId,
        planId: req.body.planId,
        status: 'ACTIVE'
      }
    });
    res.status(201).json(sub);
  } catch (err) {
    next(err);
  }
});

// PATCH /subscriptions/:id - update status
router.patch('/:id', requireAuth, validate(subscriptionUpdateSchema), async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: req.body.status || sub.status
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;