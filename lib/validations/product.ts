import { z } from 'zod';
import { sanitizeText, removeNullBytes } from '@/lib/sanitize';

/**
 * Validation schemas for product-related operations
 */

/**
 * Custom refinement to sanitize and validate text input
 */
const sanitizeAndValidateString = (min: number, max: number, fieldName: string) =>
  z
    .string()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must not exceed ${max} characters`)
    .transform((val) => {
      // Remove null bytes and sanitize text
      return removeNullBytes(sanitizeText(val.trim()));
    })
    .refine((val) => val.length > 0, { message: `${fieldName} cannot be empty after sanitization` });

/**
 * Sanitize optional text fields
 */
const sanitizeOptionalString = (max: number) =>
  z
    .string()
    .max(max, `Field must not exceed ${max} characters`)
    .transform((val) => {
      // Remove null bytes and sanitize text
      return removeNullBytes(sanitizeText(val.trim()));
    })
    .optional();

/**
 * Schema for creating a new product
 */
export const createProductSchema = z.object({
  name: sanitizeAndValidateString(2, 200, 'Product name'),
  category_id: z.string().uuid('Invalid category ID format'),
  barcode: sanitizeOptionalString(50),
  description: sanitizeOptionalString(1000),
  unit: sanitizeOptionalString(20),
  cost_price: z.number().positive('Cost price must be positive').optional(),
  selling_price: z.number().positive('Selling price must be positive').optional(),
  vat_rate: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional().default(true),
});

/**
 * Schema for updating an existing product
 */
export const updateProductSchema = createProductSchema
  .partial()
  .extend({
    id: z.string().uuid('Invalid product ID format'),
  })
  .refine(
    (data) => {
      // If changing category_id, it must be a valid UUID (already validated by schema)
      return true;
    },
    {
      message: 'Invalid category data',
    },
  );

/**
 * Schema for product ID parameter
 */
export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
});

/**
 * Type exports inferred from schemas
 */
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
