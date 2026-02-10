'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import type { FilterParams, PaginationParams } from '../../types/api';

interface UseInventoryItemsParams extends FilterParams, PaginationParams {
  status?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';
  days?: number;
}

/**
 * Hook to fetch paginated inventory items
 */
export function useInventoryItems(params?: UseInventoryItemsParams) {
  return useQuery({
    queryKey: ['inventory-items', params],
    queryFn: () => inventoryApi.getItems(params),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
