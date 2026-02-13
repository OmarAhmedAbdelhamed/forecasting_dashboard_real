/**
 * Market comparison API endpoints
 */

import { apiClient } from './client';
import type { MarketSearchRequest, MarketSearchResponse } from '../types/api';

export const marketApi = {
  /**
   * Search product in external market API via backend proxy
   */
  searchProduct: (payload: MarketSearchRequest) =>
    apiClient.post<MarketSearchResponse>('/api/market/search', payload),
};

