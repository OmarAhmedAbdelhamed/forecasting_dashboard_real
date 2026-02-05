import { z } from 'zod';

/**
 * Zod validation schema for forecast estimates
 */

// Base forecast schema with common fields
export const forecastBaseSchema = {
  product_id: z.string().uuid('Invalid product ID format'),
  store_id: z.string().uuid('Invalid store ID format'),
  forecast_date: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
    message: 'Invalid forecast date',
  }),
  forecast_estimate_0: z.number().min(0, 'Estimate 0 must be non-negative'),
  forecast_estimate_1: z.number().min(0, 'Estimate 1 must be non-negative'),
  forecast_date_range: z
    .object({
      start: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
        message: 'Invalid start date',
      }),
      end: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
        message: 'Invalid end date',
      }),
    })
    .refine((data) => data.start <= data.end, {
      message: 'Start date must be before or equal to end date',
      path: ['start'],
    }),
};

// Schema for creating a forecast estimate
export const createForecastSchema = z.object({
  ...forecastBaseSchema,
  forecast_date_range: z
    .object({
      start: z.string().or(z.date()),
      end: z.string().or(z.date()),
    })
    .refine((data) => new Date(data.start) <= new Date(data.end), {
      message: 'Start date must be before or equal to end date',
    }),
});

// Schema for updating a forecast estimate (all fields optional)
export const updateForecastSchema = z
  .object({
    forecast_date: z.coerce.date().optional(),
    forecast_estimate_0: z.number().min(0, 'Estimate 0 must be non-negative').optional(),
    forecast_estimate_1: z.number().min(0, 'Estimate 1 must be non-negative').optional(),
    forecast_date_range: z
      .object({
        start: z.string().or(z.date()),
        end: z.string().or(z.date()),
      })
      .refine((data) => new Date(data.start) <= new Date(data.end), {
        message: 'Start date must be before or equal to end date',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for forecast query filters
export const forecastQuerySchema = z.object({
  product_id: z.string().uuid().optional(),
  store_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  sort_field: z
    .enum(['forecast_date', 'product_id', 'store_id', 'forecast_estimate_0', 'forecast_estimate_1', 'created_at', 'updated_at'])
    .optional()
    .default('forecast_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type exports
export type CreateForecastInput = z.infer<typeof createForecastSchema>;
export type UpdateForecastInput = z.infer<typeof updateForecastSchema>;
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;
