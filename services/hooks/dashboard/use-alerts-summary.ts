'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { AlertsSummary } from '@/services/types/api';

interface UseAlertsSummaryParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
}

/**
 * Hook to fetch alerts summary
 */
export function useAlertsSummary(
  params?: UseAlertsSummaryParams,
): UseQueryResult<AlertsSummary, Error> {
  return useQuery<AlertsSummary, Error>({
    queryKey: ['alerts-summary', params],
    queryFn: () => dashboardApi.getAlertsSummary(params),
    staleTime: 1000 * 60 * 2, // 2 minutes - alerts should be relatively fresh
  });
}
