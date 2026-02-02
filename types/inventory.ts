export type InventoryStatus =
  | 'In Stock'
  | 'Low Stock'
  | 'Out of Stock'
  | 'Overstock';

export interface InventoryItem {
  id: string;
  sku: string;
  name?: string; // Optional for compatibility
  productName: string;
  category: string;
  productKey?: string; // Link to global mock data key
  stockLevel: number;
  minStockLevel: number; // Safety Stock
  maxStockLevel: number;
  reorderPoint: number;
  forecastedDemand: number; // Next 30 days
  stockValue: number;
  daysOfCoverage: number;
  status: InventoryStatus;
  turnoverRate: number;
  lastRestockDate: string;
  leadTimeDays: number;
  quantityOnOrder: number;
  todaysSales: number;
  price: number;
}

export interface InventoryKPIs {
  totalStockValue: number;
  totalInventoryItems: number;
  stockCoverageDays: number;
  excessInventoryValue: number;
  excessInventoryItems: number;
  stockOutRiskItems: number;
  stockOutRiskValue: number;
  neverSoldItems: number;
  neverSoldValue: number;
  overstockPercentage: number;
  reorderNeededItems: number;
}

export interface StockTrendPoint {
  date: string;
  actualStock: number;
  forecastDemand: number;
  safetyStock: number;
}

export interface StoreInventoryPerformance {
  storeId: string;
  storeName: string;
  stockLevel: number;
  sellThroughRate: number; // Percentage 0-100
  dailySales: number; // Daily average units
  daysOfInventory: number;
  stockEfficiency: number; // 0-100 score
}

export interface InventoryAlert {
  id: string;
  type:
    | 'stockout'
    | 'overstock'
    | 'reorder'
    | 'expiration'
    | 'deadstock'
    | 'surge';
  sku: string;
  productName: string;
  storeName?: string;
  message: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  metrics?: {
    currentStock: number;
    threshold?: number;
    forecastedDemand?: number;
    transferSourceStore?: string;
    transferQuantity?: number;
  };
  recommendation?: string;
  actionType?: 'reorder' | 'transfer' | 'promotion' | 'review';
}

export interface CustomProductList {
  id: string;
  name: string;
  itemCount: number;
  lastModified: string;
  skus: string[];
}
