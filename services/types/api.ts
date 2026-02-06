/**
 * API type definitions
 */

// Common filter types
export interface FilterParams {
  regionIds?: string[];
  storeIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
}

// Hierarchy types
export interface Product {
  value: string;
  label: string;
  forecastDemand: number;
  currentStock: number;
}

export interface Category {
  value: string;
  label: string;
  products: Product[];
}

export interface Store {
  value: string;
  label: string;
  categories: Category[];
}

export interface Region {
  value: string;
  label: string;
  stores: Store[];
}

export interface RegionsHierarchyResponse {
  regions: Region[];
}

// Flat list types
export interface StoreFlat {
  value: string;
  label: string;
  regionValue: string;
}

export interface CategoryFlat {
  value: string;
  label: string;
  storeValue: string;
}

export interface ProductFlat {
  value: string;
  label: string;
  categoryKey: string;
  forecastDemand: number;
  currentStock: number;
}

export interface Reyon {
  value: string;
  label: string;
}

// Inventory types
export interface InventoryKPIs {
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

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  productKey: string;
  stockLevel: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  forecastedDemand: number;
  stockValue: number;
  daysOfCoverage: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';
  turnoverRate: number;
  lastRestockDate: string | null;
  leadTimeDays: number;
  quantityOnOrder: number;
  todaysSales: number;
  price: number;
}

export interface StockTrend {
  date: string;
  actualStock: number;
  forecastDemand: number;
  safetyStock: number;
}

export interface StorePerformance {
  storeId: string;
  storeName: string;
  stockLevel: number;
  sellThroughRate: number;
  dailySales: number;
  daysOfInventory: number;
  storeEfficiency: number;
  stockEfficiency: number; // Added for component compatibility
}

// Chart types
export interface HistoricalChartData {
  week: string;
  [key: string]: string | number;
}

export interface HistoricalChartResponse {
  data: HistoricalChartData[];
  currentWeek?: number;
}

export interface RevenueChartItem {
  week: string;
  actualCiro: number;
  plan: number;
}

export interface RevenueChartResponse {
  data: RevenueChartItem[];
}

// Update types in services/types/api.ts
export interface DashboardMetrics {
  accuracy: number;
  accuracyChange: number;
  forecastValue: number;
  forecastUnit: number;
  forecastRevenue?: number;
  forecastChange: number;
  ytdValue: number;
  ytdRevenue?: number;
  ytdChange: number;
  gapToSales: number;
  gapToSalesChange: number;
}

export interface PromotionItem {
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  discount: string;
  status: string;
}

export interface PromotionsResponse {
  promotions: PromotionItem[];
}

// Alerts types
export interface AlertsSummary {
  summary: {
    lowGrowth: {
      count: number;
      severity: string;
    };
    highGrowth: {
      count: number;
      severity: string;
    };
    forecastErrors: {
      count: number;
      criticalCount: number;
      severity: string;
    };
    inventory: {
      count: number;
      stockout: number;
      overstock: number;
      reorder: number;
      severity: string;
    };
  };
  totalAlerts: number;
}

// Promotion types
export interface PromotionHistory {
  date: string;
  name: string;
  type: string;
  uplift: number;
  upliftVal: number;
  profit: number;
  stock: string;
  forecast: number;
  stockCostIncrease: number;
  lostSalesVal: number;
}

export interface SimilarCampaign {
  id: string;
  name: string;
  date: string;
  type: string;
  lift: number;
  stockOutDays: number;
  targetRevenue: number;
  actualRevenue: number;
  plannedStockDays: number;
  actualStockDays: number;
  sellThrough: number;
  markdownCost: number;
  similarityScore: number;
}

export interface PromotionCalendarEvent {
  date: string;
  promotions: {
    id: string;
    name: string;
    type: string;
    discount: number | null;
  }[];
}

// Demand Forecasting types
export interface DemandKPIs {
  totalForecast: {
    value: number;
    units: number;
    trend: number;
  };
  accuracy: {
    value: number;
    trend: number;
  };
  yoyGrowth: {
    value: number;
    trend: number;
  };
  bias: {
    value: number;
    type: 'over' | 'under';
    trend: string;
  };
  lowGrowthCount: number;
  highGrowthCount: number;
}

export interface DemandTrendData {
  date: string;
  actual: number | null;
  forecast: number | null;
  trendline: number;
}

export interface YearComparisonData {
  month: string;
  y2024: number;
  y2025: number;
  y2026: number | null;
}

export interface MonthlyBiasData {
  month: string;
  bias: number;
  forecast: number;
  actual: number;
}

export interface GrowthProduct {
  id: string;
  name: string;
  growth: number;
  type: 'high' | 'low';
  category: string;
  forecast: number;
  actualSales: number;
  lastMonthSales: number;
  store: string;
}

export interface ForecastErrorProduct {
  id: string;
  name: string;
  error: number;
  accuracy: number;
  forecast: number;
  actual: number;
  bias: number;
  action: string;
  storeCode: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'normal';
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
