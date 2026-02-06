/**
 * Dashboard/Overview API endpoints
 */

import { apiClient } from './client';
import type {
  HistoricalChartResponse,
  RevenueChartResponse,
  PromotionsResponse,
  AlertsSummary,
  DashboardMetrics,
  FilterParams,
} from '../types/api';

export const dashboardApi = {
  /**
   * Get overview metrics
   */
  getMetrics: (params?: FilterParams) =>
    apiClient.get<DashboardMetrics>('/api/dashboard/metrics', params),

  /**
   * Get historical sales comparison by year
   */
  getHistoricalChart: (params?: FilterParams) =>
    apiClient.get<HistoricalChartResponse>('/api/chart/historical', params),

  /**
   * Get revenue vs target chart
   */
  getRevenueChart: (params?: FilterParams) =>
    apiClient.get<RevenueChartResponse>('/api/dashboard/revenue-chart', params),

  /**
   * Get upcoming promotions
   */
  getPromotions: (params?: FilterParams) =>
    apiClient.get<PromotionsResponse>('/api/dashboard/promotions', params),

  /**
   * Get alerts summary
   */
  getAlertsSummary: (params?: {
    regionIds?: string[];
    storeIds?: string[];
    categoryIds?: string[];
  }) => apiClient.get<AlertsSummary>('/api/alerts/summary', params),
};
