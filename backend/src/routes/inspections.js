const express = require('express');
const prisma = require('../prisma');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { computePCI, applyRules } = require('../utils/pci');

// Load the recommendation rules.  This static import means rules are
// bundled at build time.  In a more dynamic system you might load
// these from a database or admin-configurable source.
const rules = require('../config/rules.json');

const router = express.Router();

// Schema for creating an inspection
const inspectionSchema = z.object({
  propertyId: z.string(),
  unitId: z.string().optional(),
  inspector: z.string().min(1),
  scheduledAt: z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
    message: 'scheduledAt must be a valid ISO date string',
  }),
});

// Schema for creating findings
const findingSchema = z.object({
  system: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  note: z.string().min(1),
  photos: z.any().optional(),
});

// GET /inspections - list inspections for the org.  Supports optional
// filtering by propertyId.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { propertyId, status } = req.query;
    const where = { orgId: req.user.orgId };
    if (propertyId) where.propertyId = propertyId;
    if (status === 'completed') {
      where.completedAt = { not: null };
    } else if (status === 'pending') {
      where.completedAt = null;
    }
    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        findings: true,
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, label: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(inspections);
  } catch (err) {
    next(err);
  }
});

// POST /inspections - schedule a new inspection
router.post('/', requireAuth, validate(inspectionSchema), async (req, res, next) => {
  try {
    // verify property belongs to org
    const prop = await prisma.property.findFirst({ where: { id: req.body.propertyId, orgId: req.user.orgId } });
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    let unit = null;
    if (req.body.unitId) {
      unit = await prisma.unit.findFirst({ where: { id: req.body.unitId, propertyId: req.body.propertyId } });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
    }
    const inspection = await prisma.inspection.create({
      data: {
        orgId: req.user.orgId,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId,
        scheduledAt: new Date(req.body.scheduledAt),
        inspectorName: req.body.inspector,
      }
    });
    res.status(201).json(inspection);
  } catch (err) {
    next(err);
  }
});

// GET /inspections/:id - fetch inspection with findings
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const inspection = await prisma.inspection.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        findings: true,
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, label: true } },
      },
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    res.json(inspection);
  } catch (err) {
    next(err);
  }
});

// POST /inspections/:id/findings - add findings to an inspection
router.post('/:id/findings', requireAuth, async (req, res, next) => {
  try {
    const inspection = await prisma.inspection.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    // parse array of findings
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expecting an array of findings' });
    const findings = [];
    for (const item of req.body) {
      const parsed = findingSchema.safeParse(item);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid finding',
          details: parsed.error.issues,
        });
      }
      findings.push(parsed.data);
    }
    // create many findings
    const created = await prisma.finding.createMany({
      data: findings.map((f) => ({
        inspectionId: inspection.id,
        system: f.system,
        severity: f.severity,
        note: f.note,
        photos: f.photos || null,
      })),
    });
    res.status(201).json({ count: created.count });
  } catch (err) {
    next(err);
  }
});

// POST /inspections/:id/complete - mark inspection as completed,
// compute PCI and generate recommendations
router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const inspection = await prisma.inspection.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: { findings: true }
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    if (inspection.completedAt) return res.status(400).json({ error: 'Inspection already completed' });
    // compute PCI
    const pci = computePCI(inspection.findings);
    // generate recs from findings
    const recs = applyRules(inspection.findings, rules);
    // begin transaction: update inspection, create recommendations
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inspection.update({
        where: { id: inspection.id },
        data: { completedAt: new Date(), overallPCI: pci }
      });
      const createdRecs = [];
      for (const rec of recs) {
        const created = await tx.recommendation.create({
          data: {
            orgId: req.user.orgId,
            findingId: rec.findingId || inspection.findings[0]?.id,
            propertyId: inspection.propertyId,
            summary: rec.summary,
            estHours: rec.estHours,
            estCostAED: rec.estCostAED,
            priority: rec.priority,
            suggestedWithinDays: rec.suggestedWithinDays,
          }
        });
        createdRecs.push(created);
      }
      await tx.property.update({
        where: { id: inspection.propertyId },
        data: { healthScore: pci },
      });
      return { updated, createdRecs };
    });
    res.json({ inspection: result.updated, recommendations: result.createdRecs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;