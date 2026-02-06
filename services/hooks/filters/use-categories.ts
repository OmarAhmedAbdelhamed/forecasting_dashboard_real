'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';

interface UseCategoriesParams {
  storeIds?: string[];
  regionIds?: string[];
}

/**
 * Hook to fetch flat list of categories, optionally filtered by stores/regions
 */
export function useCategories(params?: UseCategoriesParams) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => filtersApi.getCategories(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
