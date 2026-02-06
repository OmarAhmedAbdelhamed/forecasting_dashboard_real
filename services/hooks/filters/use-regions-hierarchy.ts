'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';

/**
 * Hook to fetch complete hierarchy: Region -> Store -> Category -> Product
 */
export function useRegionsHierarchy() {
  return useQuery({
    queryKey: ['regions-hierarchy'],
    queryFn: () => filtersApi.getHierarchy(),
    staleTime: 1000 * 60 * 10, // 10 minutes - hierarchy doesn't change often
  });
}
