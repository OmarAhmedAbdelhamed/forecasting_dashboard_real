'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';

/**
 * Hook to fetch list of reyonlar (departments)
 */
export function useReyonlar() {
  return useQuery({
    queryKey: ['reyonlar'],
    queryFn: () => filtersApi.getReyonlar(),
    staleTime: 1000 * 60 * 10, // 10 minutes - departments don't change often
  });
}
