const express = require('express');
const { requireAuth } = require('../auth');
const { listRecommendations, convertRecommendation } = require('../data/memoryStore');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json(listRecommendations(req.user.orgId));
});

router.post('/:id/convert', requireAuth, (req, res) => {
  const result = convertRecommendation(req.user.orgId, req.params.id);
  if (result instanceof Error) {
    let status = 400;
    if (result.code === 'NOT_FOUND') status = 404;
    if (result.code === 'INVALID') status = 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

module.exports = router;
