const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../auth');
const { createReportRequest } = require('../data/memoryStore');

const router = express.Router();

const reportSchema = z.object({
  propertyId: z.string().min(1),
  from: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'from must be a valid ISO date',
    }),
  to: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'to must be a valid ISO date',
    }),
});

router.post('/', requireAuth, validate(reportSchema), (req, res) => {
  const result = createReportRequest(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(202).json({ reportId: result.id, message: 'Report request queued' });
});

router.get('/:id.pdf', requireAuth, (req, res) => {
  res.status(404).send('Report not generated in demo environment');
});

module.exports = router;
