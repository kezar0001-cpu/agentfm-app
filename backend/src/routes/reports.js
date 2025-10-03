const express = require('express');
const { requireAuth } = require('../middleware/auth');
// In a full implementation you'd import Puppeteer and a template
// generator here.  For the MVP scaffold we stub out the endpoints.

const router = express.Router();

// POST /reports/owner - trigger generation of a report.  Accepts
// propertyId, from (ISO date), to (ISO date) and email.  Responds
// immediately with a report identifier.  The actual PDF generation
// should happen asynchronously (e.g. background worker) and email a
// link when complete.
router.post('/owner', requireAuth, async (req, res) => {
  const { propertyId, from, to, email } = req.body;
  // Validate input (omitted for brevity)
  const reportId = `rep_${Date.now()}`;
  // TODO: persist report request and enqueue background job
  res.status(202).json({ reportId, message: 'Report generation queued' });
});

// GET /reports/:id.pdf - return a generated PDF.  In this stub we
// simply return 404 as no reports are actually generated.
router.get('/:id.pdf', requireAuth, async (req, res) => {
  res.status(404).send('Report not found');
});

module.exports = router;