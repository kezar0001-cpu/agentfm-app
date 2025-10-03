const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDashboardSummary } = require('../data/memoryStore');

const router = express.Router();

router.use(requireAuth);

router.get('/summary', (_req, res) => {
  res.json(getDashboardSummary());
});

module.exports = router;
