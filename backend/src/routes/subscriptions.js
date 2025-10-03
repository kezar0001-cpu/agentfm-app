const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../auth');
const { listSubscriptions, createSubscription, updateSubscription } = require('../data/memoryStore');

const router = express.Router();

const STATUS_OPTIONS = ['active', 'pending', 'suspended', 'cancelled'];

const subscriptionSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  planId: z.string().min(1),
});

const subscriptionUpdateSchema = z.object({
  status: z.enum(STATUS_OPTIONS).optional(),
});

router.get('/', requireAuth, (req, res) => {
  res.json(listSubscriptions(req.user.orgId));
});

router.post('/', requireAuth, validate(subscriptionSchema), (req, res) => {
  const result = createSubscription(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

router.patch('/:id', requireAuth, validate(subscriptionUpdateSchema), (req, res) => {
  const result = updateSubscription(req.user.orgId, req.params.id, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

module.exports = router;
