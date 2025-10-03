const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { listInspections, scheduleInspection } = require('../data/memoryStore');

const router = express.Router();

const inspectionSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  inspector: z.string().min(1),
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'scheduledAt must be a valid ISO date string',
    }),
});

router.get('/', requireAuth, (req, res) => {
  const { propertyId, status } = req.query;
  const inspections = listInspections(req.user.orgId, { propertyId, status });
  res.json(inspections);
});

router.post('/', requireAuth, validate(inspectionSchema), (req, res) => {
  const result = scheduleInspection(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

module.exports = router;
