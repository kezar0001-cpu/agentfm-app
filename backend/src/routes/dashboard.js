const express = require('express');
const { requireAuth } = require('../auth');
const { getDashboardSummary } = require('../data/memoryStore');

const router = express.Router();

router.use(requireAuth);

router.get('/summary', (req, res) => {
  res.json(getDashboardSummary(req.user.orgId));
});

module.exports = router;
