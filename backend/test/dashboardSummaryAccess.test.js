import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/prismaClient.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

function createMockResponse() {
  const payload = { summary: null, error: null };
  return {
    payload,
    statusCode: 200,
    json(result) {
      if (result?.summary) {
        this.payload.summary = result.summary;
      } else {
        this.payload.error = result;
      }
      return result;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

test('tenant without property assignments does not leak global dashboard data', async () => {
  const original = {
    unitTenant: prisma.unitTenant,
    property: prisma.property,
    unit: prisma.unit,
    job: prisma.job,
    inspection: prisma.inspection,
    serviceRequest: prisma.serviceRequest,
    subscription: prisma.subscription,
  };

  const calls = {
    propertyGroupBy: null,
    propertyFindMany: null,
    unitGroupBy: null,
    jobGroupBy: null,
    jobCount: null,
    inspectionGroupBy: null,
    inspectionCount: null,
    serviceRequestWhere: null,
  };

  prisma.unitTenant = {
    findMany: async () => [],
  };
  prisma.property = {
    groupBy: async (args) => {
      calls.propertyGroupBy = args;
      return [];
    },
    findMany: async (args) => {
      calls.propertyFindMany = args;
      return [];
    },
  };
  prisma.unit = {
    groupBy: async (args) => {
      calls.unitGroupBy = args;
      return [];
    },
  };
  prisma.job = {
    groupBy: async (args) => {
      calls.jobGroupBy = args;
      return [];
    },
    count: async (args) => {
      calls.jobCount = args;
      return 0;
    },
  };
  prisma.inspection = {
    groupBy: async (args) => {
      calls.inspectionGroupBy = args;
      return [];
    },
    count: async (args) => {
      calls.inspectionCount = args;
      return 0;
    },
  };
  prisma.serviceRequest = {
    groupBy: async (args) => {
      calls.serviceRequestWhere = args?.where;
      return [];
    },
  };
  prisma.subscription = {
    findFirst: async () => null,
  };

  const req = { user: { id: 'tenant-no-props', role: 'TENANT' } };
  const res = createMockResponse();

  try {
    await getDashboardSummary(req, res);
  } finally {
    prisma.unitTenant = original.unitTenant;
    prisma.property = original.property;
    prisma.unit = original.unit;
    prisma.job = original.job;
    prisma.inspection = original.inspection;
    prisma.serviceRequest = original.serviceRequest;
    prisma.subscription = original.subscription;
  }

  assert.ok(res.payload.summary, 'summary should be returned');
  assert.deepEqual(res.payload.summary.properties, { total: 0, active: 0, inactive: 0, underMaintenance: 0 });
  assert.deepEqual(res.payload.summary.units, { total: 0, occupied: 0, available: 0, maintenance: 0 });
  assert.deepEqual(res.payload.summary.jobs, { total: 0, open: 0, assigned: 0, inProgress: 0, completed: 0, overdue: 0 });
  assert.deepEqual(res.payload.summary.inspections, { total: 0, scheduled: 0, inProgress: 0, completed: 0, upcoming: 0 });
  assert.equal(calls.serviceRequestWhere, null, 'service request aggregation should be skipped for tenants');
  assert.equal(calls.propertyGroupBy, null, 'property.groupBy should not be called');
  assert.equal(calls.propertyFindMany, null, 'property.findMany should not be called');
  assert.equal(calls.unitGroupBy, null, 'unit.groupBy should not be called');
  assert.equal(calls.jobGroupBy, null, 'job.groupBy should not be called');
  assert.equal(calls.jobCount, null, 'job.count should not be called');
  assert.equal(calls.inspectionGroupBy, null, 'inspection.groupBy should not be called');
  assert.equal(calls.inspectionCount, null, 'inspection.count should not be called');
});

test('tenant dashboard summary scopes queries to their properties', async () => {
  const original = {
    unitTenant: prisma.unitTenant,
    property: prisma.property,
    unit: prisma.unit,
    job: prisma.job,
    inspection: prisma.inspection,
    serviceRequest: prisma.serviceRequest,
    subscription: prisma.subscription,
  };

  const captured = {
    propertyWhere: null,
    propertyListWhere: null,
    jobWhere: null,
    jobCountWhere: null,
    inspectionWhere: null,
    serviceRequestWhere: null,
  };

  prisma.unitTenant = {
    findMany: async () => ([
      { unit: { propertyId: 'prop-1' } },
      { unit: { propertyId: 'prop-2' } },
    ]),
  };
  prisma.property = {
    groupBy: async (args) => {
      captured.propertyWhere = args?.where;
      return [
        { status: 'ACTIVE', _count: { _all: 2 } },
        { status: 'UNDER_MAINTENANCE', _count: { _all: 1 } },
      ];
    },
    findMany: async (args) => {
      captured.propertyListWhere = args?.where;
      return [
        { id: 'prop-1' },
        { id: 'prop-2' },
      ];
    },
  };
  prisma.unit = {
    groupBy: async () => ([
      { status: 'OCCUPIED', _count: { _all: 1 } },
      { status: 'AVAILABLE', _count: { _all: 1 } },
    ]),
  };
  prisma.job = {
    groupBy: async (args) => {
      captured.jobWhere = args?.where;
      return [
        { status: 'OPEN', _count: { _all: 1 } },
        { status: 'IN_PROGRESS', _count: { _all: 2 } },
      ];
    },
    count: async (args) => {
      captured.jobCountWhere = args?.where;
      return 0;
    },
  };
  prisma.inspection = {
    groupBy: async (args) => {
      captured.inspectionWhere = args?.where;
      return [
        { status: 'COMPLETED', _count: { _all: 1 } },
      ];
    },
    count: async () => 0,
  };
  prisma.serviceRequest = {
    groupBy: async (args) => {
      captured.serviceRequestWhere = args?.where;
      return [
        { status: 'SUBMITTED', _count: { _all: 2 } },
      ];
    },
  };
  prisma.subscription = {
    findFirst: async () => null,
  };

  const req = { user: { id: 'tenant-123', role: 'TENANT' } };
  const res = createMockResponse();

  try {
    await getDashboardSummary(req, res);
  } finally {
    prisma.unitTenant = original.unitTenant;
    prisma.property = original.property;
    prisma.unit = original.unit;
    prisma.job = original.job;
    prisma.inspection = original.inspection;
    prisma.serviceRequest = original.serviceRequest;
    prisma.subscription = original.subscription;
  }

  assert.ok(res.payload.summary, 'summary should be returned');
  assert.deepEqual(captured.propertyWhere, { id: { in: ['prop-1', 'prop-2'] } });
  assert.deepEqual(captured.propertyListWhere, { id: { in: ['prop-1', 'prop-2'] } });
  assert.deepEqual(captured.jobWhere, { propertyId: { in: ['prop-1', 'prop-2'] } });
  assert.equal(captured.jobCountWhere.propertyId?.in.length, 2);
  assert.deepEqual(captured.inspectionWhere, { propertyId: { in: ['prop-1', 'prop-2'] } });
  assert.equal(res.payload.summary.properties.total, 3);
  assert.equal(res.payload.summary.units.total, 2);
  assert.equal(res.payload.summary.jobs.total, 3);
  assert.equal(res.payload.summary.inspections.total, 1);
  assert.equal(res.payload.summary.serviceRequests.total, 0);
});
