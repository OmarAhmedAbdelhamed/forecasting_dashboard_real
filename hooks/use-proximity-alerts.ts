import { useMemo } from 'react';
import { groupStockByStore, findClosestStoresWithStock } from '@/lib/proximity-utils';
import type { InventoryAlert, InventoryItem, ProximityRecommendation } from '@/types/inventory';

interface UseProximityAlertsOptions {
  topN?: number;
}

interface UseProximityAlertsResult {
  enhancedAlerts: (InventoryAlert & {
    proximityOptions?: ProximityRecommendation[];
    noTransferOptions?: boolean;
  })[];
}

/**
 * React hook to enhance inventory alerts with proximity-based stock transfer recommendations.
 *
 * This hook processes stockout and reorder alerts to find nearby stores with surplus stock
 * that could transfer inventory to resolve the alert.
 *
 * @param alerts - Array of inventory alerts to enhance
 * @param inventoryItems - Array of all inventory items across all stores
 * @param options - Configuration options
 * @param options.topN - Maximum number of closest stores to return (default: 3)
 * @returns Enhanced alerts with proximity options or noTransferOptions flag
 *
 * @example
 * ```tsx
 * const { enhancedAlerts } = useProximityAlerts(alerts, inventoryItems, { topN: 5 });
 *
 * enhancedAlerts.map(alert => {
 *   if (alert.noTransferOptions) {
 *     return <Alert key={alert.id}>No nearby stores have surplus stock</Alert>;
 *   }
 *
 *   return (
 *     <Alert key={alert.id}>
 *       Transfer from:
 *       {alert.proximityOptions?.map(option => (
 *         <TransferOption key={option.storeName} {...option} />
 *       ))}
 *     </Alert>
 *   );
 * });
 * ```
 */
export function useProximityAlerts(
  alerts: InventoryAlert[],
  inventoryItems: InventoryItem[],
  options: UseProximityAlertsOptions = {}
): UseProximityAlertsResult {
  const { topN = 3 } = options;

  const enhancedAlerts = useMemo(() => {
    return alerts.map((alert) => {
      // Only process stockout and reorder alerts
      if (alert.type !== 'stockout' && alert.type !== 'reorder') {
        return alert;
      }

      // Skip alerts without store name
      if (!alert.storeName) {
        return alert;
      }

      // Extract store code from store name (format: "Store Name - 123")
      const storeCodeMatch = alert.storeName.match(/-\s*(\d+)\s*$/);
      const alertStore = storeCodeMatch ? storeCodeMatch[1] : alert.storeName;

      // Map inventory items to format expected by groupStockByStore
      // InventoryItem has stockLevel and minStockLevel (reorderPoint)
      const stockItems = inventoryItems.map((item) => ({
        sku: item.sku,
        storeCode: item.id, // Use id as storeCode since InventoryItem doesn't have storeCode
        currentStock: item.stockLevel,
        threshold: item.reorderPoint, // Use reorderPoint as threshold
      }));

      // Group stock by store for this SKU
      const storeStock = groupStockByStore(alert.sku, stockItems);

      // Find closest stores with surplus stock
      const proximityOptions = findClosestStoresWithStock(alertStore, storeStock, topN);

      // Add proximity options if found, otherwise add noTransferOptions flag
      if (proximityOptions.length > 0) {
        return {
          ...alert,
          proximityOptions,
        };
      } else {
        return {
          ...alert,
          noTransferOptions: true,
        };
      }
    });
  }, [alerts, inventoryItems, topN]);

  return { enhancedAlerts };
}
