import { Router } from 'express';
import prisma from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ROLES } from '../../middleware/roleAuth.js';

const router = Router({ mergeParams: true });

const UNIT_STATUSES = new Set(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'VACANT']);

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

  if (user.role === ROLES.ADMIN) {
    return { allowed: true, property };
  }

  if (user.role === ROLES.PROPERTY_MANAGER && property.managerId === user.id) {
    return { allowed: true, property };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};

const ensureManagerAccess = async (user, propertyId) => {
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.PROPERTY_MANAGER) {
    return { allowed: false, status: 403, message: 'Only property managers can manage units' };
  }

  const access = await ensurePropertyAccess(user, propertyId);
  if (!access.allowed) {
    return access;
  }

  if (user.role === ROLES.PROPERTY_MANAGER && access.property.managerId !== user.id) {
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

export default router;
