const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// JOB CONTROLLER
// ============================================

/**
 * Get all jobs with role-based filtering
 */
exports.getJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, priority, propertyId, unitId, assignedToId, filter } = req.query;

    let where = {};

    // Role-based filtering
    if (role === 'PROPERTY_MANAGER') {
      where.property = { managerId: userId };
    } else if (role === 'OWNER') {
      where.property = {
        owners: { some: { ownerId: userId } },
      };
    } else if (role === 'TENANT') {
      const tenantUnits = await prisma.unitTenant.findMany({
        where: { tenantId: userId, isActive: true },
        select: { unitId: true },
      });
      where.unitId = { in: tenantUnits.map(tu => tu.unitId) };
    } else if (role === 'TECHNICIAN') {
      where.assignedToId = userId;
    }

    // Additional filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (propertyId) where.propertyId = propertyId;
    if (unitId) where.unitId = unitId;
    if (assignedToId) where.assignedToId = assignedToId;

    // Special filters
    if (filter === 'overdue') {
      where.status = { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] };
      where.scheduledDate = { lt: new Date() };
    } else if (filter === 'unassigned') {
      where.assignedToId = null;
      where.status = 'OPEN';
    } else if (filter === 'my-jobs' && role === 'TECHNICIAN') {
      where.assignedToId = userId;
    }

    const jobs = await prisma.job.findMany({
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
        serviceRequest: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' },
      ],
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

/**
 * Get a single job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        unit: {
          include: {
            tenants: {
              where: { isActive: true },
              include: {
                tenant: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        serviceRequest: true,
        maintenancePlan: {
          select: {
            id: true,
            name: true,
            frequency: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access
    const hasAccess = await checkJobAccess(userId, role, job);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

/**
 * Create a new job
 */
exports.createJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can create jobs' });
    }

    const {
      title,
      description,
      priority = 'MEDIUM',
      propertyId,
      unitId,
      assignedToId,
      serviceRequestId,
      scheduledDate,
      estimatedCost,
      notes,
    } = req.body;

    // Validation
    if (!title || !description || !propertyId) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, propertyId',
      });
    }

    // Verify property belongs to manager
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify assigned technician if provided
    if (assignedToId) {
      const technician = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!technician || technician.role !== 'TECHNICIAN') {
        return res.status(400).json({ error: 'Invalid technician' });
      }
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        priority,
        propertyId,
        unitId: unitId || null,
        assignedToId: assignedToId || null,
        serviceRequestId: serviceRequestId || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        notes: notes || null,
        status: assignedToId ? 'ASSIGNED' : 'OPEN',
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

    // Update service request if linked
    if (serviceRequestId) {
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: 'CONVERTED_TO_JOB' },
      });

      // Notify requester
      const serviceRequest = await prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        select: { requestedById: true, title: true },
      });

      if (serviceRequest) {
        await prisma.notification.create({
          data: {
            userId: serviceRequest.requestedById,
            type: 'SERVICE_REQUEST_UPDATE',
            title: 'Service Request Converted to Job',
            message: `Your request "${serviceRequest.title}" has been converted to a job and will be addressed soon.`,
            entityType: 'job',
            entityId: job.id,
          },
        });
      }
    }

    // Notify assigned technician
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assigned',
          message: `You have been assigned to job: ${title} at ${property.name}`,
          entityType: 'job',
          entityId: job.id,
        },
      });
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

/**
 * Update a job
 */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check permissions
    const canUpdate =
      (role === 'PROPERTY_MANAGER' && existingJob.property.managerId === userId) ||
      (role === 'TECHNICIAN' && existingJob.assignedToId === userId);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      title,
      description,
      priority,
      status,
      assignedToId,
      scheduledDate,
      estimatedCost,
      actualCost,
      notes,
      evidence,
    } = req.body;

    // Technicians can only update status, notes, evidence, and actual cost
    if (role === 'TECHNICIAN') {
      const allowedUpdates = { status, notes, evidence, actualCost };
      const job = await prisma.job.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(evidence !== undefined && { evidence }),
          ...(actualCost !== undefined && { actualCost: parseFloat(actualCost) }),
          ...(status === 'COMPLETED' && { completedDate: new Date() }),
        },
        include: {
          property: { select: { id: true, name: true, managerId: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Notify manager when completed
      if (status === 'COMPLETED') {
        await prisma.notification.create({
          data: {
            userId: job.property.managerId,
            type: 'JOB_COMPLETED',
            title: 'Job Completed',
            message: `Job "${job.title}" has been completed by ${job.assignedTo?.firstName} ${job.assignedTo?.lastName}`,
            entityType: 'job',
            entityId: job.id,
          },
        });
      }

      return res.json(job);
    }

    // Property managers can update everything
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(assignedToId !== undefined && { 
          assignedToId,
          status: assignedToId && existingJob.status === 'OPEN' ? 'ASSIGNED' : existingJob.status,
        }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(estimatedCost !== undefined && { estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null }),
        ...(actualCost !== undefined && { actualCost: actualCost ? parseFloat(actualCost) : null }),
        ...(notes !== undefined && { notes }),
        ...(evidence !== undefined && { evidence }),
        ...(status === 'COMPLETED' && !existingJob.completedDate && { completedDate: new Date() }),
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

    // Notify if reassigned
    if (assignedToId && assignedToId !== existingJob.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assigned',
          message: `You have been assigned to job: ${job.title}`,
          entityType: 'job',
          entityId: job.id,
        },
      });
    }

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

/**
 * Delete a job (Property Manager only)
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can delete jobs' });
    }

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (existingJob.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot delete completed jobs
    if (existingJob.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot delete completed jobs. Archive them instead.',
      });
    }

    await prisma.job.delete({
      where: { id },
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkJobAccess(userId, role, job) {
  if (role === 'PROPERTY_MANAGER') {
    return job.property.managerId === userId;
  }

  if (role === 'OWNER') {
    const ownership = await prisma.propertyOwner.findFirst({
      where: {
        propertyId: job.propertyId,
        ownerId: userId,
      },
    });
    return !!ownership;
  }

  if (role === 'TENANT' && job.unitId) {
    const tenancy = await prisma.unitTenant.findFirst({
      where: {
        unitId: job.unitId,
        tenantId: userId,
        isActive: true,
      },
    });
    return !!tenancy;
  }

  if (role === 'TECHNICIAN') {
    return job.assignedToId === userId;
  }

  return false;
}
