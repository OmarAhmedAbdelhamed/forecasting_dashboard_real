'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import type { FilterParams } from '../../types/api';

/**
 * Hook to fetch store performance
 */
export function useStorePerformance(params?: FilterParams & { days?: number }) {
  return useQuery({
    queryKey: ['store-performance', params],
    queryFn: () => inventoryApi.getStorePerformance(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
