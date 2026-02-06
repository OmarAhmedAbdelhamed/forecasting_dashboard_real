'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';

interface UseStoresParams {
  regionIds?: string[];
}

/**
 * Hook to fetch flat list of stores, optionally filtered by regions
 */
export function useStores(params: UseStoresParams = {}) {
  const { regionIds } = params;

  return useQuery({
    queryKey: ['stores', regionIds],
    queryFn: () => filtersApi.getStores(regionIds),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
