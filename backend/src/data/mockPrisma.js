const { randomUUID } = require('crypto');
const { listProperties, listPlans } = require('./memoryStore');

/**
 * In-memory mock of a subset of Prisma's client used by the API routes.
 * It is intentionally lightweight and only implements the methods invoked
 * throughout the codebase.  The goal is to provide deterministic demo data
 * when a real DATABASE_URL is not configured, instead of raising runtime
 * errors (500s) on the frontend.
 */

const now = () => new Date();

const seeded = (() => {
  const DEFAULT_ORG_ID = 'org1';

  const properties = listProperties().map((property) => ({
    id: property.id,
    orgId: property.orgId || DEFAULT_ORG_ID,
    name: property.name,
    address: property.address || property.name,
    city: property.city || 'Dubai',
    state: property.state || property.city || 'Dubai',
    zipCode: property.zipCode || null,
    country: property.country || 'UAE',
    coverImage: null,
    images: [],
    createdAt: now(),
    updatedAt: now(),
  }));

  const units = listProperties().flatMap((property) =>
    (property.units || []).map((unit) => ({
      id: unit.id,
      orgId: property.orgId || DEFAULT_ORG_ID,
      propertyId: unit.propertyId || property.id,
      name: unit.name,
      floor: unit.floor || '',
      area: unit.area ?? null,
      createdAt: now(),
      updatedAt: now(),
    }))
  );

  const plans = listPlans().map((plan) => ({
    id: plan.id,
    orgId: plan.orgId || DEFAULT_ORG_ID,
    name: plan.name,
    frequency: plan.frequency,
    description: plan.description || '',
    createdAt: now(),
    updatedAt: now(),
  }));

  const propertyA = properties[0];
  const propertyB = properties[1] || properties[0];
  const unitsForA = units.filter((unit) => unit.propertyId === propertyA.id);
  const unitA1 = unitsForA[0];
  const unitA2 = unitsForA[1] || unitsForA[0];
  const unitB1 = units.find((unit) => unit.propertyId === propertyB.id) || unitA2;

  const inspectionId = randomUUID();
  const findingId = randomUUID();
  const recommendationId = randomUUID();
  const jobFromRecId = randomUUID();
  const adhocJobId = randomUUID();
  const subscriptionId = randomUUID();

  return {
    property: properties,
    unit: units,
    inspection: [
      {
        id: inspectionId,
        orgId: propertyA.orgId,
        propertyId: propertyA.id,
        unitId: unitA1?.id || null,
        scheduledAt: new Date('2024-01-05T08:00:00.000Z'),
        completedAt: new Date('2024-01-05T09:30:00.000Z'),
        overallPCI: 88,
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    finding: [
      {
        id: findingId,
        inspectionId,
        system: 'HVAC',
        severity: 'HIGH',
        note: 'Replace clogged filters and recalibrate thermostat sensors.',
        photos: null,
      },
    ],
    recommendation: [
      {
        id: recommendationId,
        orgId: propertyA.orgId,
        findingId,
        summary: 'Schedule HVAC filter replacement in Marina Heights Unit 1201.',
        estHours: 3,
        estCostAED: 450,
        priority: 'HIGH',
        suggestedWithinDays: 10,
        jobId: jobFromRecId,
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    job: [
      {
        id: jobFromRecId,
        orgId: propertyA.orgId,
        propertyId: propertyA.id,
        unitId: unitA1?.id || null,
        source: 'RECOMMENDATION',
        title: 'HVAC filter replacement',
        description: 'Replace filters as per inspection recommendation.',
        status: 'IN_PROGRESS',
        scheduledFor: new Date('2024-01-12T07:00:00.000Z'),
        vendorId: null,
        slaHours: null,
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: adhocJobId,
        orgId: propertyB.orgId,
        propertyId: propertyB.id,
        unitId: unitB1?.id || null,
        source: 'ONE_OFF',
        title: 'Lobby deep clean',
        description: 'Quarterly lobby deep clean for Al Qasr Business Centre.',
        status: 'PLANNED',
        scheduledFor: new Date('2024-01-20T08:30:00.000Z'),
        vendorId: null,
        slaHours: null,
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    plan: plans,
    subscription: [
      {
        id: subscriptionId,
        orgId: propertyB.orgId,
        propertyId: propertyB.id,
        unitId: null,
        planId: plans[0]?.id || null,
        status: 'ACTIVE',
        createdAt: now(),
        updatedAt: now(),
      },
    ],
  };
})();

const clone = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const matchesWhere = (record, where = {}) => {
  return Object.entries(where).every(([key, condition]) => {
    const value = record[key];
    if (condition && typeof condition === 'object' && !(condition instanceof Date) && !Array.isArray(condition)) {
      if (Object.prototype.hasOwnProperty.call(condition, 'not')) {
        return value !== condition.not;
      }
      if (Object.prototype.hasOwnProperty.call(condition, 'equals')) {
        return value === condition.equals;
      }
      // Nested where (e.g. relation filters) not used in the codebase.
      return matchesWhere(value || {}, condition);
    }
    return value === condition;
  });
};

const applyInclude = (model, record, include, data) => {
  if (!include) return clone(record);
  const result = clone(record);

  const apply = (targetModel, entity, includeValue) => {
    if (!entity) return entity;
    if (includeValue === true) return clone(entity);
    return applyInclude(targetModel, entity, includeValue.include || includeValue, data);
  };

  Object.entries(include).forEach(([relation, includeValue]) => {
    if (!includeValue) return;
    switch (`${model}.${relation}`) {
      case 'job.property': {
        const property = data.property.find((p) => p.id === record.propertyId);
        result.property = apply('property', property, includeValue);
        break;
      }
      case 'job.unit': {
        const unit = data.unit.find((u) => u.id === record.unitId);
        result.unit = apply('unit', unit, includeValue);
        break;
      }
      case 'job.recommendation': {
        const recommendation = data.recommendation.find((r) => r.jobId === record.id);
        result.recommendation = apply('recommendation', recommendation, includeValue);
        break;
      }
      case 'recommendation.job': {
        const job = data.job.find((j) => j.id === record.jobId);
        result.job = apply('job', job, includeValue);
        break;
      }
      case 'recommendation.finding': {
        const finding = data.finding.find((f) => f.id === record.findingId);
        result.finding = apply('finding', finding, includeValue);
        break;
      }
      case 'finding.inspection': {
        const inspection = data.inspection.find((i) => i.id === record.inspectionId);
        result.inspection = apply('inspection', inspection, includeValue);
        break;
      }
      case 'inspection.findings': {
        const findings = data.finding
          .filter((f) => f.inspectionId === record.id)
          .map((f) => apply('finding', f, includeValue));
        result.findings = findings;
        break;
      }
      case 'inspection.property': {
        const property = data.property.find((p) => p.id === record.propertyId);
        result.property = apply('property', property, includeValue);
        break;
      }
      case 'inspection.unit': {
        const unit = data.unit.find((u) => u.id === record.unitId);
        result.unit = apply('unit', unit, includeValue);
        break;
      }
      case 'subscription.property': {
        const property = data.property.find((p) => p.id === record.propertyId);
        result.property = apply('property', property, includeValue);
        break;
      }
      case 'subscription.unit': {
        const unit = data.unit.find((u) => u.id === record.unitId);
        result.unit = apply('unit', unit, includeValue);
        break;
      }
      case 'subscription.plan': {
        const plan = data.plan.find((pl) => pl.id === record.planId);
        result.plan = apply('plan', plan, includeValue);
        break;
      }
      default:
        break;
    }
  });

  return result;
};

const buildModelApi = (model, data) => ({
  async findMany(args = {}) {
    const { where = {}, include } = args;
    return data[model]
      .filter((record) => matchesWhere(record, where))
      .map((record) => applyInclude(model, record, include, data));
  },

  async findFirst(args = {}) {
    const { where = {}, include } = args;
    const record = data[model].find((item) => matchesWhere(item, where));
    if (!record) return null;
    return applyInclude(model, record, include, data);
  },

  async create(args = {}) {
    const { data: payload, include } = args;
    const record = {
      id: payload.id || randomUUID(),
      ...clone(payload),
      createdAt: payload.createdAt || now(),
      updatedAt: payload.updatedAt || now(),
    };
    data[model].push(record);
    return applyInclude(model, record, include, data);
  },

  async createMany(args = {}) {
    const { data: payloads } = args;
    if (!Array.isArray(payloads)) {
      throw new Error(`${model}.createMany expects an array of data`);
    }
    payloads.forEach((payload) => {
      const record = {
        id: payload.id || randomUUID(),
        ...clone(payload),
      };
      data[model].push(record);
    });
    return { count: payloads.length };
  },

  async update(args = {}) {
    const { where = {}, data: updateData, include } = args;
    const idx = data[model].findIndex((item) => matchesWhere(item, where));
    if (idx === -1) throw new Error(`${model}.update: record not found`);
    const existing = data[model][idx];
    const updated = {
      ...existing,
      ...clone(updateData),
      updatedAt: now(),
    };
    data[model][idx] = updated;
    return applyInclude(model, updated, include, data);
  },
});

const buildPrismaMock = () => {
  const data = clone(seeded);

  const client = {
    property: buildModelApi('property', data),
    unit: buildModelApi('unit', data),
    inspection: buildModelApi('inspection', data),
    finding: buildModelApi('finding', data),
    recommendation: buildModelApi('recommendation', data),
    job: buildModelApi('job', data),
    plan: buildModelApi('plan', data),
    subscription: buildModelApi('subscription', data),
    async $transaction(cb) {
      return cb(client);
    },
    async $disconnect() {},
    async $connect() {},
  };

  return client;
};

module.exports = buildPrismaMock;
