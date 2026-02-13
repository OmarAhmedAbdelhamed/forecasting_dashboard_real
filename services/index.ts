/**
 * Central export for all API service hooks
 */

// Filter hooks
export { useRegionsHierarchy } from './hooks/filters/use-regions-hierarchy';
export { useStores } from './hooks/filters/use-stores';
export { useCategories } from './hooks/filters/use-categories';
export { useProducts } from './hooks/filters/use-products';
export { useReyonlar } from './hooks/filters/use-reyonlar';

// Dashboard hooks
export { useHistoricalChart } from './hooks/dashboard/use-historical-chart';
export { useAlertsSummary } from './hooks/dashboard/use-alerts-summary';
export { useDashboardMetrics } from './hooks/dashboard/use-metrics';
export { useRevenueChart } from './hooks/dashboard/use-revenue-chart';
export { useDashboardPromotions } from './hooks/dashboard/use-promotions';

// Forecasting hooks
export { usePromotionHistory } from './hooks/forecasting/use-promotion-history';
export { useSimilarCampaigns } from './hooks/forecasting/use-similar-campaigns';
export { usePromotionCalendar } from './hooks/forecasting/use-promotion-calendar';

// Inventory hooks
export { useInventoryKPIs } from './hooks/inventory/use-inventory-kpis';
export { useInventoryItems } from './hooks/inventory/use-inventory-items';
export { useStockTrends } from './hooks/inventory/use-stock-trends';
export { useStorePerformance } from './hooks/inventory/use-store-performance';
export { useInventoryAlerts } from './hooks/inventory/use-inventory-alerts';
export { useProductStoreComparison } from './hooks/inventory/use-product-store-comparison';
export { useMarketProductSearch } from './hooks/market/use-market-product-search';

// Export types
export type * from './types/api';
