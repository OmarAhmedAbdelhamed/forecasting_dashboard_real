import { z } from 'zod';
import { sanitizeText, removeNullBytes } from '@/lib/sanitize';

/**
 * Validation schemas for store-related operations
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
    .refine((val) => val.length > 0, {
      message: `${fieldName} cannot be empty after sanitization`,
    });

/**
 * Schema for creating a new store
 */
/**
 * Schema for creating a new store
 */
const baseStoreSchema = z.object({
  name: sanitizeAndValidateString('Store name'),
  region_id: z.string().uuid('Invalid region ID format'),
  manager_id: z.string().uuid('Invalid manager ID format').optional(),
  manager_ids: z.array(z.string().uuid('Invalid manager ID format')).optional(),
});

export const createStoreSchema = baseStoreSchema.refine(
  (data) => {
    // Either manager_id (legacy) or manager_ids (new) can be provided, but not both
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    return !(data.manager_id && data.manager_ids);
  },
  {
    message: 'Provide either manager_id or manager_ids, not both',
    path: ['manager_id'],
  },
);

/**
 * Schema for updating an existing store
 */
export const updateStoreSchema = baseStoreSchema.partial().extend({
  id: z.string().uuid('Invalid store ID format'),
});

/**
 * Schema for store ID parameter
 */
export const storeIdParamSchema = z.object({
  id: z.string().uuid('Invalid store ID format'),
});

/**
 * Schema for assigning products to a store
 */
export const assignProductsSchema = z.object({
  product_ids: z
    .array(z.string().uuid('Invalid product ID format'))
    .min(1, 'At least one product ID is required')
    .max(100, 'Cannot assign more than 100 products at once'),
  is_active: z.boolean().optional().default(true),
});

/**
 * Schema for enabling all products in a category for a store
 */
export const enableAllProductsSchema = z.object({
  category_id: z.string().uuid('Invalid category ID format'),
  is_active: z.boolean().optional().default(true),
});

/**
 * Type exports inferred from schemas
 */
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type AssignProductsInput = z.infer<typeof assignProductsSchema>;
export type EnableAllProductsInput = z.infer<typeof enableAllProductsSchema>;
