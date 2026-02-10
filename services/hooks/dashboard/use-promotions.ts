import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { FilterParams, PromotionsResponse } from '@/services/types/api';

export function useDashboardPromotions(
  params?: FilterParams,
): UseQueryResult<PromotionsResponse, Error> {
  return useQuery<PromotionsResponse, Error>({
    queryKey: ['dashboard-promotions', params],
    queryFn: () => dashboardApi.getPromotions(params),
    // Promotions are time-sensitive; avoid keeping an empty cached list around for minutes.
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: 'always',
    refetchInterval: 1000 * 60, // 1 minute
  });
}
