import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { prisma } from '../config/prismaClient.js';
import { requireAuth, requireRole, isSubscriptionActive } from '../middleware/auth.js';
import { redisDel } from '../config/redisClient.js';

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

    // Build base where clause with filters
    const where = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (category) where.category = category;

    // Add role-based access control
    if (req.user.role === 'PROPERTY_MANAGER') {
      // Property managers see requests for properties they manage
      where.property = { managerId: req.user.id };
    } else if (req.user.role === 'OWNER') {
      // Owners see requests for properties they own
      where.property = {
        owners: {
          some: { ownerId: req.user.id }
        }
      };
    } else if (req.user.role === 'TENANT') {
      // Tenants see only their own requests
      where.requestedById = req.user.id;
    } else if (req.user.role === 'TECHNICIAN') {
      // Technicians see requests for properties they work on
      const assignedJobs = await prisma.job.findMany({
        where: { assignedToId: req.user.id },
        select: { propertyId: true },
        distinct: ['propertyId'],
      });
      const propertyIds = assignedJobs.map(j => j.propertyId).filter(Boolean);

      if (propertyIds.length === 0) {
        // Technician has no assigned jobs, return empty result
        return res.json({
          items: [],
          total: 0,
          page: 1,
          hasMore: false,
        });
      }

      where.propertyId = { in: propertyIds };
    }

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // Fetch service requests and total count in parallel
    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
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
        skip: offset,
        take: limit,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    // Calculate page number and hasMore
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    // Return paginated response
    res.json({
      items: requests,
      total,
      page,
      hasMore,
    });
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
        unit: true,
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

    // Verify property exists and user has access
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owners: {
          select: { ownerId: true },
        },
        manager: {
          select: {
            id: true,
            subscriptionStatus: true,
            trialEndDate: true,
          },
        },
      },
    });
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Verify user has access to create requests for this property
    let hasAccess = false;
    
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = property.managerId === req.user.id;
    } else if (req.user.role === 'OWNER') {
      hasAccess = property.owners.some(o => o.ownerId === req.user.id);
    } else if (req.user.role === 'TENANT') {
      // Verify tenant has active lease for the unit
      if (!unitId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tenants must specify a unit for service requests' 
        });
      }
      
      const tenantUnit = await prisma.unitTenant.findFirst({
        where: {
          unitId: unitId,
          tenantId: req.user.id,
          isActive: true,
        },
        include: {
          unit: {
            select: {
              propertyId: true,
            },
          },
        },
      });
      
      // Verify tenant has lease AND unit belongs to the specified property
      hasAccess = !!tenantUnit && tenantUnit.unit.propertyId === propertyId;
    } else if (req.user.role === 'TECHNICIAN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Technicians cannot create service requests' 
      });
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to create service requests for this property'
      });
    }

    // Verify the relevant subscription is active
    if (req.user.role === 'PROPERTY_MANAGER') {
      if (!isSubscriptionActive(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Your trial period has expired. Please upgrade your plan to continue.',
          code: 'TRIAL_EXPIRED',
        });
      }
    } else {
      const manager = property.manager;

      if (!manager || !isSubscriptionActive(manager)) {
        return res.status(403).json({
          success: false,
          message: 'This property\'s subscription has expired. Please contact your property manager.',
          code: 'MANAGER_SUBSCRIPTION_REQUIRED',
        });
      }
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
    
    // Check if request exists and get full details for access control
    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
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
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }
    
    // Verify user has access to update this request
    let hasAccess = false;
    let allowedFields = [];
    
    if (req.user.role === 'PROPERTY_MANAGER') {
      hasAccess = existing.property.managerId === req.user.id;
      allowedFields = ['status', 'priority', 'title', 'description', 'reviewNotes'];
    } else if (req.user.role === 'OWNER') {
      hasAccess = existing.property.owners.some(o => o.ownerId === req.user.id);
      allowedFields = ['status', 'priority', 'reviewNotes'];
    } else if (req.user.role === 'TENANT') {
      hasAccess = existing.requestedById === req.user.id;
      // Tenants can only update their own requests and only certain fields
      allowedFields = ['title', 'description'];
      
      // Tenants can only update if request is still in SUBMITTED status
      if (existing.status !== 'SUBMITTED') {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update service requests that are still in submitted status' 
        });
      }
    } else if (req.user.role === 'TECHNICIAN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Technicians cannot update service requests directly' 
      });
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to update this service request' 
      });
    }
    
    // Verify requested fields are allowed for this role
    const requestedFields = Object.keys(updates);
    const unauthorizedFields = requestedFields.filter(f => !allowedFields.includes(f));
    
    if (unauthorizedFields.length > 0) {
      return res.status(403).json({ 
        success: false, 
        message: `You can only update the following fields: ${allowedFields.join(', ')}` 
      });
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
    const [job, updatedRequest] = await prisma.$transaction(async (tx) => {
      const createdJob = await tx.job.create({
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
          serviceRequestId: serviceRequest.id,
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

      const updatedServiceRequest = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: 'CONVERTED_TO_JOB',
          reviewNotes: `Converted to job #${createdJob.id}`,
          reviewedAt: new Date(),
        },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return [createdJob, updatedServiceRequest];
    });

    // Invalidate cached property activity snapshots (best-effort)
    if (serviceRequest.propertyId) {
      await Promise.all([
        redisDel(`property:${serviceRequest.propertyId}:activity:20`),
        redisDel(`property:${serviceRequest.propertyId}:activity:50`),
      ]);
    }

    res.json({ success: true, job, serviceRequest: updatedRequest });
  } catch (error) {
    console.error('Error converting service request to job:', error);
    res.status(500).json({ success: false, message: 'Failed to convert service request to job' });
  }
});

export default router;
