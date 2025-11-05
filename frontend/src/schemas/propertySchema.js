import { z } from 'zod';

const currentYear = new Date().getFullYear();

// Helper for optional number fields
const optionalNumber = (fieldName = 'Field') =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    })
    .refine((val) => val === null || !isNaN(val), {
      message: `${fieldName} must be a valid number`,
    });

// Helper for optional integer fields
const optionalInteger = (fieldName = 'Field', min = null) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? null : num;
    })
    .refine((val) => val === null || !isNaN(val), {
      message: `${fieldName} must be a valid number`,
    })
    .refine((val) => val === null || min === null || val >= min, {
      message: `${fieldName} must be at least ${min}`,
    });

export const propertySchema = z.object({
  // Basic Information
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

  totalArea: optionalNumber('Total area'),

  status: z.enum([
    'ACTIVE',
    'INACTIVE',
    'FOR_SALE',
    'FOR_RENT',
    'UNDER_CONTRACT',
    'SOLD',
    'RENTED',
    'UNDER_RENOVATION',
    'UNDER_MAINTENANCE'
  ]).default('ACTIVE'),

  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),

  // Enhanced property details
  lotSize: optionalNumber('Lot size'),
  buildingSize: optionalNumber('Building size'),
  numberOfFloors: optionalInteger('Number of floors', 0),
  constructionType: z.string().trim().optional().nullable(),
  heatingSystem: z.string().trim().optional().nullable(),
  coolingSystem: z.string().trim().optional().nullable(),

  // Amenities (stored as JSON object)
  amenities: z.any().optional().nullable(),

  // Financial information (PM/Owner access only)
  purchasePrice: optionalNumber('Purchase price'),
  purchaseDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }),
  currentMarketValue: optionalNumber('Current market value'),
  annualPropertyTax: optionalNumber('Annual property tax'),
  annualInsurance: optionalNumber('Annual insurance'),
  monthlyHOA: optionalNumber('Monthly HOA'),
});

export const propertyDefaultValues = {
  // Basic Information
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

  // Enhanced property details
  lotSize: '',
  buildingSize: '',
  numberOfFloors: '',
  constructionType: '',
  heatingSystem: '',
  coolingSystem: '',
  amenities: null,

  // Financial information
  purchasePrice: '',
  purchaseDate: null,
  currentMarketValue: '',
  annualPropertyTax: '',
  annualInsurance: '',
  monthlyHOA: '',
};

// Property status options with labels
export const PROPERTY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'FOR_SALE', label: 'For Sale' },
  { value: 'FOR_RENT', label: 'For Rent' },
  { value: 'UNDER_CONTRACT', label: 'Under Contract' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'UNDER_RENOVATION', label: 'Under Renovation' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
];

// Document categories
export const DOCUMENT_CATEGORIES = [
  { value: 'LEASE', label: 'Lease Agreement' },
  { value: 'INSURANCE', label: 'Insurance Policy' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INSPECTION', label: 'Inspection Report' },
  { value: 'TAX_DOCUMENT', label: 'Tax Document' },
  { value: 'WARRANTY', label: 'Warranty' },
  { value: 'MAINTENANCE', label: 'Maintenance Record' },
  { value: 'DEED', label: 'Property Deed' },
  { value: 'MORTGAGE', label: 'Mortgage Document' },
  { value: 'APPRAISAL', label: 'Appraisal Report' },
  { value: 'OTHER', label: 'Other' },
];

// Document access levels
export const DOCUMENT_ACCESS_LEVELS = [
  { value: 'PROPERTY_MANAGER', label: 'Property Manager Only' },
  { value: 'OWNER', label: 'Owner & Property Manager' },
  { value: 'TENANT', label: 'Tenant, Owner & Property Manager' },
  { value: 'PUBLIC', label: 'Public (All Authenticated Users)' },
];
