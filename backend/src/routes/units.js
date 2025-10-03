const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { findProperty, addUnit } = require('../data/memoryStore');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z.coerce.number({ invalid_type_error: 'Area must be a number' }).positive('Area must be positive'),
});

router.get('/', (req, res) => {
  const property = findProperty(req.params.propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property.units || []);
});

router.post('/', (req, res) => {
  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }
  const unit = addUnit(req.params.propertyId, parsed.data);
  if (!unit) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.status(201).json(unit);
});

module.exports = router;
