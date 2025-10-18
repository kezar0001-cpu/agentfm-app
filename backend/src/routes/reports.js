import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const reportSchema = z.object({
  reportType: z.enum(['MAINTENANCE_HISTORY', 'UNIT_LEDGER']),
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

// POST /api/reports - Create a new report request
router.post('/', async (req, res) => {
  try {
    const payload = reportSchema.parse(req.body);

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
        status: 'PENDING',
      },
    });

    // In a real app, you would trigger a background job here.
    // For now, we'll just return the created request.

    res.status(202).json(reportRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Failed to create report request:', error);
    res.status(500).json({ success: false, message: 'Failed to queue report request' });
  }
});

// GET /api/reports - Get all report requests
router.get('/', async (req, res) => {
  try {
    const reports = await prisma.reportRequest.findMany({
      where: {
        requestedBy: {
          orgId: req.user.orgId,
        },
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
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

// GET /api/reports/:id/download - Download a completed report
router.get('/:id/download', async (req, res) => {
  try {
    const report = await prisma.reportRequest.findFirst({
      where: {
        id: req.params.id,
        requestedBy: {
          orgId: req.user.orgId,
        },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
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
