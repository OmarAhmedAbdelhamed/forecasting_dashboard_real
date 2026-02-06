'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastingApi } from '../../api/forecasting';

interface UsePromotionHistoryParams {
  productIds?: string[];
  storeIds?: string[];
  limit?: number;
}

/**
 * Hook to fetch promotion history
 */
export function usePromotionHistory(params?: UsePromotionHistoryParams) {
  return useQuery({
    queryKey: ['promotion-history', params],
    queryFn: () => forecastingApi.getPromotionHistory(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
