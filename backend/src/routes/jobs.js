import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { requireAuth, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import { prisma } from '../config/prismaClient.js';
import { notifyJobAssigned, notifyJobCompleted, notifyJobStarted, notifyJobReassigned } from '../utils/notificationService.js';

const router = express.Router();

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const jobCreateSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledDate must be a valid ISO date string',
    }),
  assignedToId: z.string().optional(),
  estimatedCost: z.number().optional(),
  notes: z.string().optional(),
});

const jobUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'scheduledDate must be a valid ISO date string',
    }),
  assignedToId: z.string().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET / - List jobs (role-based filtering)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, propertyId, assignedToId } = req.query;

    // Build where clause based on filters and user role
    const where = {};

    // Role-based filtering
    if (req.user.role === 'TECHNICIAN') {
      // Technicians only see jobs assigned to them
      where.assignedToId = req.user.id;
    } else if (req.user.role === 'PROPERTY_MANAGER') {
      // Property managers see jobs for their properties
      where.property = {
        managerId: req.user.id,
      };
    } else if (req.user.role === 'OWNER') {
      // Owners see jobs for properties they own
      where.property = {
        owners: {
          some: {
            ownerId: req.user.id,
          },
        },
      };
    }

    // Apply query filters
    if (status) {
      where.status = status;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (assignedToId && (req.user.role === 'PROPERTY_MANAGER' || req.user.role === 'OWNER')) {
      // Only managers and owners can filter by assignedToId
      where.assignedToId = assignedToId;
    }

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // Fetch jobs and total count in parallel
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
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
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    // Calculate page number and hasMore
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    // Return paginated response
    res.json({
      items: jobs,
      total,
      page,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});

// POST / - Create job (PROPERTY_MANAGER only, requires active subscription)
router.post('/', requireAuth, requireRole('PROPERTY_MANAGER'), requireActiveSubscription, validate(jobCreateSchema), async (req, res) => {
  try {
    const { propertyId, unitId, title, description, priority, scheduledDate, assignedToId, estimatedCost, notes } = req.body;
    
    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Verify unit exists if provided
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
      });
      
      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }
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
    
    // Create job
    const job = await prisma.job.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        propertyId,
        unitId: unitId || null,
        assignedToId: assignedToId || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost: estimatedCost || null,
        notes: notes || null,
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
    
    // Send notification if job is assigned
    if (job.assignedToId && job.assignedTo) {
      try {
        await notifyJobAssigned(job, job.assignedTo, job.property);
      } catch (notifError) {
        console.error('Failed to send job assignment notification:', notifError);
        // Don't fail the job creation if notification fails
      }
    }
    
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ success: false, message: 'Failed to create job' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await prisma.job.findUnique({
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
              select: { ownerId: true },
            },
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
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Access control: Check user has permission to view this job
    let hasAccess = false;
    
    if (req.user.role === 'PROPERTY_MANAGER') {
      // Property managers can view jobs for properties they manage
      hasAccess = job.property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      // Owners can view jobs for properties they own
      hasAccess = job.property.owners?.some(o => o.ownerId === req.user.id);
    } else if (req.user.role === 'TECHNICIAN') {
      // Technicians can view jobs assigned to them
      hasAccess = job.assignedToId === req.user.id;
    } else if (req.user.role === 'TENANT') {
      // Tenants cannot view jobs directly (they use service requests)
      hasAccess = false;
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You do not have permission to view this job.' 
      });
    }
    
    // Remove sensitive fields before sending response
    const { property, ...jobData } = job;
    const { managerId, owners, ...propertyData } = property;
    
    res.json({
      ...jobData,
      property: propertyData,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job' });
  }
});

// PATCH /:id - Update job (PROPERTY_MANAGER and TECHNICIAN can update)
router.patch('/:id', requireAuth, requireRole('PROPERTY_MANAGER', 'TECHNICIAN'), validate(jobUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        property: true,
      },
    });
    
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Access control: Technicians can only update jobs assigned to them
    if (req.user.role === 'TECHNICIAN') {
      if (existingJob.assignedToId !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update jobs assigned to you' 
        });
      }
      
      // Technicians can only update status, notes, and evidence
      const allowedFields = ['status', 'notes', 'actualCost', 'evidence'];
      const requestedFields = Object.keys(updates);
      const unauthorizedFields = requestedFields.filter(f => !allowedFields.includes(f));
      
      if (unauthorizedFields.length > 0) {
        return res.status(403).json({ 
          success: false, 
          message: `Technicians can only update: ${allowedFields.join(', ')}` 
        });
      }
    }
    
    // Property managers can only update jobs for their properties
    if (req.user.role === 'PROPERTY_MANAGER') {
      if (existingJob.property.managerId !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update jobs for your properties' 
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.scheduledDate !== undefined) {
      updateData.scheduledDate = updates.scheduledDate ? new Date(updates.scheduledDate) : null;
    }
    if (updates.assignedToId !== undefined) updateData.assignedToId = updates.assignedToId;
    if (updates.estimatedCost !== undefined) updateData.estimatedCost = updates.estimatedCost;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    // If status is being set to COMPLETED, set completedDate
    if (updates.status === 'COMPLETED' && !existingJob.completedDate) {
      updateData.completedDate = new Date();
    }
    
    // Update job
    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            managerId: true,
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
    
    // Send notifications for various events
    try {
      // Job assignment notification
      if (updates.assignedToId !== undefined && updates.assignedToId !== existingJob.assignedToId) {
        if (updates.assignedToId && job.assignedTo) {
          // New assignment or reassignment
          if (existingJob.assignedToId) {
            // Reassignment - notify both old and new technician
            const previousTechnician = await prisma.user.findUnique({
              where: { id: existingJob.assignedToId },
              select: { id: true, firstName: true, lastName: true, email: true },
            });
            if (previousTechnician) {
              await notifyJobReassigned(job, previousTechnician, job.assignedTo, job.property);
            }
          } else {
            // New assignment
            await notifyJobAssigned(job, job.assignedTo, job.property);
          }
        }
      }
      
      // Job completion notification
      if (updates.status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
        // Notify property manager
        if (job.property.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: job.property.managerId },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
          
          const technician = job.assignedTo || { firstName: 'Unknown', lastName: 'Technician' };
          
          if (manager) {
            await notifyJobCompleted(job, technician, job.property, manager);
          }
        }
      }
      
      // Job started notification
      if (updates.status === 'IN_PROGRESS' && existingJob.status !== 'IN_PROGRESS') {
        if (job.property.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: job.property.managerId },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
          
          if (manager) {
            await notifyJobStarted(job, job.property, manager);
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send job notification:', notifError);
      // Don't fail the job update if notification fails
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ success: false, message: 'Failed to update job' });
  }
});

// DELETE /:id - Delete job (PROPERTY_MANAGER only)
router.delete('/:id', requireAuth, requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id },
    });
    
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Delete job
    await prisma.job.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ success: false, message: 'Failed to delete job' });
  }
});

// ========================================
// JOB COMMENTS
// ========================================

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
});

// GET /:id/comments - Get all comments for a job
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job exists and user has access
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            managerId: true,
            owners: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Check access based on role
    const hasAccess = 
      req.user.role === 'PROPERTY_MANAGER' && job.property?.managerId === req.user.id ||
      req.user.role === 'TECHNICIAN' && job.assignedToId === req.user.id ||
      req.user.role === 'OWNER' && job.property?.owners.some(o => o.ownerId === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Fetch comments
    const comments = await prisma.jobComment.findMany({
      where: { jobId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching job comments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

// POST /:id/comments - Add a comment to a job
router.post('/:id/comments', requireAuth, validate(commentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    // Check if job exists and user has access
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            managerId: true,
            owners: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Check access based on role
    const hasAccess = 
      req.user.role === 'PROPERTY_MANAGER' && job.property?.managerId === req.user.id ||
      req.user.role === 'TECHNICIAN' && job.assignedToId === req.user.id ||
      req.user.role === 'OWNER' && job.property?.owners.some(o => o.ownerId === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Create comment
    const comment = await prisma.jobComment.create({
      data: {
        jobId: id,
        userId: req.user.id,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
    
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Error creating job comment:', error);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
});

export default router;
