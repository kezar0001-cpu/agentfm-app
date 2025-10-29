import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { generateReport } from '../utils/reportGenerator.js';

const router = express.Router();
router.use(requireAuth);

const reportSchema = z.object({
  reportType: z.enum(['MAINTENANCE_HISTORY', 'UNIT_LEDGER']),
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

// POST /api/reports - Create and generate a new report
router.post('/', async (req, res) => {
  try {
    const payload = reportSchema.parse(req.body);

    // Verify user has access to the property
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

    // If unitId is provided, verify it belongs to the property
    if (payload.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: payload.unitId,
          propertyId: payload.propertyId,
        },
      });

      if (!unit) {
        return res.status(400).json({ success: false, message: 'Unit does not belong to this property' });
      }
    }

    // Create report request
    const reportRequest = await prisma.reportRequest.create({
      data: {
        reportType: payload.reportType,
        parameters: {
          fromDate: payload.fromDate,
          toDate: payload.toDate,
        },
        propertyId: payload.propertyId,
        unitId: payload.unitId,
        requestedById: req.user.id,
        status: 'PROCESSING',
      },
    });

    // Generate report immediately
    try {
      const reportData = await generateReport(reportRequest, property);
      
      // Update report with generated data
      const completedReport = await prisma.reportRequest.update({
        where: { id: reportRequest.id },
        data: {
          status: 'COMPLETED',
          fileUrl: reportData.url,
        },
        include: {
          property: { select: { id: true, name: true, address: true } },
          unit: { select: { id: true, unitNumber: true } },
        },
      });

      res.status(201).json({ success: true, report: completedReport });
    } catch (genError) {
      // Mark report as failed
      await prisma.reportRequest.update({
        where: { id: reportRequest.id },
        data: { status: 'FAILED' },
      });
      throw genError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Failed to create report request:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// GET /api/reports - Get all report requests
router.get('/', async (req, res) => {
  try {
    // Build where clause based on user role
    const where = {};
    
    if (req.user.role === 'PROPERTY_MANAGER') {
      // Property managers see reports for their properties
      where.property = {
        managerId: req.user.id,
      };
    } else if (req.user.role === 'OWNER') {
      // Owners see reports for properties they own
      where.property = {
        owners: {
          some: {
            ownerId: req.user.id,
          },
        },
      };
    } else if (req.user.role === 'TENANT') {
      // Tenants see only their own reports
      where.requestedById = req.user.id;
    } else {
      // Other roles see their own reports
      where.requestedById = req.user.id;
    }
    
    const reports = await prisma.reportRequest.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, unitNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Failed to fetch report requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id/data - Get report data (for viewing)
router.get('/:id/data', async (req, res) => {
  try {
    const report = await prisma.reportRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          include: {
            owners: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Check access
    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && report.property.managerId === req.user.id ||
      req.user.role === 'OWNER' && report.property.owners.some(o => o.ownerId === req.user.id) ||
      report.requestedById === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (report.status !== 'COMPLETED') {
      return res.status(425).json({ success: false, message: 'Report is not ready yet.' });
    }

    // Regenerate report data (in production, this would be cached/stored)
    const reportData = await generateReport(report, report.property);
    
    res.json({ success: true, data: reportData.data });
  } catch (error) {
    console.error('Failed to fetch report data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report data' });
  }
});

// GET /api/reports/:id/download - Download a completed report
router.get('/:id/download', async (req, res) => {
  try {
    const report = await prisma.reportRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          include: {
            owners: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Check access
    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && report.property.managerId === req.user.id ||
      req.user.role === 'OWNER' && report.property.owners.some(o => o.ownerId === req.user.id) ||
      report.requestedById === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (report.status !== 'COMPLETED') {
      return res.status(425).json({ success: false, message: 'Report is not ready yet.' });
    }

    if (!report.fileUrl) {
      return res.status(500).json({ success: false, message: 'Report file is missing.' });
    }

    // In a real app, you would redirect to the fileUrl or stream the file
    res.json({ success: true, message: 'Report downloaded (placeholder)', url: report.fileUrl });
  } catch (error) {
    console.error('Failed to download report:', error);
    res.status(500).json({ success: false, message: 'Failed to download report' });
  }
});

export default router;
