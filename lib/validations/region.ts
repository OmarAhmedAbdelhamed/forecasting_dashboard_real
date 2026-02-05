import { z } from 'zod';
import { sanitizeText, removeNullBytes } from '@/lib/sanitize';

/**
 * Validation schemas for region-related operations
 */

/**
 * Custom refinement to sanitize and validate text input
 */
const sanitizeAndValidateString = (fieldName: string) =>
  z
    .string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(100, `${fieldName} must not exceed 100 characters`)
    .transform((val) => {
      // Remove null bytes and sanitize text
      return removeNullBytes(sanitizeText(val.trim()));
    })
    .refine((val) => val.length > 0, { message: `${fieldName} cannot be empty after sanitization` });

/**
 * Schema for creating a new region
 */
export const createRegionSchema = z.object({
  name: sanitizeAndValidateString('Region name'),
  organization_id: z.string().uuid('Invalid organization ID format'),
  manager_ids: z.array(z.string().uuid('Invalid manager ID format')).optional().default([]),
});

/**
 * Schema for updating an existing region
 */
export const updateRegionSchema = createRegionSchema
  .partial()
  .extend({
    id: z.string().uuid('Invalid region ID format'),
  })
  .refine(
    (data) => {
      // If organization_id is being changed, validate it's a valid UUID
      if (data.organization_id === undefined) {
        return true;
      }
      return z.string().uuid().safeParse(data.organization_id).success;
    },
    {
      message: 'Invalid organization ID format',
      path: ['organization_id'],
    },
  );

/**
 * Schema for region ID parameter
 */
export const regionIdParamSchema = z.object({
  id: z.string().uuid('Invalid region ID format'),
});

/**
 * Type exports inferred from schemas
 */
export type CreateRegionInput = z.infer<typeof createRegionSchema>;
export type UpdateRegionInput = z.infer<typeof updateRegionSchema>;
