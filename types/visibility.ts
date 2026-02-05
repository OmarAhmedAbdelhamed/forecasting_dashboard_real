import type { UserRole } from './auth';

/**
 * Component identifiers for granular visibility control
 * Each ID represents a specific UI element that can be shown/hidden per role
 */

// ============ KPI CARD IDs ============
export type KpiId =
  // Overview KPIs
  | 'overview-model-accuracy'
  | 'overview-30day-forecast'
  | 'overview-ytd-value'
  | 'overview-forecast-gap'
  | 'overview-sales-vs-target'
  | 'overview-regional-forecast'
  | 'overview-category-growth'
  | 'overview-critical-stock'
  | 'overview-model-accuracy-detailed'
  | 'overview-inventory-turnover'
  | 'overview-inventory-value'
  // Demand Forecasting KPIs
  | 'demand-total-forecast'
  | 'demand-accuracy'
  | 'demand-yoy-growth'
  | 'demand-bias'
  | 'demand-low-growth'
  | 'demand-high-growth'
  // Promotion KPIs
  | 'promo-total-forecast'
  | 'promo-expected-revenue'
  | 'promo-roi'
  | 'promo-stock-status'
  | 'promo-best-performing'
  | 'promo-stock-risk'
  | 'promo-benchmark'
  // Financial KPIs
  | 'fin-forecasted-revenue'
  | 'fin-budget-achievement'
  | 'fin-inventory-value'
  | 'fin-forecasted-margin'
  | 'fin-forecast-vs-budget'
  | 'fin-dead-stock'
  // Operational KPIs
  | 'ops-order-volume'
  | 'ops-capacity-utilization'
  | 'ops-supplier-fill-rate'
  | 'ops-forecasted-waste'
  | 'ops-inbound-load'
  | 'ops-order-requirements';

// ============ CHART IDs ============
export type ChartId =
  // Overview Charts
  | 'overview-revenue-target-chart'
  | 'overview-historical-units-chart'
  | 'overview-demand-variability-chart'
  | 'overview-forecast-vs-actual-chart'
  // Demand Forecasting Charts
  | 'demand-trend-forecast-chart'
  | 'demand-year-comparison-chart'
  | 'demand-bias-risk-chart'
  | 'demand-promotion-impact-chart'
  | 'demand-growth-analysis-chart'
  | 'demand-forecast-errors-chart'
  // Promotion Charts
  | 'promo-campaign-vs-normal-chart'
  | 'promo-effectiveness-chart'
  | 'promo-calendar-view'
  // Financial Charts
  | 'fin-tl-based-trend-chart'
  | 'fin-budget-comparison-chart'
  | 'fin-margin-analysis-chart'
  // Operational Charts
  | 'ops-capacity-chart'
  | 'ops-supplier-performance-chart';

// ============ TABLE IDs ============
export type TableId =
  // Overview Tables
  | 'overview-upcoming-promotions'
  | 'overview-stock-risks'
  | 'overview-fastest-moving-products'
  | 'overview-store-comparisons'
  // Demand Forecasting Tables
  | 'demand-growth-analysis-table'
  | 'demand-forecast-errors-table'
  | 'demand-product-level-forecast'
  | 'demand-high-error-products'
  // Promotion Tables
  | 'promo-similar-campaigns'
  | 'promo-campaign-history'
  | 'promo-best-performing-types'
  | 'promo-low-performing-alerts'
  | 'promo-missed-opportunities'
  // Financial Tables
  | 'fin-revenue-breakdown'
  | 'fin-budget-variance'
  // Operational Tables
  | 'ops-order-requirements'
  | 'ops-supplier-performance';

// ============ ALERT IDs ============
export type AlertId =
  | 'alert-low-growth'
  | 'alert-high-growth'
  | 'alert-forecast-errors'
  | 'alert-critical-stock'
  | 'alert-high-bias'
  | 'alert-extreme-changes'
  | 'alert-dead-stock'
  | 'alert-promo-low-performance'
  | 'alert-missed-opportunities';

// ============ FILTER IDs ============
export type FilterId =
  | 'filter-region'
  | 'filter-store'
  | 'filter-category'
  | 'filter-product'
  | 'filter-period'
  | 'filter-date-range'
  | 'filter-promo-type'
  | 'filter-granularity';

// ============ ACTION BUTTON IDs ============
export type ActionId =
  | 'action-export'
  | 'action-create-promo'
  | 'action-adjust-forecast'
  | 'action-manage-stock'
  | 'action-approve-budget';

/**
 * Section visibility configuration
 * Defines which elements (KPIs, charts, tables, alerts, filters, actions) are visible for a given section
 */
export interface SectionVisibility {
  /** Which KPI cards to show (undefined = show all, empty array = show none) */
  kpiCards?: KpiId[] | 'all';
  /** Which charts to show */
  charts?: ChartId[] | 'all';
  /** Which tables to show */
  tables?: TableId[] | 'all';
  /** Which alerts to show */
  alerts?: AlertId[] | 'all';
  /** Which filters are available */
  filters?: FilterId[] | 'all';
  /** Which action buttons to show */
  actions?: ActionId[] | 'all';
  /** Elements to explicitly hide (overrides includes) */
  hideElements?: (KpiId | ChartId | TableId | AlertId | FilterId | ActionId)[];
}

/**
 * Complete role visibility configuration
 * Maps each dashboard section to its visibility settings
 */
export interface RoleVisibilityConfig {
  overview: SectionVisibility;
  demandForecasting: SectionVisibility;
  promotionView: SectionVisibility;
  financialOverview?: SectionVisibility;
  operationalOverview?: SectionVisibility;
  inventoryPlanning: SectionVisibility;
}

/**
 * Data scope configuration per section
 * Controls what data scope (all/region/store/category) applies by default
 */
export interface SectionDataScope {
  scope: 'all' | 'region' | 'store' | 'category';
  defaultFilters?: {
    regions?: string[];
    stores?: string[];
    categories?: string[];
  };
}

/**
 * Complete visibility mapping for all roles
 * This is the single source of truth for role-based UI visibility
 */
export const ROLE_VISIBILITY: Record<UserRole, RoleVisibilityConfig> = {
  // ==================== SUPER ADMIN ====================
  super_admin: {
    overview: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
    demandForecasting: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
    promotionView: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
    financialOverview: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
    operationalOverview: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
    inventoryPlanning: {
      kpiCards: 'all',
      charts: 'all',
      tables: 'all',
      alerts: 'all',
      filters: 'all',
      actions: 'all',
    },
  },

  // ==================== GENERAL MANAGER ====================
  // SEE: All KPI scorecards, all charts, upcoming promotions list, Alert Center summary
  // HIDE: SKU/product-level tables, detailed stock lists, operational action buttons
  general_manager: {
    overview: {
      kpiCards: [
        'overview-model-accuracy',
        'overview-30day-forecast',
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
      ],
      charts: [
        'overview-revenue-target-chart',
        'overview-historical-units-chart',
        'overview-demand-variability-chart',
      ],
      tables: [
        'overview-upcoming-promotions',
        'overview-store-comparisons',
      ],
      alerts: ['alert-critical-stock', 'alert-high-bias'],
      filters: ['filter-region', 'filter-store', 'filter-category'],
      actions: ['action-export'],
      hideElements: [
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-stock-risks',
        'overview-fastest-moving-products',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-accuracy',
        'demand-yoy-growth',
        'demand-low-growth',
        'demand-high-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
        'demand-year-comparison-chart',
        'demand-growth-analysis-chart',
      ],
      tables: ['demand-product-level-forecast'],
      alerts: ['alert-critical-stock', 'alert-high-bias'],
      filters: ['filter-region', 'filter-store', 'filter-category', 'filter-period'],
      actions: ['action-export'],
      hideElements: [
        'demand-bias',
        'demand-forecast-errors-table',
        'demand-high-error-products',
        'demand-promotion-impact-chart',
        'demand-bias-risk-chart',
      ],
    },
    promotionView: {
      kpiCards: ['promo-total-forecast', 'promo-expected-revenue', 'promo-best-performing'],
      charts: ['promo-campaign-vs-normal-chart', 'promo-calendar-view'],
      tables: ['promo-similar-campaigns', 'promo-campaign-history'],
      alerts: ['alert-promo-low-performance', 'alert-missed-opportunities'],
      filters: ['filter-region', 'filter-store', 'filter-promo-type', 'filter-date-range'],
      actions: ['action-export', 'action-create-promo'],
      hideElements: [
        'promo-stock-risk',
        'promo-stock-status',
      ],
    },
    inventoryPlanning: {
      kpiCards: ['overview-inventory-turnover', 'overview-inventory-value'],
      charts: ['overview-forecast-vs-actual-chart'],
      tables: ['overview-store-comparisons'],
      alerts: ['alert-critical-stock', 'alert-extreme-changes'],
      filters: ['filter-region', 'filter-store'],
      actions: [],
      hideElements: [
        'overview-stock-risks',
        'overview-fastest-moving-products',
      ],
    },
  },

  // ==================== BUYER ====================
  // SEE: 30/60-day forecast KPIs, critical stock risk, History + Forecast chart,
  //      Demand Variability chart, low stock & fast-growing alerts
  // HIDE: Financial KPIs, campaign performance charts, model accuracy KPIs
  buyer: {
    overview: {
      kpiCards: [
        'overview-30day-forecast',
        'overview-critical-stock',
      ],
      charts: [
        'overview-historical-units-chart',
        'overview-demand-variability-chart',
      ],
      tables: [
        'overview-stock-risks',
        'overview-fastest-moving-products',
      ],
      alerts: ['alert-low-growth', 'alert-high-growth', 'alert-critical-stock'],
      filters: ['filter-store', 'filter-category', 'filter-product'],
      actions: [],
      hideElements: [
        'overview-model-accuracy',
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-revenue-target-chart',
        'overview-upcoming-promotions',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-yoy-growth',
        'demand-low-growth',
        'demand-high-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
        'demand-year-comparison-chart',
        'demand-growth-analysis-chart',
      ],
      tables: [
        'demand-growth-analysis-table',
        'demand-product-level-forecast',
        'demand-high-error-products',
      ],
      alerts: ['alert-low-growth', 'alert-high-growth', 'alert-critical-stock'],
      filters: [
        'filter-product',
        'filter-category',
        'filter-store',
        'filter-region',
        'filter-period',
      ],
      actions: ['action-export'],
      hideElements: [
        'demand-accuracy',
        'demand-bias',
        'demand-promotion-impact-chart',
        'demand-bias-risk-chart',
        'demand-forecast-errors-table',
      ],
    },
    promotionView: {
      kpiCards: ['promo-total-forecast'],
      charts: [],
      tables: ['promo-campaign-history'],
      alerts: [],
      filters: ['filter-category', 'filter-product', 'filter-promo-type'],
      actions: [],
      hideElements: [
        'promo-expected-revenue',
        'promo-roi',
        'promo-best-performing',
        'promo-stock-risk',
        'promo-benchmark',
        'promo-campaign-vs-normal-chart',
        'promo-calendar-view',
        'promo-similar-campaigns',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
    },
    inventoryPlanning: {
      kpiCards: ['overview-critical-stock', 'overview-inventory-value'],
      charts: ['overview-historical-units-chart', 'overview-demand-variability-chart'],
      tables: ['overview-stock-risks', 'overview-fastest-moving-products'],
      alerts: ['alert-critical-stock', 'alert-low-growth', 'alert-high-growth'],
      filters: ['filter-category', 'filter-product', 'filter-store'],
      actions: ['action-manage-stock'],
      hideElements: [
        'overview-inventory-turnover',
      ],
    },
  },

  // ==================== INVENTORY PLANNER ====================
  // SEE: Model accuracy, Forecast vs Actual, inventory turnover rate, inventory value,
  //      alerts (critical stock, high bias, extreme changes)
  // HIDE: Revenue targets, budget KPIs, campaign ROI
  inventory_planner: {
    overview: {
      kpiCards: [
        'overview-model-accuracy',
        'overview-30day-forecast',
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-inventory-value',
      ],
      charts: [
        'overview-historical-units-chart',
        'overview-forecast-vs-actual-chart',
      ],
      tables: [
        'overview-stock-risks',
        'overview-fastest-moving-products',
      ],
      alerts: [
        'alert-critical-stock',
        'alert-high-bias',
        'alert-extreme-changes',
        'alert-forecast-errors',
      ],
      filters: ['filter-region', 'filter-store', 'filter-category', 'filter-product'],
      actions: ['action-export', 'action-manage-stock'],
      hideElements: [
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
        'overview-revenue-target-chart',
        'overview-upcoming-promotions',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-accuracy',
        'demand-yoy-growth',
        'demand-bias',
        'demand-low-growth',
        'demand-high-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
        'demand-bias-risk-chart',
        'demand-year-comparison-chart',
        'demand-growth-analysis-chart',
      ],
      tables: [
        'demand-growth-analysis-table',
        'demand-forecast-errors-table',
        'demand-product-level-forecast',
        'demand-high-error-products',
      ],
      alerts: ['alert-critical-stock', 'alert-high-bias', 'alert-extreme-changes'],
      filters: [
        'filter-product',
        'filter-store',
        'filter-region',
        'filter-category',
        'filter-period',
      ],
      actions: ['action-export', 'action-adjust-forecast'],
      hideElements: [
        'demand-promotion-impact-chart',
      ],
    },
    promotionView: {
      kpiCards: ['promo-total-forecast', 'promo-stock-status'],
      charts: ['promo-calendar-view'],
      tables: ['promo-campaign-history'],
      alerts: ['alert-critical-stock'],
      filters: ['filter-category', 'filter-product', 'filter-promo-type', 'filter-date-range'],
      actions: ['action-manage-stock'],
      hideElements: [
        'promo-expected-revenue',
        'promo-roi',
        'promo-best-performing',
        'promo-stock-risk',
        'promo-benchmark',
        'promo-campaign-vs-normal-chart',
        'promo-effectiveness-chart',
        'promo-similar-campaigns',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
    },
    inventoryPlanning: {
      kpiCards: [
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-critical-stock',
      ],
      charts: [
        'overview-forecast-vs-actual-chart',
        'overview-demand-variability-chart',
      ],
      tables: [
        'overview-stock-risks',
        'overview-fastest-moving-products',
      ],
      alerts: [
        'alert-critical-stock',
        'alert-high-bias',
        'alert-extreme-changes',
        'alert-dead-stock',
      ],
      filters: ['filter-region', 'filter-store', 'filter-category', 'filter-product'],
      actions: ['action-export', 'action-manage-stock'],
      hideElements: [],
    },
  },

  // ==================== REGIONAL MANAGER ====================
  // Region-Based: Sales vs target, regional forecast, store comparisons,
  //              category growth, stores with stock issues
  // HIDE: Company-wide KPIs, product-level forecast error tables, financial budget KPIs
  regional_manager: {
    overview: {
      kpiCards: [
        'overview-30day-forecast',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
        'overview-critical-stock',
      ],
      charts: [
        'overview-revenue-target-chart',
        'overview-historical-units-chart',
      ],
      tables: [
        'overview-store-comparisons',
        'overview-stock-risks',
      ],
      alerts: ['alert-critical-stock', 'alert-extreme-changes'],
      filters: ['filter-store', 'filter-category'],
      actions: [],
      hideElements: [
        'overview-model-accuracy',
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-demand-variability-chart',
        'overview-upcoming-promotions',
        'overview-fastest-moving-products',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-yoy-growth',
        'demand-low-growth',
        'demand-high-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
        'demand-growth-analysis-chart',
      ],
      tables: ['demand-product-level-forecast'],
      alerts: ['alert-low-growth', 'alert-critical-stock'],
      filters: ['filter-store', 'filter-category', 'filter-period'],
      actions: [],
      hideElements: [
        'demand-accuracy',
        'demand-bias',
        'demand-year-comparison-chart',
        'demand-bias-risk-chart',
        'demand-forecast-errors-table',
        'demand-high-error-products',
      ],
    },
    promotionView: {
      kpiCards: ['promo-total-forecast', 'promo-stock-status'],
      charts: ['promo-calendar-view'],
      tables: ['promo-campaign-history'],
      alerts: ['alert-critical-stock'],
      filters: ['filter-store', 'filter-promo-type', 'filter-date-range'],
      actions: [],
      hideElements: [
        'promo-expected-revenue',
        'promo-roi',
        'promo-best-performing',
        'promo-stock-risk',
        'promo-benchmark',
        'promo-campaign-vs-normal-chart',
        'promo-effectiveness-chart',
        'promo-similar-campaigns',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
    },
    inventoryPlanning: {
      kpiCards: ['overview-critical-stock', 'overview-inventory-turnover'],
      charts: ['overview-forecast-vs-actual-chart'],
      tables: ['overview-stock-risks', 'overview-store-comparisons'],
      alerts: ['alert-critical-stock'],
      filters: ['filter-store', 'filter-category'],
      actions: [],
      hideElements: [
        'overview-inventory-value',
        'overview-fastest-moving-products',
      ],
    },
  },

  // ==================== STORE MANAGER ====================
  // Store-Based: Weekly/monthly forecast, critical stock, risky products, upcoming promotions
  // HIDE: Regional/company comparisons, model accuracy, financial KPIs, promotion ROI
  store_manager: {
    overview: {
      kpiCards: [
        'overview-30day-forecast',
        'overview-critical-stock',
      ],
      charts: [
        'overview-historical-units-chart',
      ],
      tables: [
        'overview-upcoming-promotions',
        'overview-stock-risks',
      ],
      alerts: ['alert-critical-stock', 'alert-extreme-changes'],
      filters: ['filter-category'],
      actions: [],
      hideElements: [
        'overview-model-accuracy',
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-revenue-target-chart',
        'overview-demand-variability-chart',
        'overview-forecast-vs-actual-chart',
        'overview-store-comparisons',
        'overview-fastest-moving-products',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-low-growth',
        'demand-high-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
      ],
      tables: ['demand-product-level-forecast'],
      alerts: ['alert-critical-stock'],
      filters: ['filter-category', 'filter-period'],
      actions: [],
      hideElements: [
        'demand-accuracy',
        'demand-yoy-growth',
        'demand-bias',
        'demand-year-comparison-chart',
        'demand-bias-risk-chart',
        'demand-growth-analysis-chart',
        'demand-forecast-errors-table',
        'demand-high-error-products',
        'demand-promotion-impact-chart',
      ],
    },
    promotionView: {
      kpiCards: ['promo-total-forecast', 'promo-stock-status'],
      charts: ['promo-calendar-view'],
      tables: ['promo-campaign-history'],
      alerts: [],
      filters: ['filter-promo-type', 'filter-date-range'],
      actions: [],
      hideElements: [
        'promo-expected-revenue',
        'promo-roi',
        'promo-best-performing',
        'promo-stock-risk',
        'promo-benchmark',
        'promo-campaign-vs-normal-chart',
        'promo-effectiveness-chart',
        'promo-similar-campaigns',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
    },
    inventoryPlanning: {
      kpiCards: ['overview-critical-stock'],
      charts: ['overview-forecast-vs-actual-chart'],
      tables: ['overview-stock-risks'],
      alerts: ['alert-critical-stock', 'alert-dead-stock'],
      filters: ['filter-category'],
      actions: ['action-manage-stock'],
      hideElements: [
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-fastest-moving-products',
        'overview-store-comparisons',
      ],
    },
  },

  // ==================== FINANCE ====================
  // SEE: Forecasted revenue, budget achievement, inventory value, forecasted gross margin,
  //      forecast vs budget, dead stock alerts
  // HIDE: Product-level trends, model training details, campaign configurations
  finance: {
    overview: {
      kpiCards: [
        'overview-ytd-value',
        'overview-forecast-gap',
        'overview-inventory-value',
      ],
      charts: [
        'overview-revenue-target-chart',
      ],
      tables: [
        'overview-upcoming-promotions',
      ],
      alerts: ['alert-dead-stock', 'alert-extreme-changes'],
      filters: ['filter-region', 'filter-category'],
      actions: ['action-export', 'action-approve-budget'],
      hideElements: [
        'overview-model-accuracy',
        'overview-30day-forecast',
        'overview-sales-vs-target',
        'overview-regional-forecast',
        'overview-category-growth',
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-historical-units-chart',
        'overview-demand-variability-chart',
        'overview-forecast-vs-actual-chart',
        'overview-stock-risks',
        'overview-store-comparisons',
        'overview-fastest-moving-products',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
        'demand-yoy-growth',
      ],
      charts: [
        'demand-trend-forecast-chart',
      ],
      tables: [],
      alerts: ['alert-dead-stock'],
      filters: ['filter-region', 'filter-category', 'filter-period'],
      actions: ['action-export'],
      hideElements: [
        'demand-accuracy',
        'demand-bias',
        'demand-low-growth',
        'demand-high-growth',
        'demand-year-comparison-chart',
        'demand-bias-risk-chart',
        'demand-growth-analysis-chart',
        'demand-forecast-errors-table',
        'demand-product-level-forecast',
        'demand-high-error-products',
        'demand-promotion-impact-chart',
      ],
    },
    promotionView: {
      kpiCards: ['promo-expected-revenue', 'promo-roi'],
      charts: ['promo-campaign-vs-normal-chart', 'promo-effectiveness-chart'],
      tables: ['promo-campaign-history'],
      alerts: [],
      filters: ['filter-region', 'filter-category', 'filter-promo-type', 'filter-date-range'],
      actions: ['action-export', 'action-approve-budget'],
      hideElements: [
        'promo-total-forecast',
        'promo-best-performing',
        'promo-stock-risk',
        'promo-stock-status',
        'promo-benchmark',
        'promo-calendar-view',
        'promo-similar-campaigns',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
    },
    financialOverview: {
      kpiCards: [
        'fin-forecasted-revenue',
        'fin-budget-achievement',
        'fin-inventory-value',
        'fin-forecasted-margin',
        'fin-forecast-vs-budget',
        'fin-dead-stock',
      ],
      charts: [
        'fin-tl-based-trend-chart',
        'fin-budget-comparison-chart',
        'fin-margin-analysis-chart',
      ],
      tables: [
        'fin-revenue-breakdown',
        'fin-budget-variance',
      ],
      alerts: ['alert-dead-stock'],
      filters: ['filter-region', 'filter-category', 'filter-period'],
      actions: ['action-export', 'action-approve-budget'],
      hideElements: [],
    },
    inventoryPlanning: {
      kpiCards: ['overview-inventory-value'],
      charts: [],
      tables: [],
      alerts: ['alert-dead-stock'],
      filters: ['filter-region', 'filter-category'],
      actions: ['action-export'],
      hideElements: [
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-forecast-vs-actual-chart',
        'overview-stock-risks',
        'overview-fastest-moving-products',
        'overview-store-comparisons',
      ],
    },
  },

  // ==================== MARKETING ====================
  // SEE: Active campaigns, promotional sales share, Lift (%), Campaign ROI,
  //      campaign vs normal chart, best-performing types, low-performing alerts, missed opportunities
  // HIDE: Inventory turnover, budget achievement, model accuracy
  marketing: {
    overview: {
      kpiCards: [
        'overview-30day-forecast',
        'overview-ytd-value',
      ],
      charts: [
        'overview-revenue-target-chart',
      ],
      tables: [
        'overview-upcoming-promotions',
      ],
      alerts: [],
      filters: ['filter-region', 'filter-category'],
      actions: ['action-export', 'action-create-promo'],
      hideElements: [
        'overview-model-accuracy',
        'overview-forecast-gap',
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-historical-units-chart',
        'overview-demand-variability-chart',
        'overview-forecast-vs-actual-chart',
        'overview-stock-risks',
        'overview-store-comparisons',
        'overview-fastest-moving-products',
      ],
    },
    demandForecasting: {
      kpiCards: [
        'demand-total-forecast',
      ],
      charts: [
        'demand-trend-forecast-chart',
      ],
      tables: [],
      alerts: [],
      filters: ['filter-region', 'filter-category', 'filter-period'],
      actions: [],
      hideElements: [
        'demand-accuracy',
        'demand-yoy-growth',
        'demand-bias',
        'demand-low-growth',
        'demand-high-growth',
        'demand-year-comparison-chart',
        'demand-bias-risk-chart',
        'demand-growth-analysis-chart',
        'demand-forecast-errors-table',
        'demand-product-level-forecast',
        'demand-high-error-products',
        'demand-promotion-impact-chart',
      ],
    },
    promotionView: {
      kpiCards: [
        'promo-total-forecast',
        'promo-expected-revenue',
        'promo-roi',
        'promo-best-performing',
      ],
      charts: [
        'promo-campaign-vs-normal-chart',
        'promo-calendar-view',
        'promo-effectiveness-chart',
      ],
      tables: [
        'promo-similar-campaigns',
        'promo-campaign-history',
        'promo-best-performing-types',
        'promo-low-performing-alerts',
        'promo-missed-opportunities',
      ],
      alerts: ['alert-promo-low-performance', 'alert-missed-opportunities'],
      filters: ['filter-region', 'filter-category', 'filter-promo-type', 'filter-date-range'],
      actions: ['action-export', 'action-create-promo'],
      hideElements: [
        'promo-stock-risk',
        'promo-stock-status',
        'promo-benchmark',
      ],
    },
    inventoryPlanning: {
      kpiCards: [],
      charts: [],
      tables: [],
      alerts: [],
      filters: [],
      actions: [],
      hideElements: [
        'overview-critical-stock',
        'overview-inventory-turnover',
        'overview-inventory-value',
        'overview-forecast-vs-actual-chart',
        'overview-stock-risks',
        'overview-fastest-moving-products',
        'overview-store-comparisons',
      ],
    },
  },

  // ==================== PRODUCTION PLANNING ====================
  // SEE: Forecasted order volume, capacity utilization, supplier fill rate,
  //      forecasted waste, inbound load projection, category-based order requirements
  production_planning: {
    overview: {
      kpiCards: [
      'overview-30day-forecast',
      'overview-critical-stock',
    ],
    charts: [
      'overview-historical-units-chart',
      'overview-demand-variability-chart',
    ],
    tables: [
      'overview-stock-risks',
    ],
    alerts: ['alert-critical-stock', 'alert-extreme-changes'],
    filters: ['filter-category', 'filter-product'],
    actions: [],
    hideElements: [
      'overview-model-accuracy',
      'overview-ytd-value',
      'overview-forecast-gap',
      'overview-sales-vs-target',
      'overview-regional-forecast',
      'overview-category-growth',
      'overview-inventory-turnover',
      'overview-inventory-value',
      'overview-revenue-target-chart',
      'overview-forecast-vs-actual-chart',
      'overview-upcoming-promotions',
      'overview-store-comparisons',
      'overview-fastest-moving-products',
    ],
  },
  demandForecasting: {
    kpiCards: [
      'demand-total-forecast',
      'demand-yoy-growth',
      'demand-low-growth',
      'demand-high-growth',
    ],
    charts: [
      'demand-trend-forecast-chart',
      'demand-year-comparison-chart',
      'demand-growth-analysis-chart',
    ],
    tables: [
      'demand-growth-analysis-table',
      'demand-product-level-forecast',
    ],
    alerts: ['alert-critical-stock', 'alert-extreme-changes'],
    filters: ['filter-category', 'filter-product', 'filter-period'],
    actions: ['action-export'],
    hideElements: [
      'demand-accuracy',
      'demand-bias',
      'demand-bias-risk-chart',
      'demand-forecast-errors-table',
      'demand-high-error-products',
      'demand-promotion-impact-chart',
    ],
  },
  promotionView: {
    kpiCards: ['promo-total-forecast'],
    charts: ['promo-calendar-view'],
    tables: ['promo-campaign-history'],
    alerts: [],
    filters: ['filter-promo-type', 'filter-date-range'],
    actions: [],
    hideElements: [
      'promo-expected-revenue',
      'promo-roi',
      'promo-best-performing',
      'promo-stock-risk',
      'promo-stock-status',
      'promo-benchmark',
      'promo-campaign-vs-normal-chart',
      'promo-effectiveness-chart',
      'promo-similar-campaigns',
      'promo-best-performing-types',
      'promo-low-performing-alerts',
      'promo-missed-opportunities',
    ],
  },
  operationalOverview: {
    kpiCards: [
      'ops-order-volume',
      'ops-capacity-utilization',
      'ops-supplier-fill-rate',
      'ops-forecasted-waste',
      'ops-inbound-load',
      'ops-order-requirements',
    ],
    charts: [
      'ops-capacity-chart',
      'ops-supplier-performance-chart',
    ],
    tables: [
      'ops-order-requirements',
      'ops-supplier-performance',
    ],
    alerts: ['alert-extreme-changes'],
    filters: ['filter-category', 'filter-period'],
    actions: ['action-export'],
    hideElements: [],
  },
  inventoryPlanning: {
    kpiCards: ['overview-critical-stock'],
    charts: ['overview-demand-variability-chart'],
    tables: ['overview-stock-risks'],
    alerts: ['alert-critical-stock'],
    filters: ['filter-category', 'filter-product'],
    actions: [],
    hideElements: [
      'overview-inventory-turnover',
      'overview-inventory-value',
      'overview-forecast-vs-actual-chart',
      'overview-fastest-moving-products',
      'overview-store-comparisons',
    ],
  },
},
};

/**
 * Section to visibility config key mapping
 * Used by the useVisibility hook to get the right config based on current section
 */
export const SECTION_KEYS: Record<string, keyof RoleVisibilityConfig> = {
  overview: 'overview',
  'demand-forecasting': 'demandForecasting',
  'pricing-promotion': 'promotionView',
  'financial-overview': 'financialOverview',
  'operational-overview': 'operationalOverview',
  'inventory-planning': 'inventoryPlanning',
} as const;

/**
 * Type guard to check if a value is 'all' (show everything)
 */
export function isShowAll<T>(value: T[] | 'all' | undefined): value is 'all' {
  return value === 'all';
}

/**
 * Check if an element is visible based on visibility config
 * @param elementId - The ID of the element to check
 * @param allowedElements - Array of allowed element IDs or 'all'
 * @param hideElements - Array of element IDs to explicitly hide
 */
export function isElementVisible<T extends string>(
  elementId: T,
  allowedElements?: T[] | 'all',
  hideElements?: T[]
): boolean {
  // If explicitly hidden, hide it
  if (hideElements?.includes(elementId)) {
    return false;
  }

  // If allowedElements is 'all' or undefined, show it (unless hidden)
  if (isShowAll(allowedElements) || !allowedElements) {
    return true;
  }

  // Otherwise, check if it's in the allowed list
  return allowedElements.includes(elementId);
}
