export const PROPERTY_STATUS_VALUES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];

export const PROPERTY_STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  UNDER_MAINTENANCE: 'Under Maintenance',
};

export const PROPERTY_STATUS_OPTIONS = PROPERTY_STATUS_VALUES.map((value) => ({
  value,
  label: PROPERTY_STATUS_LABELS[value] ?? value,
}));
