'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import type { FilterParams } from '../../types/api';

interface UseStockTrendsParams extends FilterParams {
  days?: number;
}

/**
 * Hook to fetch stock trends
 */
export function useStockTrends(params?: UseStockTrendsParams) {
  return useQuery({
    queryKey: ['stock-trends', params],
    queryFn: () => inventoryApi.getStockTrends(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
