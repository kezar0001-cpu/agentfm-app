const { randomUUID } = require('crypto');

const store = {
  properties: [
    {
      id: randomUUID(),
      name: 'Marina Heights',
      type: 'Residential Tower',
      city: 'Dubai',
      country: 'UAE',
      tags: ['Premium'],
      units: [
        { id: randomUUID(), name: 'Unit 1201', floor: '12', area: 145 },
        { id: randomUUID(), name: 'Unit 2305', floor: '23', area: 162 },
      ],
    },
    {
      id: randomUUID(),
      name: 'Al Qasr Business Centre',
      type: 'Commercial',
      city: 'Abu Dhabi',
      country: 'UAE',
      tags: ['FM Contract'],
      units: [
        { id: randomUUID(), name: 'Suite 4B', floor: '4', area: 98 },
      ],
    },
  ],
  plans: [
    {
      id: randomUUID(),
      name: 'Essential FM Package',
      frequency: 'Monthly',
      description: 'Core HVAC, MEP and cleaning visits every 30 days.',
    },
    {
      id: randomUUID(),
      name: 'Premium Facilities Plan',
      frequency: 'Quarterly',
      description: 'Deep inspections, facade cleaning and 24/7 helpdesk.',
    },
  ],
  metrics: {
    openJobs: 6,
    overdueJobs: 1,
    completedJobs30d: 14,
    averagePci: 92,
    pendingRecommendations: 3,
    updatedAt: new Date().toISOString(),
  },
};

function touchMetrics() {
  store.metrics.updatedAt = new Date().toISOString();
}

function listProperties() {
  return store.properties;
}

function addProperty({ name, type, city, country }) {
  const property = {
    id: randomUUID(),
    name,
    type,
    city,
    country,
    tags: [],
    units: [],
  };
  store.properties.unshift(property);
  touchMetrics();
  return property;
}

function findProperty(propertyId) {
  return store.properties.find((property) => property.id === propertyId);
}

function addUnit(propertyId, { name, floor, area }) {
  const property = findProperty(propertyId);
  if (!property) return null;
  const unit = {
    id: randomUUID(),
    name,
    floor,
    area: Number.isFinite(Number(area)) ? Number(area) : area,
  };
  property.units.push(unit);
  touchMetrics();
  return unit;
}

function listPlans() {
  return store.plans;
}

function addPlan({ name, frequency, description }) {
  const plan = {
    id: randomUUID(),
    name,
    frequency,
    description: description || '',
  };
  store.plans.unshift(plan);
  touchMetrics();
  return plan;
}

function getDashboardSummary() {
  return { ...store.metrics };
}

module.exports = {
  listProperties,
  addProperty,
  findProperty,
  addUnit,
  listPlans,
  addPlan,
  getDashboardSummary,
};
