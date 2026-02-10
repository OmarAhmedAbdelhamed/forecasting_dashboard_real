/**
 * Demand Forecasting API endpoints
 */

import { apiClient } from './client';
import type {
  DemandKPIs,
  DemandTrendData,
  YearComparisonData,
  MonthlyBiasData,
  GrowthProduct,
  ForecastErrorProduct,
  FilterParams,
} from '../types/api';

export const demandApi = {
  /**
   * Get demand forecasting KPIs
   */
  getKPIs: (params?: FilterParams & { periodValue?: number; periodUnit?: string }) =>
    apiClient.get<DemandKPIs>('/api/demand/kpis', params),

  /**
   * Get demand trend and forecast data
   */
  getTrendForecast: (params: {
    storeIds?: string[];
    productIds?: string[];
    categoryIds?: string[];
    period?: 'daily' | 'weekly' | 'monthly';
  }) =>
    apiClient.get<{ data: DemandTrendData[] }>(
      '/api/demand/trend-forecast',
      params,
    ),

  /**
   * Get year-over-year comparison
   */
  getYearComparison: (params: {
    storeIds?: string[];
    productIds?: string[];
    categoryIds?: string[];
  }) =>
    apiClient.get<{ data: YearComparisonData[]; currentWeek?: number }>(
      '/api/demand/year-comparison',
      params,
    ),

  /**
   * Get monthly bias
   */
  getMonthlyBias: (params: {
    storeIds?: string[];
    productIds?: string[];
    categoryIds?: string[];
  }) =>
    apiClient.get<{ data: MonthlyBiasData[] }>(
      '/api/demand/monthly-bias',
      params,
    ),

  /**
   * Get high or low growth products
   */
  getGrowthProducts: (params: {
    storeIds?: string[];
    categoryIds?: string[];
    productIds?: string[];
    days?: number;
    type: 'all' | 'high' | 'low';
  }) =>
    apiClient.get<{ products: GrowthProduct[] }>(
      '/api/demand/growth-products',
      params,
    ),

  /**
   * Get forecast error products
   */
  getForecastErrors: (params?: {
    storeIds?: string[];
    categoryIds?: string[];
    productIds?: string[];
    severityFilter?: string;
    days?: number;
  }) =>
    apiClient.get<{ products: ForecastErrorProduct[] }>(
      '/api/demand/forecast-errors',
      params,
    ),
};
