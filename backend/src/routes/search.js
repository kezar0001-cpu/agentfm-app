import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import prisma from '../config/prismaClient.js';

const router = express.Router();

/**
 * Global search endpoint
 * Searches across properties, jobs, inspections, and service requests
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json({ success: true, results: [] });
  }

  const searchTerm = q.trim();
  const searchLimit = Math.min(parseInt(limit, 10) || 20, 50);

  // Build search filters based on user role
  let propertyFilter = {};

  if (req.user.role === 'PROPERTY_MANAGER') {
    propertyFilter = { managerId: req.user.id };
  } else if (req.user.role === 'OWNER') {
    // Get properties owned by this user
    const ownerships = await prisma.propertyOwner.findMany({
      where: { ownerId: req.user.id },
      select: { propertyId: true }
    });
    propertyFilter = { id: { in: ownerships.map(o => o.propertyId) } };
  } else if (req.user.role === 'TENANT') {
    // Get properties where user is a tenant
    const units = await prisma.unit.findMany({
      where: { tenantId: req.user.id },
      select: { propertyId: true }
    });
    propertyFilter = { id: { in: units.map(u => u.propertyId) } };
  } else if (req.user.role === 'TECHNICIAN') {
    // Technicians can only search jobs assigned to them
    const jobs = await prisma.job.findMany({
      where: {
        assignedToId: req.user.id,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: searchLimit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        property: {
          select: {
            name: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      results: jobs.map(job => ({
        id: job.id,
        type: 'job',
        title: job.title,
        description: job.description,
        subtitle: `${job.property.name} - ${job.status}`,
        status: job.status,
        priority: job.priority,
        link: `/jobs`
      }))
    });
  }

  // Search properties
  const properties = await prisma.property.findMany({
    where: {
      ...propertyFilter,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { city: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    take: Math.ceil(searchLimit / 4),
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      status: true
    },
    orderBy: { name: 'asc' }
  });

  // Get property IDs for filtering jobs and inspections
  const propertyIds = properties.map(p => p.id);

  // Early return if no properties found - prevents security issue where undefined
  // in Prisma's 'in' operator would match ALL records instead of none
  if (propertyIds.length === 0) {
    return res.json({ success: true, results: [], total: 0 });
  }

  // Search jobs
  const jobs = await prisma.job.findMany({
    where: {
      propertyId: { in: propertyIds },
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    take: Math.ceil(searchLimit / 4),
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      property: {
        select: {
          name: true,
          address: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Search inspections
  const inspections = await prisma.inspection.findMany({
    where: {
      propertyId: { in: propertyIds },
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    take: Math.ceil(searchLimit / 4),
    select: {
      id: true,
      title: true,
      notes: true,
      status: true,
      scheduledDate: true,
      property: {
        select: {
          name: true,
          address: true
        }
      }
    },
    orderBy: { scheduledDate: 'desc' }
  });

  // Search service requests (only for property managers and tenants)
  let serviceRequests = [];
  if (req.user.role === 'PROPERTY_MANAGER' || req.user.role === 'TENANT') {
    const serviceRequestFilter = req.user.role === 'TENANT'
      ? { requesterId: req.user.id }
      : { propertyId: { in: propertyIds } };

    serviceRequests = await prisma.serviceRequest.findMany({
      where: {
        ...serviceRequestFilter,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: Math.ceil(searchLimit / 4),
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        property: {
          select: {
            name: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Format results
  const results = [
    ...properties.map(property => ({
      id: property.id,
      type: 'property',
      title: property.name,
      description: property.address,
      subtitle: `${property.city}, ${property.state} - ${property.status}`,
      status: property.status,
      link: `/properties/${property.id}`
    })),
    ...jobs.map(job => ({
      id: job.id,
      type: 'job',
      title: job.title,
      description: job.description,
      subtitle: `${job.property.name} - ${job.status}`,
      status: job.status,
      priority: job.priority,
      link: `/jobs`
    })),
    ...inspections.map(inspection => ({
      id: inspection.id,
      type: 'inspection',
      title: inspection.title,
      description: inspection.notes || 'No notes',
      subtitle: `${inspection.property.name} - ${inspection.status}`,
      status: inspection.status,
      scheduledDate: inspection.scheduledDate,
      link: `/inspections/${inspection.id}`
    })),
    ...serviceRequests.map(request => ({
      id: request.id,
      type: 'service_request',
      title: request.title,
      description: request.description,
      subtitle: `${request.property.name} - ${request.status}`,
      status: request.status,
      priority: request.priority,
      link: `/service-requests`
    }))
  ];

  res.json({ success: true, results, total: results.length });
}));

export default router;
