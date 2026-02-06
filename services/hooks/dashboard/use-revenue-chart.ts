'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { FilterParams, RevenueChartResponse } from '@/services/types/api';

export function useRevenueChart(
  params?: FilterParams,
): UseQueryResult<RevenueChartResponse, Error> {
  return useQuery<RevenueChartResponse, Error>({
    queryKey: ['dashboard-revenue-chart', params],
    queryFn: () => dashboardApi.getRevenueChart(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
