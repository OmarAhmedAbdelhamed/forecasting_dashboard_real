'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastingApi } from '../../api/forecasting';

interface UsePromotionHistoryParams {
  productIds?: string[];
  storeIds?: string[];
  regionIds?: string[];
  categoryIds?: string[];
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch promotion history
 */
export function usePromotionHistory(params?: UsePromotionHistoryParams) {
  const { enabled = true, ...queryParams } = params || {};

  return useQuery({
    queryKey: ['promotion-history', params],
    queryFn: () => forecastingApi.getPromotionHistory(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
