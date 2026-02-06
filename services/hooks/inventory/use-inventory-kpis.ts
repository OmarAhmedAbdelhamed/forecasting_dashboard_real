'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import type { FilterParams } from '../../types/api';

/**
 * Hook to fetch inventory KPIs
 */
export function useInventoryKPIs(params?: FilterParams) {
  return useQuery({
    queryKey: ['inventory-kpis', params],
    queryFn: () => inventoryApi.getKPIs(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
