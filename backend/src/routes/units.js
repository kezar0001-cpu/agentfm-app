import { Router } from 'express';
import prisma from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

const UNIT_STATUSES = new Set(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'VACANT']);
const ROLE_MANAGER = 'PROPERTY_MANAGER';

router.use(requireAuth);

const resolvePropertyId = (req) => {
  if (req.params?.propertyId) return req.params.propertyId;
  if (req.query?.propertyId) return req.query.propertyId;
  if (req.body?.propertyId) return req.body.propertyId;
  return null;
};

const parseNumericField = (value, { fieldName, allowFloat = false }) => {
  if (value === undefined) return { skip: true };
  if (value === null || value === '') return { value: null };

  const parsed = allowFloat ? Number.parseFloat(value) : Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return { error: `${fieldName} must be a valid number` };
  }

  return { value: parsed };
};

const parseOptionalString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const ensurePropertyAccess = async (user, propertyId) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, managerId: true },
  });

  if (!property) {
    return { allowed: false, status: 404, message: 'Property not found' };
  }

  if (user.role === ROLE_MANAGER) {
    return { allowed: true, property };
  }

  if (user.role === ROLE_MANAGER && property.managerId === user.id) {
    return { allowed: true, property };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};

const ensureManagerAccess = async (user, propertyId) => {
  if (user.role !== ROLE_MANAGER && user.role !== ROLE_MANAGER) {
    return { allowed: false, status: 403, message: 'Only property managers can manage units' };
  }

  const access = await ensurePropertyAccess(user, propertyId);
  if (!access.allowed) {
    return access;
  }

  if (user.role === ROLE_MANAGER && access.property.managerId !== user.id) {
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  return access;
};

router.get('/', async (req, res) => {
  try {
    const propertyId = resolvePropertyId(req);
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    const access = await ensurePropertyAccess(req.user, propertyId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }

    const units = await prisma.unit.findMany({
      where: { propertyId },
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
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobs: true,
            inspections: true,
          },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    return res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    return res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            postcode: true,
            managerId: true,
          },
        },
        tenants: {
          orderBy: { isActive: 'desc' },
          include: {
            tenant: {
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
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        inspections: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const access = await ensurePropertyAccess(req.user, unit.propertyId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }

    return res.json({
      ...unit,
      property: unit.property ? { ...unit.property, managerId: undefined } : null,
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    return res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

router.post('/', async (req, res) => {
  try {
    const propertyId = resolvePropertyId(req);
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    const access = await ensureManagerAccess(req.user, propertyId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }

    const unitNumber = parseOptionalString(req.body.unitNumber);
    if (!unitNumber) {
      return res.status(400).json({ error: 'Unit number is required' });
    }

    const statusRaw = parseOptionalString(req.body.status)?.toUpperCase() || 'AVAILABLE';
    if (!UNIT_STATUSES.has(statusRaw)) {
      return res.status(400).json({ error: 'Invalid unit status' });
    }

    const floorResult = parseNumericField(req.body.floor, { fieldName: 'Floor' });
    if (floorResult.error) return res.status(400).json({ error: floorResult.error });

    const bedroomsResult = parseNumericField(req.body.bedrooms, { fieldName: 'Bedrooms' });
    if (bedroomsResult.error) return res.status(400).json({ error: bedroomsResult.error });

    const bathroomsResult = parseNumericField(req.body.bathrooms, {
      fieldName: 'Bathrooms',
      allowFloat: true,
    });
    if (bathroomsResult.error) return res.status(400).json({ error: bathroomsResult.error });

    const areaResult = parseNumericField(req.body.area, { fieldName: 'Area', allowFloat: true });
    if (areaResult.error) return res.status(400).json({ error: areaResult.error });

    const rentAmountResult = parseNumericField(req.body.rentAmount, {
      fieldName: 'Rent amount',
      allowFloat: true,
    });
    if (rentAmountResult.error) return res.status(400).json({ error: rentAmountResult.error });

    try {
      const created = await prisma.$transaction(async (tx) => {
        const unit = await tx.unit.create({
          data: {
            propertyId,
            unitNumber,
            floor: floorResult.skip ? undefined : floorResult.value,
            bedrooms: bedroomsResult.skip ? undefined : bedroomsResult.value,
            bathrooms: bathroomsResult.skip ? undefined : bathroomsResult.value,
            area: areaResult.skip ? undefined : areaResult.value,
            rentAmount: rentAmountResult.skip ? undefined : rentAmountResult.value,
            status: statusRaw,
            description: parseOptionalString(req.body.description),
            imageUrl: parseOptionalString(req.body.imageUrl),
          },
        });

        const totalUnits = await tx.unit.count({ where: { propertyId } });
        await tx.property.update({
          where: { id: propertyId },
          data: { totalUnits },
        });

        return unit;
      });

      return res.status(201).json(created);
    } catch (error) {
      if (error?.code === 'P2002') {
        return res.status(400).json({ error: 'Unit number already exists for this property' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating unit:', error);
    return res.status(500).json({ error: 'Failed to create unit' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      select: { id: true, propertyId: true },
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const access = await ensureManagerAccess(req.user, unit.propertyId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }

    const updates = {};

    if (req.body.unitNumber !== undefined) {
      const unitNumber = parseOptionalString(req.body.unitNumber);
      if (!unitNumber) {
        return res.status(400).json({ error: 'Unit number is required' });
      }
      updates.unitNumber = unitNumber;
    }

    if (req.body.status !== undefined) {
      const statusRaw = parseOptionalString(req.body.status)?.toUpperCase();
      if (!statusRaw || !UNIT_STATUSES.has(statusRaw)) {
        return res.status(400).json({ error: 'Invalid unit status' });
      }
      updates.status = statusRaw;
    }

    const floorResult = parseNumericField(req.body.floor, { fieldName: 'Floor' });
    if (floorResult.error) return res.status(400).json({ error: floorResult.error });
    if (!floorResult.skip) updates.floor = floorResult.value;

    const bedroomsResult = parseNumericField(req.body.bedrooms, { fieldName: 'Bedrooms' });
    if (bedroomsResult.error) return res.status(400).json({ error: bedroomsResult.error });
    if (!bedroomsResult.skip) updates.bedrooms = bedroomsResult.value;

    const bathroomsResult = parseNumericField(req.body.bathrooms, {
      fieldName: 'Bathrooms',
      allowFloat: true,
    });
    if (bathroomsResult.error) return res.status(400).json({ error: bathroomsResult.error });
    if (!bathroomsResult.skip) updates.bathrooms = bathroomsResult.value;

    const areaResult = parseNumericField(req.body.area, { fieldName: 'Area', allowFloat: true });
    if (areaResult.error) return res.status(400).json({ error: areaResult.error });
    if (!areaResult.skip) updates.area = areaResult.value;

    const rentAmountResult = parseNumericField(req.body.rentAmount, {
      fieldName: 'Rent amount',
      allowFloat: true,
    });
    if (rentAmountResult.error) return res.status(400).json({ error: rentAmountResult.error });
    if (!rentAmountResult.skip) updates.rentAmount = rentAmountResult.value;

    const description = parseOptionalString(req.body.description);
    if (req.body.description !== undefined) updates.description = description;

    const imageUrl = parseOptionalString(req.body.imageUrl);
    if (req.body.imageUrl !== undefined) updates.imageUrl = imageUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
      const updated = await prisma.unit.update({
        where: { id },
        data: updates,
      });

      return res.json(updated);
    } catch (error) {
      if (error?.code === 'P2002') {
        return res.status(400).json({ error: 'Unit number already exists for this property' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating unit:', error);
    return res.status(500).json({ error: 'Failed to update unit' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      select: { id: true, propertyId: true },
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const access = await ensureManagerAccess(req.user, unit.propertyId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }

    const activeTenants = await prisma.unitTenant.count({
      where: {
        unitId: id,
        isActive: true,
      },
    });

    if (activeTenants > 0) {
      return res.status(400).json({ error: 'This unit has active tenants and cannot be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.unit.delete({ where: { id } });
      const totalUnits = await tx.unit.count({ where: { propertyId: unit.propertyId } });
      await tx.property.update({
        where: { id: unit.propertyId },
        data: { totalUnits },
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// ========================================
// TENANT ASSIGNMENT ENDPOINTS
// ========================================

// POST /:unitId/tenants - Assign tenant to unit
router.post('/:unitId/tenants', requireRole(ROLE_MANAGER), async (req, res) => {
  try {
    const { unitId } = req.params;
    const { tenantId, leaseStart, leaseEnd, rentAmount, depositAmount } = req.body;
    
    // Validate required fields
    if (!tenantId || !leaseStart || !leaseEnd || !rentAmount) {
      return res.status(400).json({
        success: false,
        message: 'tenantId, leaseStart, leaseEnd, and rentAmount are required'
      });
    }
    
    // Verify unit exists and user has access
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: {
          include: {
            owners: {
              select: { ownerId: true }
            }
          }
        }
      }
    });
    
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    
    // Check access
    const hasAccess = req.user.role === 'PROPERTY_MANAGER' && unit.property.managerId === req.user.id ||
                      req.user.role === 'OWNER' && unit.property.owners.some(o => o.ownerId === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Verify tenant exists and has TENANT role
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    if (tenant.role !== 'TENANT') {
      return res.status(400).json({ success: false, message: 'User must have TENANT role' });
    }
    
    // Check if tenant already has active assignment
    const existingActiveTenant = await prisma.unitTenant.findFirst({
      where: {
        tenantId,
        isActive: true
      }
    });
    
    if (existingActiveTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant already has an active unit assignment'
      });
    }
    
    // Check if unit already has an active tenant
    const existingActiveUnit = await prisma.unitTenant.findFirst({
      where: {
        unitId,
        isActive: true
      }
    });
    
    if (existingActiveUnit) {
      return res.status(400).json({
        success: false,
        message: 'Unit already has an active tenant assigned'
      });
    }
    
    // Validate dates
    const start = new Date(leaseStart);
    const end = new Date(leaseEnd);
    
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Lease end date must be after start date'
      });
    }
    
    // Validate rent amount
    if (rentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Rent amount must be positive'
      });
    }
    
    // Create tenant assignment
    const unitTenant = await prisma.unitTenant.create({
      data: {
        unitId,
        tenantId,
        leaseStart: start,
        leaseEnd: end,
        rentAmount,
        depositAmount: depositAmount || null,
        isActive: true
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    res.status(201).json({ success: true, unitTenant });
  } catch (error) {
    console.error('Error assigning tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to assign tenant' });
  }
});

// GET /:unitId/tenants - Get all tenants for unit
router.get('/:unitId/tenants', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Verify unit exists and user has access
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: {
          include: {
            owners: {
              select: { ownerId: true }
            }
          }
        }
      }
    });
    
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    
    // Check access
    const hasAccess = req.user.role === 'PROPERTY_MANAGER' && unit.property.managerId === req.user.id ||
                      req.user.role === 'OWNER' && unit.property.owners.some(o => o.ownerId === req.user.id) ||
                      req.user.role === 'TENANT'; // Tenants can view (filtered below)
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Build where clause
    const where = { unitId };
    
    // Tenants only see their own assignments
    if (req.user.role === 'TENANT') {
      where.tenantId = req.user.id;
    }
    
    const tenants = await prisma.unitTenant.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Error fetching unit tenants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenants' });
  }
});

// PATCH /:unitId/tenants/:tenantId - Update tenant assignment
router.patch('/:unitId/tenants/:tenantId', requireRole(ROLE_MANAGER), async (req, res) => {
  try {
    const { unitId, tenantId } = req.params;
    const updates = req.body;
    
    // Find the active assignment (to avoid updating old inactive records)
    const assignment = await prisma.unitTenant.findFirst({
      where: { 
        unitId, 
        tenantId,
        isActive: true
      },
      include: {
        unit: {
          include: {
            property: {
              include: {
                owners: {
                  select: { ownerId: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Tenant assignment not found' });
    }
    
    // Check access
    const hasAccess = req.user.role === 'PROPERTY_MANAGER' && assignment.unit.property.managerId === req.user.id ||
                      req.user.role === 'OWNER' && assignment.unit.property.owners.some(o => o.ownerId === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Prepare update data
    const updateData = {};
    
    if (updates.leaseStart !== undefined) {
      updateData.leaseStart = new Date(updates.leaseStart);
    }
    
    if (updates.leaseEnd !== undefined) {
      updateData.leaseEnd = new Date(updates.leaseEnd);
    }
    
    if (updates.rentAmount !== undefined) {
      if (updates.rentAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Rent amount must be positive' });
      }
      updateData.rentAmount = updates.rentAmount;
    }
    
    if (updates.depositAmount !== undefined) {
      updateData.depositAmount = updates.depositAmount;
    }
    
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }
    
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }
    
    // Validate dates if both are being updated
    if (updateData.leaseStart && updateData.leaseEnd) {
      if (updateData.leaseEnd <= updateData.leaseStart) {
        return res.status(400).json({ success: false, message: 'Lease end must be after start' });
      }
    }
    
    const updated = await prisma.unitTenant.update({
      where: { id: assignment.id },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    res.json({ success: true, unitTenant: updated });
  } catch (error) {
    console.error('Error updating tenant assignment:', error);
    res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
});

// DELETE /:unitId/tenants/:tenantId - Remove tenant from unit
router.delete('/:unitId/tenants/:tenantId', requireRole(ROLE_MANAGER), async (req, res) => {
  try {
    const { unitId, tenantId } = req.params;
    
    // Find the assignment
    const assignment = await prisma.unitTenant.findFirst({
      where: { unitId, tenantId, isActive: true },
      include: {
        unit: {
          include: {
            property: {
              include: {
                owners: {
                  select: { ownerId: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Active tenant assignment not found' });
    }
    
    // Check access
    const hasAccess = req.user.role === 'PROPERTY_MANAGER' && assignment.unit.property.managerId === req.user.id ||
                      req.user.role === 'OWNER' && assignment.unit.property.owners.some(o => o.ownerId === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Mark as inactive (soft delete)
    await prisma.unitTenant.update({
      where: { id: assignment.id },
      data: { isActive: false }
    });
    
    res.json({ success: true, message: 'Tenant removed from unit' });
  } catch (error) {
    console.error('Error removing tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to remove tenant' });
  }
});

export default router;
