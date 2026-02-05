// Actions Service - Handles saving inventory actions to localStorage
// This can be replaced with actual API calls in production

import { PurchaseOrderData } from '@/components/ui/inventory-planning/forms/purchase-order-form';
import { TransferData } from '@/components/ui/inventory-planning/forms/transfer-form';
import { SafetyStockData } from '@/components/ui/inventory-planning/forms/safety-stock-form';

const STORAGE_KEYS = {
  PURCHASE_ORDERS: 'inventory_purchase_orders',
  TRANSFERS: 'inventory_transfers',
  SAFETY_STOCK_CHANGES: 'inventory_safety_stock_changes',
};

// Purchase Orders
export function savePurchaseOrder(order: PurchaseOrderData): void {
  const existing = getPurchaseOrders();
  const newOrder = {
    ...order,
    id: `PO-${Date.now()}`,
    status: 'pending' as const,
  };
  existing.push(newOrder);
  localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(existing));
}

export function getPurchaseOrders(): (PurchaseOrderData & {
  id: string;
  status: string;
})[] {
  if (typeof window === 'undefined') {return [];}
  const data = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
  return data ? JSON.parse(data) : [];
}

// Transfers
export function saveTransfer(transfer: TransferData): void {
  const existing = getTransfers();
  const newTransfer = {
    ...transfer,
    id: `TR-${Date.now()}`,
    status: 'pending' as const,
  };
  existing.push(newTransfer);
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(existing));
}

export function getTransfers(): (TransferData & {
  id: string;
  status: string;
})[] {
  if (typeof window === 'undefined') {return [];}
  const data = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
  return data ? JSON.parse(data) : [];
}

// Safety Stock Changes
export function saveSafetyStockChange(change: SafetyStockData): void {
  const existing = getSafetyStockChanges();
  const newChange = {
    ...change,
    id: `SS-${Date.now()}`,
  };
  existing.push(newChange);
  localStorage.setItem(
    STORAGE_KEYS.SAFETY_STOCK_CHANGES,
    JSON.stringify(existing),
  );
}

export function getSafetyStockChanges(): (SafetyStockData & { id: string })[] {
  if (typeof window === 'undefined') {return [];}
  const data = localStorage.getItem(STORAGE_KEYS.SAFETY_STOCK_CHANGES);
  return data ? JSON.parse(data) : [];
}

// Get all actions for a specific product
export function getProductActions(productKey: string) {
  return {
    purchaseOrders: getPurchaseOrders().filter(
      (o) => o.productKey === productKey,
    ),
    transfers: getTransfers().filter((t) => t.productKey === productKey),
    safetyStockChanges: getSafetyStockChanges().filter(
      (c) => c.productKey === productKey,
    ),
  };
}

// Clear all actions (for testing/reset)
export function clearAllActions(): void {
  localStorage.removeItem(STORAGE_KEYS.PURCHASE_ORDERS);
  localStorage.removeItem(STORAGE_KEYS.TRANSFERS);
  localStorage.removeItem(STORAGE_KEYS.SAFETY_STOCK_CHANGES);
}
