'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastingApi } from '../../api/forecasting';

interface UsePromotionCalendarParams {
  month: number;
  year: number;
  storeIds?: string[];
  regionIds?: string[];
  categoryIds?: string[];
  includeFuture?: boolean;
  futureCount?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch promotion calendar
 */
export function usePromotionCalendar(params: UsePromotionCalendarParams) {
  const { enabled = true, ...queryParams } = params;

  return useQuery({
    queryKey: ['promotion-calendar', params],
    queryFn: () => forecastingApi.getPromotionCalendar(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
