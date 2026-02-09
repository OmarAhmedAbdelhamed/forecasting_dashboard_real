import { getDistance, getDistanceDisplay } from './store-distances';
import type { ProximityRecommendation } from '@/types/inventory';

/**
 * Store stock information for grouping
 */
interface StoreStockInfo {
  storeName: string;
  currentStock: number;
  threshold: number;
}

/**
 * Generic item type with optional store fields
 */
type StockItem = {
  sku: string;
  storeCode?: string;
  productKey?: string;
  currentStock: number;
  threshold: number;
};

/**
 * Group stock items by store for a specific SKU
 * @param sku - The SKU to filter by
 * @param items - Array of stock items
 * @returns Array of store stock information grouped by store
 */
export function groupStockByStore<T extends StockItem>(
  sku: string,
  items: T[]
): StoreStockInfo[] {
  // Filter items by SKU
  const filteredItems = items.filter((item) => item.sku === sku);

  // Group by store
  const storeMap = new Map<string, StoreStockInfo>();

  filteredItems.forEach((item) => {
    // Extract store name from storeCode or productKey
    let storeName: string;

    if (item.storeCode) {
      storeName = item.storeCode;
    } else if (item.productKey) {
      // Extract store code from productKey (e.g., "store-1-product" -> "store-1")
      const parts = item.productKey.split('-');
      storeName = parts.slice(0, 2).join('-'); // Take first two parts
    } else {
      // Skip items without store information
      return;
    }

    // Add to map (or update if already exists)
    storeMap.set(storeName, {
      storeName,
      currentStock: item.currentStock,
      threshold: item.threshold,
    });
  });

  return Array.from(storeMap.values());
}

/**
 * Find the closest N stores with surplus stock
 * @param alertStore - The store that needs stock (alert location)
 * @param allStoresStock - Array of all stores' stock information
 * @param topN - Maximum number of closest stores to return (default: 3)
 * @returns Array of proximity recommendations sorted by distance
 */
export function findClosestStoresWithStock(
  alertStore: string,
  allStoresStock: StoreStockInfo[],
  topN: number = 3
): ProximityRecommendation[] {
  // Filter stores with surplus stock (currentStock > threshold)
  // Exclude the alert store itself
  const surplusStores = allStoresStock
    .filter((store) => store.storeName !== alertStore)
    .filter((store) => store.currentStock > store.threshold)
    .map((store) => {
      // Calculate distance from alert store to this store
      const distance = getDistance(alertStore, store.storeName);
      const distanceDisplay = getDistanceDisplay(alertStore, store.storeName);

      return {
        storeName: store.storeName,
        distance: distance ?? Number.MAX_VALUE, // Put unknown distances at the end
        distanceDisplay,
        availableStock: store.currentStock,
        isSurplus: true,
      } as ProximityRecommendation;
    });

  // Sort by distance (ascending)
  surplusStores.sort((a, b) => a.distance - b.distance);

  // Return top N results
  return surplusStores.slice(0, topN);
}
