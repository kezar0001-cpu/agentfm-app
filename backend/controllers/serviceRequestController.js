const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// SERVICE REQUEST CONTROLLER
// ============================================

/**
 * Get all service requests with role-based filtering
 */
exports.getServiceRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, category, propertyId, priority } = req.query;

    let where = {};

    // Role-based filtering
    if (role === 'PROPERTY_MANAGER') {
      where.property = { managerId: userId };
    } else if (role === 'OWNER') {
      where.property = {
        owners: { some: { ownerId: userId } },
      };
    } else if (role === 'TENANT') {
      where.requestedById = userId;
    }

    // Additional filters
    if (status) where.status = status;
    if (category) where.category = category;
    if (propertyId) where.propertyId = propertyId;
    if (priority) where.priority = priority;

    const serviceRequests = await prisma.serviceRequest.findMany({
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(serviceRequests);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ error: 'Failed to fetch service requests' });
  }
};

/**
 * Get a single service request by ID
 */
exports.getServiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const serviceRequest = await prisma.serviceRequest.findUnique({
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        jobs: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Check access
    const hasAccess = await checkServiceRequestAccess(userId, role, serviceRequest);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(serviceRequest);
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({ error: 'Failed to fetch service request' });
  }
};

/**
 * Create a new service request (Tenant or Manager)
 */
exports.createServiceRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const {
      title,
      description,
      category,
      priority = 'MEDIUM',
      propertyId,
      unitId,
      photos,
    } = req.body;

    // Validation
    if (!title || !description || !category || !propertyId) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, category, propertyId',
      });
    }

    // Verify access to property/unit
    if (role === 'TENANT') {
      // Tenants can only create requests for their units
      if (!unitId) {
        return res.status(400).json({ error: 'Unit ID is required for tenants' });
      }

      const tenancy = await prisma.unitTenant.findFirst({
        where: {
          unitId,
          tenantId: userId,
          isActive: true,
        },
      });

      if (!tenancy) {
        return res.status(403).json({ error: 'You do not have access to this unit' });
      }
    } else if (role === 'PROPERTY_MANAGER') {
      // Managers can create requests for their properties
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property || property.managerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      return res.status(403).json({ error: 'Only tenants and managers can create service requests' });
    }

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        title,
        description,
        category,
        priority,
        propertyId,
        unitId: unitId || null,
        requestedById: userId,
        photos: photos || null,
        status: 'SUBMITTED',
      },
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify property manager
    if (role === 'TENANT') {
      await prisma.notification.create({
        data: {
          userId: serviceRequest.property.managerId,
          type: 'SERVICE_REQUEST_UPDATE',
          title: 'New Service Request',
          message: `${serviceRequest.requestedBy.firstName} ${serviceRequest.requestedBy.lastName} submitted a ${category} request at ${serviceRequest.property.name}`,
          entityType: 'service_request',
          entityId: serviceRequest.id,
        },
      });
    }

    res.status(201).json(serviceRequest);
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ error: 'Failed to create service request' });
  }
};

/**
 * Update a service request (Manager review/response)
 */
exports.updateServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const existingRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Only property manager can update
    if (role !== 'PROPERTY_MANAGER' || existingRequest.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, reviewNotes, priority } = req.body;

    const serviceRequest = await prisma.serviceRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(priority && { priority }),
        ...(status && status !== 'SUBMITTED' && { reviewedAt: new Date() }),
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify requester of status change
    if (status && status !== existingRequest.status) {
      let message = '';
      switch (status) {
        case 'UNDER_REVIEW':
          message = 'Your service request is now under review';
          break;
        case 'APPROVED':
          message = 'Your service request has been approved and will be addressed soon';
          break;
        case 'REJECTED':
          message = 'Your service request has been rejected';
          break;
        case 'COMPLETED':
          message = 'Your service request has been completed';
          break;
        default:
          message = `Your service request status has been updated to ${status}`;
      }

      await prisma.notification.create({
        data: {
          userId: serviceRequest.requestedById,
          type: 'SERVICE_REQUEST_UPDATE',
          title: 'Service Request Update',
          message: `${message}: "${serviceRequest.title}"`,
          entityType: 'service_request',
          entityId: serviceRequest.id,
        },
      });
    }

    res.json(serviceRequest);
  } catch (error) {
    console.error('Error updating service request:', error);
    res.status(500).json({ error: 'Failed to update service request' });
  }
};

/**
 * Convert service request to job (Manager only)
 */
exports.convertToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can convert to jobs' });
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    if (serviceRequest.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (serviceRequest.status === 'CONVERTED_TO_JOB') {
      return res.status(400).json({ error: 'Service request already converted to job' });
    }

    const { assignedToId, scheduledDate, estimatedCost } = req.body;

    // Create job
    const job = await prisma.job.create({
      data: {
        title: serviceRequest.title,
        description: serviceRequest.description,
        priority: serviceRequest.priority,
        propertyId: serviceRequest.propertyId,
        unitId: serviceRequest.unitId,
        serviceRequestId: serviceRequest.id,
        assignedToId: assignedToId || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        status: assignedToId ? 'ASSIGNED' : 'OPEN',
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update service request
    await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'CONVERTED_TO_JOB',
        reviewedAt: new Date(),
      },
    });

    // Notify requester
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

    // Notify assigned technician
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assigned',
          message: `You have been assigned to job: ${job.title} at ${job.property.name}`,
          entityType: 'job',
          entityId: job.id,
        },
      });
    }

    res.json({ job, serviceRequest });
  } catch (error) {
    console.error('Error converting to job:', error);
    res.status(500).json({ error: 'Failed to convert to job' });
  }
};

/**
 * Delete a service request
 */
exports.deleteServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const existingRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { property: true, jobs: true },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Can delete if: requester (if submitted) OR property manager
    const canDelete =
      (role === 'TENANT' && existingRequest.requestedById === userId && existingRequest.status === 'SUBMITTED') ||
      (role === 'PROPERTY_MANAGER' && existingRequest.property.managerId === userId);

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot delete if converted to job
    if (existingRequest.jobs.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete service request that has been converted to a job',
      });
    }

    await prisma.serviceRequest.delete({
      where: { id },
    });

    res.json({ message: 'Service request deleted successfully' });
  } catch (error) {
    console.error('Error deleting service request:', error);
    res.status(500).json({ error: 'Failed to delete service request' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkServiceRequestAccess(userId, role, serviceRequest) {
  if (role === 'PROPERTY_MANAGER') {
    return serviceRequest.property.managerId === userId;
  }

  if (role === 'OWNER') {
    const ownership = await prisma.propertyOwner.findFirst({
      where: {
        propertyId: serviceRequest.propertyId,
        ownerId: userId,
      },
    });
    return !!ownership;
  }

  if (role === 'TENANT') {
    return serviceRequest.requestedById === userId;
  }

  return false;
}
