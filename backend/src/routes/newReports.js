import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth, requirePropertyManagerSubscription } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const financialReportSchema = z.object({
  propertyId: z.string().min(1),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

const occupancyReportSchema = z.object({
  propertyId: z.string().min(1),
});

const maintenanceReportSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

const tenantReportSchema = z.object({
  propertyId: z.string().min(1),
});

const handleReportRequest = async (req, res, schema, reportGenerator) => {
  try {
    const payload = schema.parse(req.body);

    const property = await prisma.property.findUnique({
      where: { id: payload.propertyId },
      include: {
        owners: { select: { ownerId: true } },
      },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && property.managerId === req.user.id ||
      req.user.role === 'OWNER' && property.owners.some(o => o.ownerId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const reportData = await reportGenerator(payload, property);

    res.status(200).json({ success: true, report: reportData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(`Failed to create report:`, error);
    res.status(500).json({ success: false, message: `Failed to generate report` });
  }
};

router.post('/financial', requirePropertyManagerSubscription, (req, res) => {
  handleReportRequest(req, res, financialReportSchema, (payload, property) => {
    return {
      title: 'Financial Report',
      property: property.name,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
    };
  });
});

router.post('/occupancy', requirePropertyManagerSubscription, (req, res) => {
  handleReportRequest(req, res, occupancyReportSchema, (payload, property) => {
    return {
      title: 'Occupancy Report',
      property: property.name,
    };
  });
});

router.post('/maintenance', requirePropertyManagerSubscription, (req, res) => {
  handleReportRequest(req, res, maintenanceReportSchema, (payload, property) => {
    return {
      title: 'Maintenance Report',
      property: property.name,
      unitId: payload.unitId,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
    };
  });
});

router.post('/tenant', requirePropertyManagerSubscription, (req, res) => {
  handleReportRequest(req, res, tenantReportSchema, (payload, property) => {
    return {
      title: 'Tenant Report',
      property: property.name,
    };
  });
});

export default router;
