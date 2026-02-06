/**
 * Filter API endpoints
 */

import { apiClient } from './client';
import type {
  RegionsHierarchyResponse,
  StoreFlat,
  CategoryFlat,
  ProductFlat,
  Reyon,
} from '../types/api';

export const filtersApi = {
  /**
   * Get complete hierarchy: Region -> Store -> Category -> Product
   */
  getHierarchy: () => apiClient.get<RegionsHierarchyResponse>('/api/hierarchy'),

  /**
   * Get flat list of stores, optionally filtered by regions
   */
  getStores: (regionIds?: string[]) =>
    apiClient.get<{ stores: StoreFlat[] }>('/api/stores', { regionIds }),

  /**
   * Get flat list of categories, optionally filtered by stores/regions
   */
  getCategories: (params?: { storeIds?: string[]; regionIds?: string[] }) =>
    apiClient.get<{ categories: CategoryFlat[] }>('/api/categories', params),

  /**
   * Get flat list of products, optionally filtered by regions/stores/categories
   */
  getProducts: (params?: {
    regionIds?: string[];
    storeIds?: string[];
    categoryIds?: string[];
  }) => apiClient.get<{ products: ProductFlat[] }>('/api/products', params),

  /**
   * Get list of reyonlar (departments)
   */
  getReyonlar: () => apiClient.get<{ reyonlar: Reyon[] }>('/api/reyonlar'),
};
