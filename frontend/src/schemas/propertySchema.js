import { z } from 'zod';
import { PROPERTY_STATUS_VALUES } from '../constants/propertyStatus';

const currentYear = new Date().getFullYear();

export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  city: z.string().min(1, 'City / locality is required').trim(),
  state: z.string().trim().optional().nullable(),
  zipCode: z.string().trim().optional().nullable(),
  country: z.string().min(1, 'Country is required'),
  propertyType: z.string().min(1, 'Property type is required'),
  yearBuilt: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? null : num;
    })
    .refine((val) => val === null || (val >= 1800 && val <= currentYear), {
      message: `Year must be between 1800 and ${currentYear}`,
    }),
  totalUnits: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (!val || val === '') return 0;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? 0 : num;
    })
    .refine((val) => !isNaN(val), {
      message: 'Must be a valid number',
    }),
  totalArea: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    })
    .refine((val) => val === null || !isNaN(val), {
      message: 'Must be a valid number',
    }),
  status: z.enum(PROPERTY_STATUS_VALUES).default('ACTIVE'),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
});

export const propertyDefaultValues = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  propertyType: '',
  yearBuilt: '',
  totalUnits: '0',
  totalArea: '',
  status: 'ACTIVE',
  description: '',
  imageUrl: '',
};

export const DOCUMENT_CATEGORIES = [
  { value: 'LEASE_AGREEMENT', label: 'Lease Agreement' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PERMIT', label: 'Permit' },
  { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
  { value: 'MAINTENANCE_RECORD', label: 'Maintenance Record' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'PHOTOS', label: 'Photos' },
  { value: 'OTHER', label: 'Other' },
];

export const DOCUMENT_ACCESS_LEVELS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'PROPERTY_MANAGER', label: 'Property Manager' },
];
