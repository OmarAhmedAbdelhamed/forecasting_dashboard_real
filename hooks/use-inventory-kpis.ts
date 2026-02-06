'use client';

import { useQuery } from '@tanstack/react-query';

interface InventoryKPIs {
  totalStockValue: number;
  totalInventoryItems: number;
  stockCoverageDays: number;
  excessInventoryItems: number;
  excessInventoryValue: number;
  stockOutRiskItems: number;
  stockOutRiskValue: number;
  neverSoldItems: number;
  neverSoldValue: number;
  overstockPercentage: number;
  reorderNeededItems: number;
}

interface UseInventoryKPIsParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
}

const API_BASE_URL = 'http://localhost:8000';

export function useInventoryKPIs(params: UseInventoryKPIsParams = {}) {
  return useQuery<InventoryKPIs>({
    queryKey: ['inventory-kpis', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (params.regionIds?.length) {
        params.regionIds.forEach(id => searchParams.append('regionIds', id));
      }
      if (params.storeIds?.length) {
        params.storeIds.forEach(id => searchParams.append('storeIds', id));
      }
      if (params.categoryIds?.length) {
        params.categoryIds.forEach(id => searchParams.append('categoryIds', id));
      }
      if (params.productIds?.length) {
        params.productIds.forEach(id => searchParams.append('productIds', id));
      }

      const url = `${API_BASE_URL}/api/inventory/kpis?${searchParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory KPIs');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
