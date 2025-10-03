const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const {
  listProperties,
  addProperty,
  findProperty,
  addUnit,
} = require('../data/memoryStore');

const router = express.Router();

router.use(requireAuth);

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
});

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z
    .coerce
    .number({ invalid_type_error: 'Area must be a number' })
    .positive('Area must be positive'),
});

router.get('/', (req, res) => {
  res.json(listProperties(req.user.orgId));
});

router.post('/', (req, res) => {
  const result = propertySchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const created = addProperty(req.user.orgId, result.data);
  return res.status(201).json(created);
});

router.get('/:id', (req, res) => {
  const property = findProperty(req.user.orgId, req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property);
});

router.post('/:id/units', (req, res) => {
  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const unit = addUnit(req.user.orgId, req.params.id, parsed.data);
  if (unit instanceof Error || !unit) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.status(201).json(unit);
});

module.exports = router;
