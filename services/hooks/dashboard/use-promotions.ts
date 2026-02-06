import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import { FilterParams, PromotionsResponse } from '@/services/types/api';

export function useDashboardPromotions(
  params?: FilterParams,
): UseQueryResult<PromotionsResponse, Error> {
  return useQuery<PromotionsResponse, Error>({
    queryKey: ['dashboard-promotions', params],
    queryFn: () => dashboardApi.getPromotions(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
