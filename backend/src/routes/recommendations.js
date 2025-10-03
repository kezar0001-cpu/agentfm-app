const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /recommendations - list recommendations for the org.  Includes
// whether they have been converted into a job.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { orgId: req.user.orgId },
      include: {
        job: {
          select: { id: true, status: true, scheduledFor: true },
        },
        finding: {
          include: {
            inspection: {
              select: { id: true, propertyId: true, unitId: true, scheduledAt: true },
            },
          },
        },
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// POST /recommendations/:id/convert - convert a recommendation into a job
router.post('/:id/convert', requireAuth, async (req, res, next) => {
  try {
    const rec = await prisma.recommendation.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        job: true,
        finding: {
          include: {
            inspection: true,
          },
        },
      },
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.jobId) return res.status(400).json({ error: 'Recommendation already converted to job' });
    // Determine propertyId and unitId from related inspection
    const inspection = rec.finding.inspection;
    const propertyId = inspection.propertyId;
    const unitId = inspection.unitId;
    const job = await prisma.job.create({
      data: {
        orgId: req.user.orgId,
        propertyId: propertyId,
        unitId: unitId,
        source: 'RECOMMENDATION',
        title: rec.summary,
        description: rec.summary,
        status: 'OPEN',
        priority: rec.priority === 'CRITICAL' ? 'URGENT' : rec.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        scheduledFor: null,
        vendorId: null,
        slaHours: null,
      },
    });
    // update recommendation to point at new job
    await prisma.recommendation.update({ where: { id: rec.id }, data: { jobId: job.id } });
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

module.exports = router;