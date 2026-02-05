import { z } from 'zod';
import { sanitizeText, removeNullBytes } from '@/lib/sanitize';

/**
 * Validation schemas for user-related operations
 * Uses Zod for runtime type validation and schema definition
 */

/**
 * Custom refinement to sanitize and validate text input
 */
const sanitizeAndValidateString = (fieldName: string) =>
  z
    .string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(200, `${fieldName} must not exceed 200 characters`)
    .transform((val) => {
      // Remove null bytes and sanitize text
      return removeNullBytes(sanitizeText(val.trim()));
    })
    .refine((val) => val.length > 0, { message: `${fieldName} cannot be empty after sanitization` });

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  full_name: sanitizeAndValidateString('Name'),
  role_id: z.string().uuid('Invalid role ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
  allowed_regions: z.array(z.string().uuid()).optional().default([]),
  allowed_stores: z.array(z.string().uuid()).optional().default([]),
  allowed_categories: z.array(z.string().uuid()).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

/**
 * Schema for updating an existing user
 */
export const updateUserSchema = createUserSchema.partial();

/**
 * Schema for password reset
 */
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

/**
 * Schema for user ID parameter
 */
export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

/**
 * Type exports inferred from schemas
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
