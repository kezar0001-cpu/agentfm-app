import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { prisma } from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Service request statuses from Prisma schema
const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CONVERTED_TO_JOB', 'REJECTED', 'COMPLETED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'PEST_CONTROL', 'LANDSCAPING', 'GENERAL', 'OTHER'];

const requestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  photos: z.array(z.string()).optional(),
});

const requestUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  reviewNotes: z.string().optional(),
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, propertyId, category } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (category) where.category = category;
    
    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch service requests' });
  }
});

// GET /:id - Get single service request with full details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await prisma.serviceRequest.findUnique({
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
            owners: {
              select: {
                ownerId: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }
    
    // Access control: Check user has access to property
    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && request.property.managerId === req.user.id ||
      req.user.role === 'OWNER' && request.property.owners.some(o => o.ownerId === req.user.id) ||
      req.user.role === 'TENANT' && request.requestedById === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service request',
    });
  }
});

router.post('/', requireAuth, validate(requestSchema), async (req, res) => {
  try {
    const { propertyId, unitId, title, description, category, priority, photos } = req.body;
    
    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Create service request
    const request = await prisma.serviceRequest.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        status: 'SUBMITTED',
        propertyId,
        unitId: unitId || null,
        requestedById: req.user.id,
        photos: photos || [],
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
      },
    });
    
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ success: false, message: 'Failed to create service request' });
  }
});

router.patch('/:id', requireAuth, validate(requestUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if request exists
    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }
    
    // Prepare update data
    const updateData = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.reviewNotes !== undefined) {
      updateData.reviewNotes = updates.reviewNotes;
      updateData.reviewedAt = new Date();
    }
    
    // Update service request
    const request = await prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
      },
    });
    
    res.json(request);
  } catch (error) {
    console.error('Error updating service request:', error);
    res.status(500).json({ success: false, message: 'Failed to update service request' });
  }
});

// Convert service request to job (PROPERTY_MANAGER only)
router.post('/:id/convert-to-job', requireAuth, requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, assignedToId, estimatedCost, notes } = req.body;
    
    // Get service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        property: true,
        unit: true,
      },
    });
    
    if (!serviceRequest) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }
    
    // Verify assigned user exists if provided
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });
      
      if (!assignedUser) {
        return res.status(404).json({ success: false, message: 'Assigned user not found' });
      }
    }
    
    // Determine job status based on assignment
    const jobStatus = assignedToId ? 'ASSIGNED' : 'OPEN';
    
    // Create job from service request
    const job = await prisma.job.create({
      data: {
        title: serviceRequest.title,
        description: serviceRequest.description,
        status: jobStatus,
        priority: serviceRequest.priority,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        propertyId: serviceRequest.propertyId,
        unitId: serviceRequest.unitId,
        assignedToId: assignedToId || null,
        estimatedCost: estimatedCost || null,
        notes: notes || `Converted from service request #${serviceRequest.id}`,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    
    // Update service request status to converted
    await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        reviewNotes: `Converted to job #${job.id}`,
        reviewedAt: new Date(),
      },
    });
    
    res.json({ success: true, job });
  } catch (error) {
    console.error('Error converting service request to job:', error);
    res.status(500).json({ success: false, message: 'Failed to convert service request to job' });
  }
});

export default router;
