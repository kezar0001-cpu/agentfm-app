const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { listPlans, addPlan } = require('../data/memoryStore');

const router = express.Router();

router.use(requireAuth);

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  description: z.string().optional(),
});

router.get('/', (_req, res) => {
  res.json(listPlans());
});

router.post('/', (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const plan = addPlan(parsed.data);
  res.status(201).json(plan);
});

module.exports = router;
