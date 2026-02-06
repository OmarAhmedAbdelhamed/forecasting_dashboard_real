'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';

interface UseProductsParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
}

/**
 * Hook to fetch flat list of products, optionally filtered by regions/stores/categories
 */
export function useProducts(params: UseProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => filtersApi.getProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
