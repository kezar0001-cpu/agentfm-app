// frontend/src/utils/queryKeys.js
// Centralised query key factory to ensure consistency between data fetching and cache invalidation.

export const queryKeys = {
  auth: {
    profile: (userId = 'me') => ['profile', userId],
  },
  properties: {
    all: () => ['properties'],
    selectOptions: () => ['properties-list'],
    detail: (id) => ['property', id],
    activity: (id) => ['property-activity', id],
    units: (propertyId) => ['units', propertyId],
  },
  units: {
    root: () => ['units'],
    listByProperty: (propertyId) => ['units-list', propertyId ?? null],
    detail: (id) => ['unit', id],
    tenants: (unitId) => ['unit-tenants', unitId],
    jobs: (unitId) => ['unit-jobs', unitId],
    inspections: (unitId) => ['unit-inspections', unitId],
  },
  jobs: {
    all: () => ['jobs'],
    filtered: (filters) => ['jobs', filters],
    detail: (id) => ['job', id],
    comments: (jobId) => ['jobComments', jobId],
    technician: () => ['technician-jobs'],
    owner: () => ['owner-jobs'],
  },
  inspections: {
    all: () => ['inspections'],
    filtered: (filters) => ['inspections', filters],
    detail: (id) => ['inspection', id],
    audit: (id) => ['inspection', id, 'audit'],
    inspectors: () => ['inspections', 'inspectors'],
    tags: () => ['inspections', 'tags'],
    owner: () => ['owner-inspections'],
  },
  serviceRequests: {
    all: () => ['service-requests'],
    filtered: (filters) => ['service-requests', filters],
    detail: (id) => ['service-request', id],
    tenant: () => ['tenant-service-requests'],
  },
  notifications: {
    list: () => ['notifications'],
    count: () => ['notification-count'],
  },
  dashboard: {
    summary: () => ['dashboard-summary'],
    activity: () => ['dashboard-activity'],
    ownerProperties: () => ['owner-properties'],
    ownerInspections: () => ['owner-inspections'],
    tenantUnits: () => ['tenant-units'],
  },
  subscriptions: {
    all: () => ['subscriptions'],
  },
  plans: {
    all: () => ['plans'],
  },
  recommendations: {
    all: () => ['recommendations'],
  },
  reports: {
    all: () => ['reports'],
  },
  technicians: {
    all: () => ['technicians'],
  },
  tenants: {
    all: () => ['tenants'],
  },
  teams: {
    users: () => ['team-users'],
    invites: () => ['team-invites'],
  },
  globalSearch: {
    results: (term) => ['global-search', term],
  },
};

export default queryKeys;
