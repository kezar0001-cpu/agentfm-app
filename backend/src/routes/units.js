import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All unit routes require authentication
router.use(requireAuth);

const moveInSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseStart: z.string().min(1, 'Lease start date is required'),
  leaseEnd: z.string().min(1, 'Lease end date is required'),
  rentAmount: z.number().min(1, 'Rent amount is required'),
  depositAmount: z.number().min(0, 'Deposit amount is required'),
});

const moveOutSchema = z.object({
  moveOutDate: z.string().min(1, 'Move out date is required'),
});

// POST /units/:id/move-in - Start the move-in process
router.post('/:id/move-in', requireRole(['PROPERTY_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { step, ...data } = req.body;

    switch (step) {
      case 0: // Invite Tenant and Create Lease
        const moveInSchema = z.object({
          tenantId: z.string().min(1, 'Tenant is required'),
          leaseStart: z.string().min(1, 'Lease start date is required'),
          leaseEnd: z.string().min(1, 'Lease end date is required'),
          rentAmount: z.number().min(1, 'Rent amount is required'),
          depositAmount: z.number().min(0, 'Deposit amount is required'),
        });
        const parsedData = moveInSchema.parse(data);

        await prisma.unit.update({
          where: { id },
          data: { status: 'PENDING_MOVE_IN' },
        });

        await prisma.unitTenant.create({
          data: {
            unitId: id,
            tenantId: parsedData.tenantId,
            leaseStart: new Date(parsedData.leaseStart),
            leaseEnd: new Date(parsedData.leaseEnd),
            rentAmount: parsedData.rentAmount,
            depositAmount: parsedData.depositAmount,
            isActive: false,
          },
        });

        res.status(200).json({ message: 'Tenant invited and lease created' });
        break;

      case 1: // Schedule Move-in Inspection
        const inspectionSchema = z.object({
          inspectionDate: z.string().min(1, 'Inspection date is required'),
        });
        const parsedInspectionData = inspectionSchema.parse(data);

        const unit = await prisma.unit.findUnique({ where: { id } });

        await prisma.inspection.create({
          data: {
            title: `Move-in inspection for Unit ${unit.unitNumber}`,
            type: 'MOVE_IN',
            scheduledDate: new Date(parsedInspectionData.inspectionDate),
            propertyId: unit.propertyId,
            unitId: id,
            status: 'SCHEDULED',
          },
        });

        res.status(200).json({ message: 'Move-in inspection scheduled' });
        break;

      case 4: // Activate Lease
        const lease = await prisma.unitTenant.findFirst({
          where: { unitId: id, isActive: false },
        });

        await prisma.unitTenant.update({
          where: { id: lease.id },
          data: { isActive: true },
        });

        await prisma.unit.update({
          where: { id },
          data: { status: 'OCCUPIED' },
        });

        res.status(200).json({ message: 'Lease activated and move-in complete' });
        break;

      default:
        res.status(400).json({ message: 'Invalid step' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.flatten() });
    }
    console.error('Move-in error:', error);
    res.status(500).json({ message: 'Failed to process move-in step' });
  }
});

// POST /units/:id/move-out - Start the move-out process
router.post('/:id/move-out', requireRole(['PROPERTY_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { step, ...data } = req.body;

    switch (step) {
      case 0: // Give Notice
        const moveOutSchema = z.object({
          moveOutDate: z.string().min(1, 'Move out date is required'),
        });
        const parsedData = moveOutSchema.parse(data);

        await prisma.unit.update({
          where: { id },
          data: { status: 'PENDING_MOVE_OUT' },
        });

        res.status(200).json({ message: 'Notice given' });
        break;

      case 1: // Schedule Move-out Inspection
        const inspectionSchema = z.object({
          inspectionDate: z.string().min(1, 'Inspection date is required'),
        });
        const parsedInspectionData = inspectionSchema.parse(data);

        const unit = await prisma.unit.findUnique({ where: { id } });

        await prisma.inspection.create({
          data: {
            title: `Move-out inspection for Unit ${unit.unitNumber}`,
            type: 'MOVE_OUT',
            scheduledDate: new Date(parsedInspectionData.inspectionDate),
            propertyId: unit.propertyId,
            unitId: id,
            status: 'SCHEDULED',
          },
        });

        res.status(200).json({ message: 'Move-out inspection scheduled' });
        break;

      case 5: // Mark Unit AVAILABLE
        await prisma.unit.update({
          where: { id },
          data: { status: 'AVAILABLE' },
        });

        const lease = await prisma.unitTenant.findFirst({
          where: { unitId: id, isActive: true },
        });

        await prisma.unitTenant.update({
          where: { id: lease.id },
          data: { isActive: false },
        });

        res.status(200).json({ message: 'Unit marked as available and move-out complete' });
        break;

      default:
        res.status(400).json({ message: 'Invalid step' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.flatten() });
    }
    console.error('Move-out error:', error);
    res.status(500).json({ message: 'Failed to process move-out step' });
  }
});

export default router;