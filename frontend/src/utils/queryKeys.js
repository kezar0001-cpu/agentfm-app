// frontend/src/utils/queryKeys.js
export const queryKeys = {
  properties: {
    all: () => ['properties'],
    detail: (id) => ['properties', id],
    list: (filters) => ['properties', 'list', filters],
  },
  jobs: {
    all: () => ['jobs'],
    detail: (id) => ['jobs', id],
    list: (filters) => ['jobs', 'list', filters],
    filtered: (filters) => ['jobs', 'filtered', filters],
  },
  units: {
    all: () => ['units'],
    detail: (id) => ['units', id],
    list: (propertyId) => ['units', 'list', propertyId],
  },
  tenants: {
    all: () => ['tenants'],
    detail: (id) => ['tenants', id],
    list: (unitId) => ['tenants', 'list', unitId],
  },
  serviceRequests: {
    all: () => ['serviceRequests'],
    detail: (id) => ['serviceRequests', id],
    list: (filters) => ['serviceRequests', 'list', filters],
  },
  inspections: {
    all: () => ['inspections'],
    detail: (id) => ['inspections', id],
    list: (filters) => ['inspections', 'list', filters],
  },
  auth: {
    profile: (userId) => ['auth', 'profile', userId],
  },
  users: {
    all: () => ['users'],
    detail: (id) => ['users', id],
    list: (filters) => ['users', 'list', filters],
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'],
    technician: () => ['dashboard', 'technician'],
    owner: () => ['dashboard', 'owner'],
    tenant: () => ['dashboard', 'tenant'],
  },
};