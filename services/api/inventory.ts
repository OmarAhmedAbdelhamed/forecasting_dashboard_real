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
import type { InventoryAlert } from '@/types/inventory';

export const inventoryApi = {
  /**
   * Get inventory KPIs
   */
  getKPIs: (params?: FilterParams & { days?: number }) =>
    apiClient.get<InventoryKPIs>('/api/inventory/kpis', params),

  /**
   * Get paginated inventory items
   */
  getItems: (
    params?: FilterParams &
      PaginationParams & {
        status?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';
        days?: number;
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
  getStorePerformance: (params?: FilterParams & { days?: number }) =>
    apiClient.get<{ stores: StorePerformance[] }>(
      '/api/inventory/store-performance',
      params,
    ),

  /**
   * Get inventory alerts
   */
  getAlerts: (params?: FilterParams & { limit?: number; days?: number }) =>
    apiClient.get<{ alerts: InventoryAlert[]; totalCount?: number }>(
      '/api/alerts/inventory',
      params,
    ),
};
