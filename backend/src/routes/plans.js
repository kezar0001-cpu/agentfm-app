const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Schema for creating a plan.  Only owners/managers should create plans.
const planSchema = z.object({
  name: z.string().min(1),
  cadence: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
  includes: z.array(z.string()).nonempty(),
  slaHours: z.number().int().optional(),
  priceAED: z.number().positive(),
});

// GET /plans - list plans for the org
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({ where: { orgId: req.user.orgId } });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// POST /plans - create a new plan (owner/manager only)
router.post('/', requireAuth, requireRole(['owner', 'manager']), validate(planSchema), async (req, res, next) => {
  try {
    const plan = await prisma.plan.create({
      data: {
        orgId: req.user.orgId,
        name: req.body.name,
        cadence: req.body.cadence,
        includes: req.body.includes,
        slaHours: req.body.slaHours,
        priceAED: req.body.priceAED
      }
    });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;