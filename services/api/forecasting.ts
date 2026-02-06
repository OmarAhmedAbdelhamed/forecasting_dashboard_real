/**
 * Forecasting API endpoints
 */

import { apiClient } from './client';
import type {
  PromotionHistory,
  SimilarCampaign,
  PromotionCalendarEvent,
} from '../types/api';

export const forecastingApi = {
  /**
   * Get promotion history
   */
  getPromotionHistory: (params?: {
    productIds?: string[];
    storeIds?: string[];
    limit?: number;
  }) =>
    apiClient.get<{ history: PromotionHistory[] }>(
      '/api/forecast/promotion-history',
      params,
    ),

  /**
   * Get similar campaigns
   */
  getSimilarCampaigns: (params?: {
    promotionType?: string;
    productIds?: string[];
    limit?: number;
  }) =>
    apiClient.get<{ campaigns: SimilarCampaign[] }>(
      '/api/forecast/similar-campaigns',
      params,
    ),

  /**
   * Get promotion calendar
   */
  getPromotionCalendar: (params: {
    month: number;
    year: number;
    storeIds?: string[];
  }) =>
    apiClient.get<{ events: PromotionCalendarEvent[] }>(
      '/api/forecast/calendar',
      params,
    ),
};
