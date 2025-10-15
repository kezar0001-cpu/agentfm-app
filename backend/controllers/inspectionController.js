const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// INSPECTION CONTROLLER
// ============================================

/**
 * Get all inspections with role-based filtering
 */
exports.getInspections = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, propertyId, unitId, dateFrom, dateTo, assignedToId } = req.query;

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
    if (propertyId) where.propertyId = propertyId;
    if (unitId) where.unitId = unitId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lte = new Date(dateTo);
    }

    const inspections = await prisma.inspection.findMany({
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
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        report: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    res.json(inspections);
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
};

/**
 * Get a single inspection by ID
 */
exports.getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const inspection = await prisma.inspection.findUnique({
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
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        report: true,
      },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check access
    const hasAccess = await checkInspectionAccess(userId, role, inspection);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(inspection);
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
};

/**
 * Create a new inspection (Property Manager only)
 */
exports.createInspection = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can create inspections' });
    }

    const {
      title,
      type,
      scheduledDate,
      propertyId,
      unitId,
      assignedToId,
      notes,
    } = req.body;

    // Validation
    if (!title || !type || !scheduledDate || !propertyId) {
      return res.status(400).json({
        error: 'Missing required fields: title, type, scheduledDate, propertyId',
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

    // Check for overlapping inspections on the same unit
    if (unitId) {
      const scheduledDateTime = new Date(scheduledDate);
      const twoHoursAfter = new Date(scheduledDateTime.getTime() + 2 * 60 * 60 * 1000);

      const overlapping = await prisma.inspection.findFirst({
        where: {
          unitId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledDate: {
            gte: scheduledDateTime,
            lt: twoHoursAfter,
          },
        },
      });

      if (overlapping) {
        return res.status(400).json({
          error: 'Another inspection is already scheduled for this unit at this time',
        });
      }
    }

    const inspection = await prisma.inspection.create({
      data: {
        title,
        type,
        scheduledDate: new Date(scheduledDate),
        propertyId,
        unitId: unitId || null,
        assignedToId: assignedToId || null,
        notes: notes || null,
        status: 'SCHEDULED',
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

    // Create notification for assigned technician
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'INSPECTION_SCHEDULED',
          title: 'New Inspection Assigned',
          message: `You have been assigned to inspection: ${title} at ${property.name}`,
          entityType: 'inspection',
          entityId: inspection.id,
        },
      });
    }

    // Create notification for tenants if unit inspection
    if (unitId) {
      const tenants = await prisma.unitTenant.findMany({
        where: { unitId, isActive: true },
        select: { tenantId: true },
      });

      for (const tenant of tenants) {
        await prisma.notification.create({
          data: {
            userId: tenant.tenantId,
            type: 'INSPECTION_SCHEDULED',
            title: 'Inspection Scheduled',
            message: `An inspection has been scheduled for your unit on ${new Date(scheduledDate).toLocaleDateString()}`,
            entityType: 'inspection',
            entityId: inspection.id,
          },
        });
      }
    }

    res.status(201).json(inspection);
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
};

/**
 * Update an inspection
 */
exports.updateInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const existingInspection = await prisma.inspection.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permissions
    const canUpdate =
      (role === 'PROPERTY_MANAGER' && existingInspection.property.managerId === userId) ||
      (role === 'TECHNICIAN' && existingInspection.assignedToId === userId);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      title,
      type,
      scheduledDate,
      status,
      assignedToId,
      notes,
      findings,
      photos,
    } = req.body;

    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(status && { status }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(notes !== undefined && { notes }),
        ...(findings !== undefined && { findings }),
        ...(photos !== undefined && { photos }),
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

    res.json(inspection);
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Failed to update inspection' });
  }
};

/**
 * Complete an inspection (Technician)
 */
exports.completeInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const { findings, photos } = req.body;

    const existingInspection = await prisma.inspection.findUnique({
      where: { id },
    });

    if (!existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Only assigned technician can complete
    if (role === 'TECHNICIAN' && existingInspection.assignedToId !== userId) {
      return res.status(403).json({ error: 'You are not assigned to this inspection' });
    }

    if (!findings) {
      return res.status(400).json({ error: 'Findings are required to complete inspection' });
    }

    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        completedById: userId,
        findings,
        photos: photos || null,
      },
      include: {
        property: true,
        unit: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify property manager
    await prisma.notification.create({
      data: {
        userId: inspection.property.managerId,
        type: 'JOB_COMPLETED',
        title: 'Inspection Completed',
        message: `Inspection "${inspection.title}" has been completed by ${inspection.assignedTo?.firstName} ${inspection.assignedTo?.lastName}`,
        entityType: 'inspection',
        entityId: inspection.id,
      },
    });

    res.json(inspection);
  } catch (error) {
    console.error('Error completing inspection:', error);
    res.status(500).json({ error: 'Failed to complete inspection' });
  }
};

/**
 * Delete an inspection (Property Manager only)
 */
exports.deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can delete inspections' });
    }

    const existingInspection = await prisma.inspection.findUnique({
      where: { id },
      include: { property: true, report: true },
    });

    if (!existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (existingInspection.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot delete if report exists
    if (existingInspection.report) {
      return res.status(400).json({
        error: 'Cannot delete inspection with associated report. Delete the report first.',
      });
    }

    await prisma.inspection.delete({
      where: { id },
    });

    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkInspectionAccess(userId, role, inspection) {
  if (role === 'PROPERTY_MANAGER') {
    return inspection.property.managerId === userId;
  }

  if (role === 'OWNER') {
    const ownership = await prisma.propertyOwner.findFirst({
      where: {
        propertyId: inspection.propertyId,
        ownerId: userId,
      },
    });
    return !!ownership;
  }

  if (role === 'TENANT' && inspection.unitId) {
    const tenancy = await prisma.unitTenant.findFirst({
      where: {
        unitId: inspection.unitId,
        tenantId: userId,
        isActive: true,
      },
    });
    return !!tenancy;
  }

  if (role === 'TECHNICIAN') {
    return inspection.assignedToId === userId;
  }

  return false;
}
