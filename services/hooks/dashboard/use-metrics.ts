'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { FilterParams, DashboardMetrics } from '@/services/types/api';

export function useDashboardMetrics(
  params?: FilterParams,
): UseQueryResult<DashboardMetrics, Error> {
  return useQuery<DashboardMetrics, Error>({
    queryKey: ['dashboard-metrics', params],
    queryFn: () => dashboardApi.getMetrics(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
