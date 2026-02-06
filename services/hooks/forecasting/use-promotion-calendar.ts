'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastingApi } from '../../api/forecasting';

interface UsePromotionCalendarParams {
  month: number;
  year: number;
  storeIds?: string[];
}

/**
 * Hook to fetch promotion calendar
 */
export function usePromotionCalendar(params: UsePromotionCalendarParams) {
  return useQuery({
    queryKey: ['promotion-calendar', params],
    queryFn: () => forecastingApi.getPromotionCalendar(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
