/**
 * Forecast Types
 *
 * Type definitions for forecast estimates and related operations.
 * This file provides TypeScript interfaces that extend the generated
 * database types with application-specific types and utilities.
 */

import type { Database } from './database.types';

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Raw forecast estimate row from the database
 */
export type ForecastEstimateRow = Database['public']['Tables']['forecast_estimates']['Row'];

/**
 * Forecast estimate insert payload
 */
export type ForecastEstimateInsert = Database['public']['Tables']['forecast_estimates']['Insert'];

/**
 * Forecast estimate update payload
 */
export type ForecastEstimateUpdate = Database['public']['Tables']['forecast_estimates']['Update'];

/**
 * Forecast estimate - main type alias for Row type
 */
export type ForecastEstimate = ForecastEstimateRow;

// ============================================================================
// EXTENDED TYPES WITH RELATIONSHIPS
// ============================================================================

/**
 * Product information (minimal for forecasts)
 */
export interface ForecastProduct {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
}

/**
 * Store information (minimal for forecasts)
 */
export interface ForecastStore {
  id: string;
  name: string;
  region_id: string;
}

/**
 * User information (creator)
 */
export interface ForecastUser {
  id: string;
  email?: string;
  full_name?: string;
}

/**
 * Forecast estimate with related product and store details
 * Note: creator information (created_by) is a UUID reference, not joined
 */
export interface ForecastEstimateWithDetails extends ForecastEstimate {
  product: ForecastProduct;
  store: ForecastStore;
}

// ============================================================================
// QUERY PARAMETER TYPES (Updated to use IDs)
// ============================================================================

/**
 * Parameters for querying forecasts by product and store
 */
export interface GetForecastsByProductStoreParams {
  productId: string;
  storeId: string;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for querying forecasts by date range
 */
export interface GetForecastsByDateRangeParams {
  startDate: string | Date;
  endDate: string | Date;
  productId?: string;
  storeId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for querying forecasts by period overlap
 */
export interface GetForecastsByPeriodParams {
  targetDate: string | Date;
  productId?: string;
  storeId?: string;
}

/**
 * Parameters for upserting a forecast estimate
 */
export interface UpsertForecastParams {
  productId: string;
  storeId: string;
  forecastDate: string | Date;
  forecastEstimate0: number;
  forecastEstimate1: number;
  forecastDateRange: [string | Date, string | Date];
  createdBy?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response for forecast operations
 */
export interface ForecastApiResponse<T = ForecastEstimate> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Response for multiple forecasts
 */
export interface ForecastsApiResponse {
  success: boolean;
  data?: ForecastEstimate[];
  error?: string;
  count?: number;
  message?: string;
}

/**
 * Response for upsert operation
 */
export interface UpsertForecastResponse {
  success: boolean;
  data?: ForecastEstimate;
  action?: 'inserted' | 'updated';
  error?: string;
  message?: string;
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

/**
 * Forecast form data (user input)
 */
export interface ForecastFormData {
  productId: string;
  storeId: string;
  forecastDate: string;
  forecastEstimate0: number;
  forecastEstimate1: number;
  forecastDateRange: {
    start: string;
    end: string;
  };
}

/**
 * Forecast bulk upload item (uses IDs for consistency)
 */
export interface ForecastBulkUploadItem {
  productId: string;
  storeId: string;
  forecastDate: string;
  forecastEstimate0: number;
  forecastEstimate1: number;
  forecastPeriodStart: string;
  forecastPeriodEnd: string;
}

// ============================================================================
// SORTING AND FILTERING TYPES (Updated to use IDs)
// ============================================================================

/**
 * Forecast sort options
 */
export type ForecastSortField =
  | 'forecast_date'
  | 'product_id'
  | 'store_id'
  | 'forecast_estimate_0'
  | 'forecast_estimate_1'
  | 'created_at'
  | 'updated_at';

export type SortOrder = 'asc' | 'desc';

/**
 * Forecast sort parameters
 */
export interface ForecastSortParams {
  field: ForecastSortField;
  order: SortOrder;
}

/**
 * Forecast filter options (Updated to use IDs)
 */
export interface ForecastFilterOptions {
  productIds?: string[];
  storeIds?: string[];
  dateRange?: {
    start: string | Date;
    end: string | Date;
  };
  forecastDateRange?: {
    start: string | Date;
    end: string | Date;
  };
  minEstimate0?: number;
  maxEstimate0?: number;
  minEstimate1?: number;
  maxEstimate1?: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Forecast validation error
 */
export interface ForecastValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Forecast validation result
 */
export interface ForecastValidationResult {
  valid: boolean;
  errors: ForecastValidationError[];
}

// ============================================================================
// AGGREGATION TYPES (Updated to use IDs)
// ============================================================================

/**
 * Forecast summary by product
 */
export interface ForecastSummaryByProduct {
  productId: string;
  productName: string;
  totalStores: number;
  averageEstimate0: number;
  averageEstimate1: number;
  sumEstimate0: number;
  sumEstimate1: number;
}

/**
 * Forecast summary by store
 */
export interface ForecastSummaryByStore {
  storeId: string;
  storeName: string;
  totalProducts: number;
  averageEstimate0: number;
  averageEstimate1: number;
  sumEstimate0: number;
  sumEstimate1: number;
}

/**
 * Forecast metrics for dashboards
 */
export interface ForecastMetrics {
  totalForecasts: number;
  totalEstimate0: number;
  totalEstimate1: number;
  averageEstimate0: number;
  averageEstimate1: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

// ============================================================================
// EXPORT TYPES (Updated to use IDs)
// ============================================================================

/**
 * Forecast export format (CSV/Excel)
 */
export interface ForecastExportRow {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  forecastDate: string;
  forecastEstimate0: number;
  forecastEstimate1: number;
  forecastPeriodStart: string;
  forecastPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Forecast export options (Updated to use IDs)
 */
export interface ForecastExportOptions {
  format: 'csv' | 'excel' | 'json';
  dateRange?: {
    start: string | Date;
    end: string | Date;
  };
  productIds?: string[];
  storeIds?: string[];
  includeDetails?: boolean;
}
