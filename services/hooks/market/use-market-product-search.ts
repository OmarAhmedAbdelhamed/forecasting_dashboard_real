'use client';

import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../../api/market';
import type { MarketSearchRequest } from '../../types/api';

interface UseMarketProductSearchOptions {
  enabled?: boolean;
}

export function useMarketProductSearch(
  params: MarketSearchRequest,
  options: UseMarketProductSearchOptions = {},
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['market-product-search', params],
    queryFn: () => marketApi.searchProduct(params),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

