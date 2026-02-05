import { z } from 'zod';
import { sanitizeText, removeNullBytes } from '@/lib/sanitize';

/**
 * Validation schemas for category-related operations
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
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  name: sanitizeAndValidateString('Category name'),
});

/**
 * Schema for updating an existing category
 */
export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid('Invalid category ID format'),
});

/**
 * Schema for category ID parameter
 */
export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
});

/**
 * Type exports inferred from schemas
 */
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
