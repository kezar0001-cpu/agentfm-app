const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  listServiceRequests,
  createServiceRequest,
  updateServiceRequest,
} = require('../data/memoryStore');

const router = express.Router();

const STATUSES = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const requestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
});

const requestUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'dueAt must be a valid ISO date string',
    }),
  title: z.string().optional(),
  description: z.string().optional(),
});

router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, propertyId } = req.query;
  let requests = listServiceRequests(req.user.orgId);
  if (propertyId) {
    requests = requests.filter((request) => request.propertyId === propertyId);
  }
  if (status) {
    const normalised = String(status).toUpperCase();
    if (STATUSES.includes(normalised)) {
      requests = requests.filter((request) => request.status === normalised);
    }
  }
  res.json(requests);
});

router.post('/', validate(requestSchema), (req, res) => {
  const result = createServiceRequest(req.user.orgId, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.status(201).json(result);
});

router.patch('/:id', validate(requestUpdateSchema), (req, res) => {
  const result = updateServiceRequest(req.user.orgId, req.params.id, req.body);
  if (result instanceof Error) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

module.exports = router;
