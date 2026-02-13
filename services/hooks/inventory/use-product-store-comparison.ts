'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';

interface UseProductStoreComparisonParams {
  productId: string;
  storeIds?: string[];
}

interface UseProductStoreComparisonOptions {
  enabled?: boolean;
}

export function useProductStoreComparison(
  params: UseProductStoreComparisonParams,
  options: UseProductStoreComparisonOptions = {},
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['product-store-comparison', params],
    queryFn: () => inventoryApi.getProductStoreComparison(params),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

