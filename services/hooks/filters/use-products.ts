'use client';

import { useQuery } from '@tanstack/react-query';
import { filtersApi } from '../../api/filters';
import { useEffect } from 'react';

interface UseProductsParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
}

/**
 * Hook to fetch flat list of products, optionally filtered by regions/stores/categories
 */
export function useProducts(params: UseProductsParams = {}) {
  const query = useQuery({
    queryKey: ['products', params],
    queryFn: () => filtersApi.getProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    if (!query.data) {
      return;
    }
    // Raw products payload from `/api/products` (before any dedupe/transform in `useFilterOptions`).
    // eslint-disable-next-line no-console
    console.log('API /api/products response:', query.data);
  }, [query.data]);

  return query;
}
