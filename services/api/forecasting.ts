/**
 * Forecasting API endpoints
 */

import { apiClient } from './client';
import type {
  PromotionHistory,
  SimilarCampaign,
  PromotionCalendarEvent,
  ProductPromotionOption,
  PredictDemandRequest,
  CampaignDetailSeriesResponse,
} from '../types/api';

export const forecastingApi = {
  /**
   * Get promotion history
   */
  getPromotionHistory: (params?: {
    productIds?: string[];
    storeIds?: string[];
    regionIds?: string[];
    categoryIds?: string[];
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
    storeIds?: string[];
    regionIds?: string[];
    categoryIds?: string[];
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
    regionIds?: string[];
    categoryIds?: string[];
    includeFuture?: boolean;
    futureCount?: number;
  }) =>
    apiClient.get<{ events: PromotionCalendarEvent[] }>(
      '/api/forecast/calendar',
      params,
    ),

  /**
   * Get only previously used promotions for selected store + product
   */
  getProductPromotions: (params: { storeCode: number; productCode: number }) =>
    apiClient.get<{ promotions: ProductPromotionOption[] }>(
      '/api/forecast/product-promotions',
      params,
    ),

  /**
   * Send demand prediction request to external model via backend proxy
   */
  predictDemand: (payload: PredictDemandRequest) =>
    apiClient.post<Record<string, unknown>>('/api/forecast/predict-demand', payload),

  /**
   * Get real daily series for selected campaign row popup
   */
  getCampaignDetailSeries: (params: {
    storeCode: number;
    productCode: number;
    promoCode: string;
    eventDate: string;
    campaignStartDate?: string;
    campaignEndDate?: string;
    windowDaysBefore?: number;
    windowDaysAfter?: number;
  }) =>
    apiClient.get<CampaignDetailSeriesResponse>(
      '/api/forecast/campaign-detail-series',
      params,
    ),
};
