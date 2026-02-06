'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { HistoricalChartResponse } from '@/services/types/api';

interface UseHistoricalChartParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
}

/**
 * Hook to fetch historical sales comparison by year
 */
export function useHistoricalChart(
  params?: UseHistoricalChartParams,
): UseQueryResult<HistoricalChartResponse, Error> {
  return useQuery<HistoricalChartResponse, Error>({
    queryKey: ['historical-chart', params],
    queryFn: () => dashboardApi.getHistoricalChart(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
