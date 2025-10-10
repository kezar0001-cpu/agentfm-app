import { randomUUID } from 'crypto';

const DEFAULT_ORG_ID = 'org1';

const createId = () => randomUUID();
const clone = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const now = () => new Date();

const properties = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    name: 'Marina Heights',
    type: 'Residential tower',
    city: 'Dubai',
    country: 'United Arab Emirates',
    tags: ['Premium', 'High occupancy'],
    units: [
      { id: createId(), name: 'Unit 1201', floor: '12', area: 145 },
      { id: createId(), name: 'Unit 2305', floor: '23', area: 162 },
      { id: createId(), name: 'Penthouse', floor: '45', area: 420 },
    ],
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    name: 'Al Qasr Business Centre',
    type: 'Commercial',
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    tags: ['FM contract'],
    units: [
      { id: createId(), name: 'Suite 4B', floor: '4', area: 98 },
      { id: createId(), name: 'Suite 7C', floor: '7', area: 130 },
    ],
  },
];

properties.forEach((property) => {
  property.units.forEach((unit) => {
    unit.propertyId = property.id;
  });
});

const plans = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    name: 'Essential FM Package',
    frequency: 'Monthly',
    description: 'HVAC, MEP, and cleaning visits every 30 days.',
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    name: 'Premium Facilities Plan',
    frequency: 'Quarterly',
    description: 'Deep inspections, facade cleaning, 24/7 helpdesk.',
  },
];

const inspections = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[0].id,
    propertyName: properties[0].name,
    unitId: properties[0].units[0].id,
    unitName: properties[0].units[0].name,
    inspector: 'Ahmed Saeed',
    scheduledAt: new Date('2024-01-05T08:00:00.000Z').toISOString(),
    completedAt: new Date('2024-01-05T09:15:00.000Z').toISOString(),
    status: 'completed',
    pci: 88,
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[1].id,
    propertyName: properties[1].name,
    unitId: null,
    unitName: null,
    inspector: 'Maryam Al Falasi',
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    status: 'scheduled',
    pci: null,
  },
];

const jobs = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[0].id,
    propertyName: properties[0].name,
    unitId: properties[0].units[0].id,
    unitName: properties[0].units[0].name,
    title: 'HVAC filter replacement',
    description: 'Replace clogged filters and balance air flow in Unit 1201.',
    status: 'in_progress',
    scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'BlueAir Services',
    assignee: { name: 'BlueAir Services' },
    priority: 'high',
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
    completedAt: null,
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[1].id,
    propertyName: properties[1].name,
    unitId: properties[1].units[0].id,
    unitName: properties[1].units[0].name,
    title: 'Lobby deep clean',
    description: 'Quarterly lobby deep clean and marble polishing.',
    status: 'scheduled',
    scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'Sparkle Co.',
    assignee: { name: 'Sparkle Co.' },
    priority: 'medium',
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
    completedAt: null,
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[0].id,
    propertyName: properties[0].name,
    unitId: properties[0].units[1].id,
    unitName: properties[0].units[1].name,
    title: 'Facade lighting repair',
    description: 'Replace faulty facade lighting controllers and bulbs.',
    status: 'completed',
    scheduledFor: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'Lumina FM',
    assignee: { name: 'Lumina FM' },
    priority: 'high',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const recommendations = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[0].id,
    propertyName: properties[0].name,
    description: 'Seal rooftop waterproofing membrane before rainy season.',
    priority: 'high',
    suggestedWithinDays: 14,
    jobId: null,
    createdAt: now().toISOString(),
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[1].id,
    propertyName: properties[1].name,
    description: 'Upgrade lobby access control readers to NFC compatible models.',
    priority: 'medium',
    suggestedWithinDays: 30,
    jobId: null,
    createdAt: now().toISOString(),
  },
];

const subscriptions = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[1].id,
    propertyName: properties[1].name,
    unitId: null,
    planId: plans[0].id,
    planName: plans[0].name,
    customerName: 'Future Growth Investments',
    status: 'active',
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  },
];

const serviceRequests = [
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[0].id,
    propertyName: properties[0].name,
    unitId: properties[0].units[2].id,
    unitName: properties[0].units[2].name,
    title: 'Pool pump noise',
    description: 'Residents reported loud vibration from rooftop pool pump.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now().toISOString(),
  },
  {
    id: createId(),
    orgId: DEFAULT_ORG_ID,
    propertyId: properties[1].id,
    propertyName: properties[1].name,
    unitId: properties[1].units[0].id,
    unitName: properties[1].units[0].name,
    title: 'Chiller reset',
    description: 'Retail tenant requested reset after overnight shutdown.',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now().toISOString(),
  },
];

const reportRequests = [];

let metricsUpdatedAt = now().toISOString();

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function markUpdated() {
  metricsUpdatedAt = now().toISOString();
}

function requireProperty(orgId, propertyId) {
  const property = properties.find((item) => item.id === propertyId && item.orgId === orgId);
  return property || null;
}

function requireUnit(orgId, propertyId, unitId) {
  const property = requireProperty(orgId, propertyId);
  if (!property) return null;
  const unit = property.units.find((item) => item.id === unitId);
  return unit || null;
}

function listProperties(orgId) {
  return clone(properties.filter((property) => property.orgId === orgId));
}

function addProperty(orgId, { name, type, city, country }) {
  const property = {
    id: createId(),
    orgId,
    name,
    type,
    city,
    country,
    tags: [],
    units: [],
  };
  properties.unshift(property);
  markUpdated();
  return clone(property);
}

function findProperty(orgId, propertyId) {
  const property = requireProperty(orgId, propertyId);
  if (!property) return null;
  return clone(property);
}

function addUnit(orgId, propertyId, { name, floor, area }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) return null;
  const unit = { id: createId(), propertyId, name, floor, area: Number(area) };
  property.units.push(unit);
  markUpdated();
  return clone(unit);
}

function listPlans(orgId) {
  return clone(plans.filter((plan) => plan.orgId === orgId));
}

function addPlan(orgId, { name, frequency, description }) {
  const plan = { id: createId(), orgId, name, frequency, description: description || '' };
  plans.unshift(plan);
  markUpdated();
  return clone(plan);
}

function listInspections(orgId, { propertyId, status } = {}) {
  return clone(
    inspections.filter((inspection) => {
      if (inspection.orgId !== orgId) return false;
      if (propertyId && inspection.propertyId !== propertyId) return false;
      if (status === 'completed' && inspection.status !== 'completed') return false;
      if (status === 'pending' && inspection.status === 'completed') return false;
      return true;
    })
  );
}

function scheduleInspection(orgId, { propertyId, unitId, inspector, scheduledAt }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) {
    const error = new Error('Property not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  let unit = null;
  if (unitId) {
    unit = requireUnit(orgId, propertyId, unitId);
    if (!unit) {
      const error = new Error('Unit not found');
      error.code = 'NOT_FOUND';
      return error;
    }
  }
  const inspection = {
    id: createId(),
    orgId,
    propertyId,
    propertyName: property.name,
    unitId: unit ? unit.id : null,
    unitName: unit ? unit.name : null,
    inspector,
    scheduledAt: new Date(scheduledAt).toISOString(),
    completedAt: null,
    status: 'scheduled',
    pci: null,
  };
  inspections.unshift(inspection);
  markUpdated();
  return clone(inspection);
}

function listJobs(orgId, { status, propertyId } = {}) {
  return clone(
    jobs.filter((job) => {
      if (job.orgId !== orgId) return false;
      if (status && job.status !== status) return false;
      if (propertyId && job.propertyId !== propertyId) return false;
      return true;
    })
  );
}

function createJob(orgId, { propertyId, unitId, title, description, scheduledFor }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) {
    const error = new Error('Property not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  let unit = null;
  if (unitId) {
    unit = requireUnit(orgId, propertyId, unitId);
    if (!unit) {
      const error = new Error('Unit not found');
      error.code = 'NOT_FOUND';
      return error;
    }
  }
  const job = {
    id: createId(),
    orgId,
    propertyId,
    propertyName: property.name,
    unitId: unit ? unit.id : null,
    unitName: unit ? unit.name : null,
    title,
    description,
    status: scheduledFor ? 'scheduled' : 'open',
    scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    assignedTo: null,
    assignee: null,
    priority: 'medium',
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
    completedAt: null,
  };
  jobs.unshift(job);
  markUpdated();
  return clone(job);
}

function updateJob(orgId, jobId, { status, scheduledFor, assignedTo }) {
  const job = jobs.find((item) => item.id === jobId && item.orgId === orgId);
  if (!job) {
    const error = new Error('Job not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  if (status) {
    job.status = status;
    if (status === 'completed') {
      job.completedAt = now().toISOString();
    }
  }
  if (scheduledFor !== undefined) {
    job.scheduledFor = scheduledFor ? new Date(scheduledFor).toISOString() : null;
  }
  if (assignedTo !== undefined) {
    job.assignedTo = assignedTo;
    job.assignee = assignedTo ? { name: assignedTo } : null;
  }
  job.updatedAt = now().toISOString();
  markUpdated();
  return clone(job);
}

function listRecommendations(orgId) {
  return clone(recommendations.filter((item) => item.orgId === orgId));
}

function convertRecommendation(orgId, recommendationId) {
  const recommendation = recommendations.find(
    (item) => item.id === recommendationId && item.orgId === orgId
  );
  if (!recommendation) {
    const error = new Error('Recommendation not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  if (recommendation.jobId) {
    const error = new Error('Recommendation already converted');
    error.code = 'INVALID';
    return error;
  }
  const job = {
    id: createId(),
    orgId,
    propertyId: recommendation.propertyId,
    propertyName: recommendation.propertyName,
    unitId: null,
    unitName: null,
    title: recommendation.description,
    description: recommendation.description,
    status: 'open',
    scheduledFor: null,
    assignedTo: null,
    assignee: null,
    priority: recommendation.priority,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
    completedAt: null,
    sourceRecommendationId: recommendation.id,
  };
  recommendation.jobId = job.id;
  jobs.unshift(job);
  markUpdated();
  return { job: clone(job), recommendation: clone(recommendation) };
}

function listSubscriptions(orgId) {
  return clone(subscriptions.filter((item) => item.orgId === orgId));
}

function createSubscription(orgId, { propertyId, unitId, planId }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) {
    const error = new Error('Property not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  let unit = null;
  if (unitId) {
    unit = requireUnit(orgId, propertyId, unitId);
    if (!unit) {
      const error = new Error('Unit not found');
      error.code = 'NOT_FOUND';
      return error;
    }
  }
  const plan = plans.find((item) => item.id === planId && item.orgId === orgId);
  if (!plan) {
    const error = new Error('Plan not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  const subscription = {
    id: createId(),
    orgId,
    propertyId,
    propertyName: property.name,
    unitId: unit ? unit.id : null,
    unitName: unit ? unit.name : null,
    planId,
    planName: plan.name,
    customerName: property.name,
    status: 'active',
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  };
  subscriptions.unshift(subscription);
  markUpdated();
  return clone(subscription);
}

function updateSubscription(orgId, subscriptionId, { status }) {
  const subscription = subscriptions.find(
    (item) => item.id === subscriptionId && item.orgId === orgId
  );
  if (!subscription) {
    const error = new Error('Subscription not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  if (status) {
    subscription.status = status;
  }
  subscription.updatedAt = now().toISOString();
  markUpdated();
  return clone(subscription);
}

function listServiceRequests(orgId) {
  const current = now();
  return clone(
    serviceRequests.map((request) => {
      if (request.orgId !== orgId) return null;
      const createdAt = new Date(request.createdAt);
      const dueAt = request.dueAt ? new Date(request.dueAt) : null;
      const ageDays = Number(((current - createdAt) / MS_IN_DAY).toFixed(1));
      const isActive = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS'].includes(request.status);
      const isOverdue = Boolean(isActive && dueAt && dueAt < current);
      return {
        ...request,
        ageDays,
        isOverdue,
      };
    }).filter(Boolean)
  );
}

function createServiceRequest(orgId, { propertyId, unitId, title, description, priority, dueAt }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) {
    const error = new Error('Property not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  let unit = null;
  if (unitId) {
    unit = requireUnit(orgId, propertyId, unitId);
    if (!unit) {
      const error = new Error('Unit not found');
      error.code = 'NOT_FOUND';
      return error;
    }
  }
  const request = {
    id: createId(),
    orgId,
    propertyId,
    propertyName: property.name,
    unitId: unit ? unit.id : null,
    unitName: unit ? unit.name : null,
    title,
    description,
    priority: priority || 'MEDIUM',
    status: 'NEW',
    dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  };
  serviceRequests.unshift(request);
  markUpdated();
  return clone(request);
}

function updateServiceRequest(orgId, requestId, updates) {
  const request = serviceRequests.find((item) => item.id === requestId && item.orgId === orgId);
  if (!request) {
    const error = new Error('Service request not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  if (updates.status) {
    request.status = updates.status;
  }
  if (updates.priority) {
    request.priority = updates.priority;
  }
  if (updates.dueAt !== undefined) {
    request.dueAt = updates.dueAt ? new Date(updates.dueAt).toISOString() : null;
  }
  if (updates.title) {
    request.title = updates.title;
  }
  if (updates.description) {
    request.description = updates.description;
  }
  request.updatedAt = now().toISOString();
  markUpdated();
  return clone(request);
}

function createReportRequest(orgId, { propertyId, from, to }) {
  const property = requireProperty(orgId, propertyId);
  if (!property) {
    const error = new Error('Property not found');
    error.code = 'NOT_FOUND';
    return error;
  }
  const request = {
    id: `rep_${Date.now()}`,
    orgId,
    propertyId,
    propertyName: property.name,
    from,
    to,
    createdAt: now().toISOString(),
  };
  reportRequests.unshift(request);
  return clone(request);
}

function getDashboardSummary(orgId) {
  const current = now();
  const orgJobs = jobs.filter((job) => job.orgId === orgId);
  const orgRecommendations = recommendations.filter((item) => item.orgId === orgId);
  const orgInspections = inspections.filter((inspection) => inspection.orgId === orgId);
  const openJobs = orgJobs.filter((job) => job.status !== 'completed').length;
  const overdueJobs = orgJobs.filter((job) => {
    if (job.status === 'completed') return false;
    if (!job.scheduledFor) return false;
    return new Date(job.scheduledFor) < current;
  }).length;
  const completedJobs30d = orgJobs.filter((job) => {
    if (job.status !== 'completed') return false;
    if (!job.completedAt) return false;
    return current - new Date(job.completedAt) <= 30 * MS_IN_DAY;
  }).length;
  const pendingRecommendations = orgRecommendations.filter((item) => !item.jobId).length;
  const pciValues = orgInspections.filter((inspection) => typeof inspection.pci === 'number');
  const averagePci = pciValues.length
    ? pciValues.reduce((sum, inspection) => sum + inspection.pci, 0) / pciValues.length
    : null;
  return {
    openJobs,
    overdueJobs,
    completedJobs30d,
    pendingRecommendations,
    averagePci: averagePci != null ? Number(averagePci.toFixed(1)) : null,
    updatedAt: metricsUpdatedAt,
  };
}

export {
  listProperties,
  addProperty,
  findProperty,
  addUnit,
  listPlans,
  addPlan,
  listInspections,
  scheduleInspection,
  listJobs,
  createJob,
  updateJob,
  listRecommendations,
  convertRecommendation,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  listServiceRequests,
  createServiceRequest,
  updateServiceRequest,
  createReportRequest,
  getDashboardSummary,
};
