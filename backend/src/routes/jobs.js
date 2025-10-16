import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

const STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const jobCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  unitId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

const jobUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  actualStart: z.string().datetime().optional().nullable(),
  actualEnd: z.string().datetime().optional().nullable(),
});

// GET /api/jobs - Get all jobs
router.get('/', async (req, res) => {
  try {
    const { status, propertyId, assignedToId } = req.query;

    const where = {};

    // Filter by organization through property
    if (req.user.role === 'TECHNICIAN') {
      // Technicians see only their assigned jobs
      where.assignedToId = req.user.id;
    } else {
      // Admins/managers see all jobs for their org
      // We need to join through property to check orgId
      // For now, we'll fetch all and filter (not ideal for large datasets)
    }

    if (status) {
      where.status = status;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledStart: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Filter by orgId if not a technician
    let filteredJobs = jobs;
    if (req.user.role !== 'TECHNICIAN') {
      const orgProperties = await prisma.property.findMany({
        where: { orgId: req.user.orgId },
        select: { id: true }
      });
      const propertyIds = new Set(orgProperties.map(p => p.id));
      filteredJobs = jobs.filter(job => propertyIds.has(job.propertyId));
    }

    res.json({ 
      success: true, 
      jobs: filteredJobs 
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch jobs' 
    });
  }
});

// POST /api/jobs - Create a new job
router.post('/', async (req, res) => {
  try {
    const parsed = jobCreateSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: parsed.error.errors
      });
    }

    const { propertyId, unitId, assignedToId, ...jobData } = parsed.data;

    // Verify property exists and user has access
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found or access denied' 
      });
    }

    // Verify unit if provided
    if (unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId,
          propertyId
        }
      });

      if (!unit) {
        return res.status(404).json({ 
          success: false, 
          message: 'Unit not found' 
        });
      }
    }

    // Verify assigned user if provided
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      });

      if (!assignedUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Assigned user not found' 
        });
      }

      // Check if user is a technician or admin
      if (!['TECHNICIAN', 'ADMIN', 'PROPERTY_MANAGER'].includes(assignedUser.role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Can only assign jobs to technicians, admins, or property managers' 
        });
      }
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        ...jobData,
        propertyId,
        unitId: unitId || null,
        assignedToId: assignedToId || null,
        createdById: req.user.id,
        status: assignedToId ? 'ASSIGNED' : 'PENDING'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      job 
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create job' 
    });
  }
});

// GET /api/jobs/:id - Get a specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Verify user has access (through property orgId)
    const property = await prisma.property.findFirst({
      where: {
        id: job.propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property && req.user.role !== 'TECHNICIAN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Technicians can only see their own jobs
    if (req.user.role === 'TECHNICIAN' && job.assignedToId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({ 
      success: true, 
      job 
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch job' 
    });
  }
});

// PATCH /api/jobs/:id - Update a job
router.patch('/:id', async (req, res) => {
  try {
    const parsed = jobUpdateSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: parsed.error.errors
      });
    }

    // Find existing job
    const existingJob = await prisma.job.findUnique({
      where: { id: req.params.id }
    });

    if (!existingJob) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Verify user has access
    const property = await prisma.property.findFirst({
      where: {
        id: existingJob.propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property && req.user.role !== 'TECHNICIAN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Technicians can only update their own jobs
    if (req.user.role === 'TECHNICIAN' && existingJob.assignedToId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Verify assigned user if being changed
    if (parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== null) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId }
      });

      if (!assignedUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Assigned user not found' 
        });
      }
    }

    // Update the job
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      job 
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update job' 
    });
  }
});

// DELETE /api/jobs/:id - Delete a job
router.delete('/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Verify user has access
    const property = await prisma.property.findFirst({
      where: {
        id: job.propertyId,
        orgId: req.user.orgId
      }
    });

    if (!property) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Don't allow deletion of completed jobs
    if (job.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed jobs. Consider cancelling instead.'
      });
    }

    await prisma.job.delete({
      where: { id: req.params.id }
    });

    res.json({ 
      success: true, 
      message: 'Job deleted successfully' 
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete job' 
    });
  }
});

export default router;
