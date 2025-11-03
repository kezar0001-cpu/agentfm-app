import { z } from 'zod';

export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('OPEN'),
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  scheduledDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      return val;
    }),
  estimatedCost: z
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
  notes: z.string().trim().optional().nullable(),
});

export const jobDefaultValues = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  propertyId: '',
  unitId: '',
  assignedToId: '',
  scheduledDate: '',
  estimatedCost: '',
  notes: '',
};
