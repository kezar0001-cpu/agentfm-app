import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const FREQUENCIES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY'];

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  propertyId: z.string().min(1, 'Property ID is required'),
  frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: 'Invalid frequency' }) }),
  description: z.string().optional(),
  nextDueDate: z.string().optional(),
  autoCreateJobs: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const planUpdateSchema = z.object({
  name: z.string().min(1, 'Plan name is required').optional(),
  frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: 'Invalid frequency' }) }).optional(),
  description: z.string().optional().nullable(),
  nextDueDate: z.string().optional(),
  autoCreateJobs: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Helper to build where clause based on user role
const buildWhereClause = (userId, userRole, filters = {}) => {
  const where = {};

  // Role-based filtering
  if (userRole === 'TECHNICIAN') {
    // Technicians see plans for properties where they have assigned jobs
    where.property = {
      jobs: {
        some: {
          assignedToId: userId,
        },
      },
    };
  } else if (userRole === 'PROPERTY_MANAGER') {
    // Property managers see plans for their properties
    where.property = {
      managerId: userId,
    };
  } else if (userRole === 'OWNER') {
    // Owners see plans for properties they own
    where.property = {
      owners: {
        some: {
          ownerId: userId,
        },
      },
    };
  }

  // Apply additional filters
  if (filters.propertyId) {
    where.propertyId = filters.propertyId;
  }
  if (filters.frequency) {
    where.frequency = filters.frequency;
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  return where;
};

// Helper to verify user has access to a property
const verifyPropertyAccess = async (propertyId, userId, userRole) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      owners: {
        where: { ownerId: userId },
        select: { ownerId: true },
      },
    },
  });

  if (!property) {
    return { hasAccess: false, error: 'Property not found' };
  }

  // Check access based on role
  if (userRole === 'PROPERTY_MANAGER' && property.managerId !== userId) {
    return { hasAccess: false, error: 'You do not have permission to access this property' };
  }

  if (userRole === 'OWNER' && property.owners.length === 0) {
    return { hasAccess: false, error: 'You do not have permission to access this property' };
  }

  return { hasAccess: true, property };
};

// GET / - List all maintenance plans (with role-based filtering)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { propertyId, frequency, isActive, search } = req.query;

    const where = buildWhereClause(req.user.id, req.user.role, {
      propertyId,
      frequency,
      isActive,
    });

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const plans = await prisma.maintenancePlan.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            jobs: true,
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

// GET /:id - Get a single maintenance plan with related jobs
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            managerId: true,
          },
          include: {
            owners: {
              select: {
                ownerId: true,
              },
            },
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            scheduledDate: true,
            createdAt: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Last 10 jobs
        },
      },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Maintenance plan not found' });
    }

    // Verify user has access
    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && plan.property.managerId === req.user.id ||
      req.user.role === 'OWNER' && plan.property.owners.some(o => o.ownerId === req.user.id) ||
      req.user.role === 'TECHNICIAN'; // Technicians can view all plans

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this plan' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching maintenance plan:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance plan' });
  }
});

// POST / - Create a new maintenance plan
router.post('/', requireAuth, requireRole(['PROPERTY_MANAGER']), async (req, res) => {
  try {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message || 'Invalid request' });
    }

    const { name, propertyId, frequency, description, nextDueDate, autoCreateJobs, isActive } = parsed.data;

    // Verify property exists and user has access
    const { hasAccess, error, property } = await verifyPropertyAccess(propertyId, req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(property ? 403 : 404).json({ success: false, message: error });
    }

    // Create maintenance plan
    const plan = await prisma.maintenancePlan.create({
      data: {
        name,
        propertyId,
        frequency,
        description: description || null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(),
        autoCreateJobs: autoCreateJobs ?? false,
        isActive: isActive ?? true,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            jobs: true,
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

// PATCH /:id - Update a maintenance plan
router.patch('/:id', requireAuth, requireRole(['PROPERTY_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = planUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message || 'Invalid request' });
    }

    // Check if plan exists and user has access
    const existingPlan = await prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            managerId: true,
          },
        },
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ success: false, message: 'Maintenance plan not found' });
    }

    // Verify user has access
    if (req.user.role === 'PROPERTY_MANAGER' && existingPlan.property.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this plan' });
    }

    const { name, frequency, description, nextDueDate, autoCreateJobs, isActive } = parsed.data;

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (description !== undefined) updateData.description = description;
    if (nextDueDate !== undefined) updateData.nextDueDate = new Date(nextDueDate);
    if (autoCreateJobs !== undefined) updateData.autoCreateJobs = autoCreateJobs;
    if (isActive !== undefined) updateData.isActive = isActive;

    const plan = await prisma.maintenancePlan.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    res.json(plan);
  } catch (error) {
    console.error('Error updating maintenance plan:', error);
    res.status(500).json({ success: false, message: 'Failed to update maintenance plan' });
  }
});

// DELETE /:id - Delete a maintenance plan
router.delete('/:id', requireAuth, requireRole(['PROPERTY_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan exists and user has access
    const existingPlan = await prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            managerId: true,
          },
        },
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ success: false, message: 'Maintenance plan not found' });
    }

    // Verify user has access
    if (req.user.role === 'PROPERTY_MANAGER' && existingPlan.property.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this plan' });
    }

    await prisma.maintenancePlan.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Maintenance plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance plan:', error);
    res.status(500).json({ success: false, message: 'Failed to delete maintenance plan' });
  }
});

export default router;
