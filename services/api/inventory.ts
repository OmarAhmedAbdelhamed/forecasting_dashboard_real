/**
 * Inventory API endpoints
 */

import { apiClient } from './client';
import type {
  InventoryKPIs,
  InventoryItem,
  StockTrend,
  StorePerformance,
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from '../types/api';

export const inventoryApi = {
  /**
   * Get inventory KPIs
   */
  getKPIs: (params?: FilterParams) =>
    apiClient.get<InventoryKPIs>('/api/inventory/kpis', params),

  /**
   * Get paginated inventory items
   */
  getItems: (
    params?: FilterParams &
      PaginationParams & {
        status?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';
      },
  ) =>
    apiClient.get<PaginatedResponse<InventoryItem>>(
      '/api/inventory/items',
      params,
    ),

  /**
   * Get stock trends
   */
  getStockTrends: (
    params?: FilterParams & {
      days?: number;
    },
  ) =>
    apiClient.get<{ trends: StockTrend[] }>(
      '/api/inventory/stock-trends',
      params,
    ),

  /**
   * Get store performance
   */
  getStorePerformance: (params?: FilterParams) =>
    apiClient.get<{ stores: StorePerformance[] }>(
      '/api/inventory/store-performance',
      params,
    ),
};
