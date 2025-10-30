import { prisma } from '../config/prismaClient.js';

/**
 * Generate report data based on report type
 * @param {Object} reportRequest - The report request object
 * @param {Object} property - The property object
 * @returns {Promise<Object>} Report data with URL
 */
export async function generateReport(reportRequest, property) {
  const { reportType, parameters, propertyId, unitId } = reportRequest;
  const { fromDate, toDate } = parameters;

  // Build report data structure (bank statement style)
  const reportData = {
    property: {
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
    },
    reportType,
    dateRange: {
      from: fromDate,
      to: toDate,
    },
    generatedAt: new Date().toISOString(),
    sections: [],
  };

  if (reportType === 'MAINTENANCE_HISTORY') {
    // Fetch service requests
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: {
        propertyId,
        ...(unitId && { unitId }),
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      include: {
        unit: { select: { unitNumber: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: {
        propertyId,
        ...(unitId && { unitId }),
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      include: {
        unit: { select: { unitNumber: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    reportData.sections.push({
      title: 'Service Requests',
      count: serviceRequests.length,
      items: serviceRequests.map(sr => ({
        date: sr.createdAt,
        unit: sr.unit?.unitNumber || 'Property-wide',
        title: sr.title,
        category: sr.category,
        status: sr.status,
        priority: sr.priority,
        requestedBy: `${sr.requestedBy.firstName} ${sr.requestedBy.lastName}`,
      })),
    });

    reportData.sections.push({
      title: 'Maintenance Jobs',
      count: jobs.length,
      items: jobs.map(job => ({
        date: job.createdAt,
        unit: job.unit?.unitNumber || 'Property-wide',
        title: job.title,
        status: job.status,
        priority: job.priority,
        assignedTo: job.assignedTo ? `${job.assignedTo.firstName} ${job.assignedTo.lastName}` : 'Unassigned',
        estimatedCost: job.estimatedCost,
        actualCost: job.actualCost,
        completedDate: job.completedDate,
      })),
    });

    // Calculate summary
    const totalCosts = jobs.reduce((sum, job) => sum + (job.actualCost || job.estimatedCost || 0), 0);
    reportData.summary = {
      totalServiceRequests: serviceRequests.length,
      totalJobs: jobs.length,
      totalCosts,
      completedJobs: jobs.filter(j => j.status === 'COMPLETED').length,
    };

  } else if (reportType === 'UNIT_LEDGER') {
    // Fetch unit information if unitId provided
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: {
          tenants: {
            where: { isActive: true },
            include: {
              tenant: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      if (unit) {
        reportData.unit = {
          unitNumber: unit.unitNumber,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          area: unit.area,
          rentAmount: unit.rentAmount,
          status: unit.status,
        };

        reportData.sections.push({
          title: 'Current Tenant Information',
          count: unit.tenants.length,
          items: unit.tenants.map(ut => ({
            name: `${ut.tenant.firstName} ${ut.tenant.lastName}`,
            email: ut.tenant.email,
            leaseStart: ut.leaseStart,
            leaseEnd: ut.leaseEnd,
            rentAmount: ut.rentAmount,
            depositAmount: ut.depositAmount,
          })),
        });
      }
    }

    // Fetch service requests with costs
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: {
        propertyId,
        ...(unitId && { unitId }),
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      include: {
        jobs: {
          select: {
            actualCost: true,
            estimatedCost: true,
            status: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCosts = serviceRequests.reduce((sum, sr) => {
      const jobCosts = sr.jobs.reduce((jSum, job) => jSum + (job.actualCost || job.estimatedCost || 0), 0);
      return sum + jobCosts;
    }, 0);

    reportData.sections.push({
      title: 'Maintenance Costs',
      count: serviceRequests.length,
      summary: {
        totalCosts,
        requestCount: serviceRequests.length,
        averageCost: serviceRequests.length > 0 ? totalCosts / serviceRequests.length : 0,
      },
      items: serviceRequests.map(sr => ({
        date: sr.createdAt,
        title: sr.title,
        category: sr.category,
        status: sr.status,
        costs: sr.jobs.reduce((sum, job) => sum + (job.actualCost || job.estimatedCost || 0), 0),
        jobCount: sr.jobs.length,
      })),
    });

    reportData.summary = {
      totalMaintenanceCosts: totalCosts,
      totalRequests: serviceRequests.length,
      averageCostPerRequest: serviceRequests.length > 0 ? totalCosts / serviceRequests.length : 0,
    };
  }

  // In production, this would generate a PDF and upload to S3/storage
  // For now, we return a data URL that can be fetched
  return {
    url: `/api/reports/${reportRequest.id}/data`,
    data: reportData,
  };
}
