const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// UNIT CONTROLLER
// ============================================

/**
 * Get all units for a property
 */
exports.getUnits = async (req, res) => {
  try {
    const { propertyId } = req.query;
    const userId = req.user.id;
    const role = req.user.role;
    
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }
    
    // Check access to property
    const hasAccess = await checkPropertyAccess(userId, role, propertyId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
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
    
    res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};

/**
 * Get a single unit by ID
 */
exports.getUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    
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
        tenants: {
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
          orderBy: { isActive: 'desc' },
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
    
    // Check access
    const hasAccess = await checkPropertyAccess(userId, role, unit.propertyId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(unit);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
};

/**
 * Create a new unit (Property Manager only)
 */
exports.createUnit = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can create units' });
    }
    
    const {
      propertyId,
      unitNumber,
      floor,
      bedrooms,
      bathrooms,
      area,
      rentAmount,
      status = 'AVAILABLE',
      description,
      imageUrl,
    } = req.body;
    
    if (!propertyId || !unitNumber) {
      return res.status(400).json({ error: 'Property ID and unit number are required' });
    }
    
    // Check if property belongs to this manager
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    
    if (!property || property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check for duplicate unit number
    const existingUnit = await prisma.unit.findFirst({
      where: {
        propertyId,
        unitNumber,
      },
    });
    
    if (existingUnit) {
      return res.status(400).json({ error: 'Unit number already exists for this property' });
    }
    
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber,
        floor: floor ? parseInt(floor) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        area: area ? parseFloat(area) : null,
        rentAmount: rentAmount ? parseFloat(rentAmount) : null,
        status,
        description,
        imageUrl,
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
    
    // Update property's total unit count
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        totalUnits: {
          increment: 1,
        },
      },
    });
    
    res.status(201).json(unit);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
};

/**
 * Update a unit (Property Manager only)
 */
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can update units' });
    }
    
    const existingUnit = await prisma.unit.findUnique({
      where: { id },
      include: { property: true },
    });
    
    if (!existingUnit) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    
    if (existingUnit.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      unitNumber,
      floor,
      bedrooms,
      bathrooms,
      area,
      rentAmount,
      status,
      description,
      imageUrl,
    } = req.body;
    
    // Check for duplicate unit number if changing
    if (unitNumber && unitNumber !== existingUnit.unitNumber) {
      const duplicate = await prisma.unit.findFirst({
        where: {
          propertyId: existingUnit.propertyId,
          unitNumber,
          NOT: { id },
        },
      });
      
      if (duplicate) {
        return res.status(400).json({ error: 'Unit number already exists for this property' });
      }
    }
    
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...(unitNumber && { unitNumber }),
        ...(floor !== undefined && { floor: floor ? parseInt(floor) : null }),
        ...(bedrooms !== undefined && { bedrooms: bedrooms ? parseInt(bedrooms) : null }),
        ...(bathrooms !== undefined && { bathrooms: bathrooms ? parseFloat(bathrooms) : null }),
        ...(area !== undefined && { area: area ? parseFloat(area) : null }),
        ...(rentAmount !== undefined && { rentAmount: rentAmount ? parseFloat(rentAmount) : null }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
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
    });
    
    res.json(unit);
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
};

/**
 * Delete a unit (Property Manager only)
 */
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can delete units' });
    }
    
    const existingUnit = await prisma.unit.findUnique({
      where: { id },
      include: { 
        property: true,
        tenants: {
          where: { isActive: true },
        },
      },
    });
    
    if (!existingUnit) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    
    if (existingUnit.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (existingUnit.tenants.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete unit with active tenants. Please remove tenants first.' 
      });
    }
    
    await prisma.unit.delete({
      where: { id },
    });
    
    // Update property's total unit count
    await prisma.property.update({
      where: { id: existingUnit.propertyId },
      data: {
        totalUnits: {
          decrement: 1,
        },
      },
    });
    
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};

/**
 * Assign a tenant to a unit
 */
exports.assignTenant = async (req, res) => {
  try {
    const { id } = req.params; // unit id
    const { tenantId, leaseStart, leaseEnd, rentAmount, depositAmount } = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can assign tenants' });
    }
    
    if (!tenantId || !leaseStart || !leaseEnd || !rentAmount) {
      return res.status(400).json({ 
        error: 'Tenant ID, lease start, lease end, and rent amount are required' 
      });
    }
    
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { property: true },
    });
    
    if (!unit || unit.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if tenant exists and has TENANT role
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
    });
    
    if (!tenant || tenant.role !== 'TENANT') {
      return res.status(400).json({ error: 'Invalid tenant' });
    }
    
    // Check if tenant is already assigned to this unit
    const existing = await prisma.unitTenant.findFirst({
      where: {
        unitId: id,
        tenantId,
        isActive: true,
      },
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Tenant is already assigned to this unit' });
    }
    
    const unitTenant = await prisma.unitTenant.create({
      data: {
        unitId: id,
        tenantId,
        leaseStart: new Date(leaseStart),
        leaseEnd: new Date(leaseEnd),
        rentAmount: parseFloat(rentAmount),
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        isActive: true,
      },
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
    });
    
    // Update unit status to OCCUPIED
    await prisma.unit.update({
      where: { id },
      data: { status: 'OCCUPIED' },
    });
    
    res.status(201).json(unitTenant);
  } catch (error) {
    console.error('Error assigning tenant:', error);
    res.status(500).json({ error: 'Failed to assign tenant' });
  }
};

/**
 * Remove a tenant from a unit
 */
exports.removeTenant = async (req, res) => {
  try {
    const { id, tenantId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'Only property managers can remove tenants' });
    }
    
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { property: true },
    });
    
    if (!unit || unit.property.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Set tenant as inactive instead of deleting
    await prisma.unitTenant.updateMany({
      where: {
        unitId: id,
        tenantId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    
    // Check if unit has any remaining active tenants
    const remainingTenants = await prisma.unitTenant.count({
      where: {
        unitId: id,
        isActive: true,
      },
    });
    
    // Update unit status if no active tenants
    if (remainingTenants === 0) {
      await prisma.unit.update({
        where: { id },
        data: { status: 'AVAILABLE' },
      });
    }
    
    res.json({ message: 'Tenant removed successfully' });
  } catch (error) {
    console.error('Error removing tenant:', error);
    res.status(500).json({ error: 'Failed to remove tenant' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkPropertyAccess(userId, role, propertyId) {
  if (role === 'PROPERTY_MANAGER') {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerId: userId },
    });
    return !!property;
  }
  
  if (role === 'OWNER') {
    const ownership = await prisma.propertyOwner.findFirst({
      where: { propertyId, ownerId: userId },
    });
    return !!ownership;
  }
  
  if (role === 'TENANT') {
    const tenant = await prisma.unitTenant.findFirst({
      where: {
        unit: { propertyId },
        tenantId: userId,
        isActive: true,
      },
    });
    return !!tenant;
  }
  
  return false;
}
