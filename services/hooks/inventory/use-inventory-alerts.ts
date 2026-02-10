/**
 * Hook for fetching inventory alerts
 */
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import type { FilterParams } from '../../types/api';

export function useInventoryAlerts(
  params?: FilterParams & { limit?: number; days?: number },
) {
  return useQuery({
    queryKey: ['inventoryAlerts', params],
    queryFn: () => inventoryApi.getAlerts(params),
    select: (data) => data.alerts,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
