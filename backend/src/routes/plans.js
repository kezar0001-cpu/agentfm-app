import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  propertyId: z.string().min(1, 'Property ID is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  description: z.string().optional(),
  nextDueDate: z.string().optional(),
  autoCreateJobs: z.boolean().optional(),
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { propertyId } = req.query;
    
    const where = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }
    
    const plans = await prisma.maintenancePlan.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        nextDueDate: 'asc',
      },
    });
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching maintenance plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance plans' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message || 'Invalid request' });
    }
    
    const { name, propertyId, frequency, description, nextDueDate, autoCreateJobs } = parsed.data;
    
    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Create maintenance plan
    const plan = await prisma.maintenancePlan.create({
      data: {
        name,
        propertyId,
        frequency,
        description: description || null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(),
        autoCreateJobs: autoCreateJobs || false,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating maintenance plan:', error);
    res.status(500).json({ success: false, message: 'Failed to create maintenance plan' });
  }
});

export default router;
