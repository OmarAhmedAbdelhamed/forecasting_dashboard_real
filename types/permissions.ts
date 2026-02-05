import type { UserRole } from './auth';

/**
 * All available resource types in the system
 */
export type ResourceType =
  | 'overview'
  | 'demand_forecasting'
  | 'inventory_planning'
  | 'pricing_promotion'
  | 'alert_center';

/**
 * All available component types for granular access control
 */
export type ComponentType =
  | 'kpi_metrics'
  | 'revenue_charts'
  | 'forecast_charts'
  | 'inventory_charts'
  | 'promotion_data'
  | 'alerts'
  | 'tables'
  | 'growth_analysis'
  | 'forecast_errors'
  | 'bias_risk'
  | 'year_comparison'
  | 'similar_campaigns'
  | 'upcoming_promotions'
  | 'fastest_moving_products'
  | 'stock_alerts'
  | 'financial_metrics';

/**
 * Available permission actions
 */
export type PermissionAction = 'view' | 'edit' | 'export' | 'resolve';

/**
 * Data scope levels for hierarchical access
 */
export type DataScopeLevel = 'all' | 'region' | 'store' | 'category';

/**
 * Data scope for filtering data based on user access restrictions
 */
export interface DataScope {
  regions: string[];
  stores: string[];
  categories: string[];
}

/**
 * Dashboard sections for navigation access control
 */
export type DashboardSection =
  | 'overview'
  | 'demand-forecasting'
  | 'inventory-planning'
  | 'pricing-promotion'
  | 'seasonal-planning'
  | 'alert-center'
  | 'user-management'
  | 'administration'
  | 'category-management'
  | 'financial-overview'
  | 'operational-overview';

/**
 * Available filter types
 */
export type FilterType =
  | 'filter-region'
  | 'filter-store'
  | 'filter-category'
  | 'filter-product'
  | 'filter-period'
  | 'filter-date-range'
  | 'filter-promo-type'
  | 'filter-granularity';

/**
 * Filter permission configuration
 * Defines which filters are available to a role
 */
export interface FilterConfig {
  /** Available filters for this role */
  allowedFilters: FilterType[];
  /** Filters that are automatically applied based on user scope */
  autoScopedFilters?: FilterType[];
  /** Filters that are locked (user cannot change) */
  lockedFilters?: FilterType[];
}

/**
 * Role configuration interface
 */
export interface RoleConfig {
  allowedSections: DashboardSection[];
  allowedComponents: {
    pages: Record<string, ComponentType[]>;
  };
  dataScope: DataScopeLevel;
  canExport: boolean;
  /** Filter permissions for this role */
  filterPermissions?: FilterConfig;
}

/**
 * Complete role configurations for all user roles
 */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  super_admin: {
    allowedSections: [
      'overview',
      'demand-forecasting',
      'inventory-planning',
      'pricing-promotion',
      'seasonal-planning',
      'alert-center',
      'user-management',
      'administration',
      'category-management',
    ],
    allowedComponents: {
      pages: {
        overview: [],
        'demand-forecasting': [],
        'inventory-planning': [],
        'pricing-promotion': [],
        'seasonal-planning': [],
        'alert-center': [],
        'user-management': [],
        administration: [],
        'category-management': [],
      },
    },
    dataScope: 'all',
    canExport: true,
  },

  general_manager: {
    allowedSections: [
      'overview',
      'demand-forecasting',
      'pricing-promotion',
      'user-management',
      'administration',
      'category-management',
    ],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'revenue_charts'],
        'demand-forecasting': ['forecast_charts', 'tables'],
        'pricing-promotion': ['promotion_data', 'tables'],
        'user-management': [],
        administration: [],
        'category-management': [],
      },
    },
    dataScope: 'all',
    canExport: true,
    filterPermissions: {
      allowedFilters: [
        'filter-region',
        'filter-store',
        'filter-category',
        'filter-product',
        'filter-period',
      ],
      autoScopedFilters: [],
      lockedFilters: [],
    },
  },

  buyer: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning', 'category-management'],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'forecast_charts'],
        'demand-forecasting': ['forecast_charts', 'tables'],
        'inventory-planning': ['inventory_charts', 'tables'],
        'category-management': [],
      },
    },
    dataScope: 'category',
    canExport: true,
    filterPermissions: {
      allowedFilters: [
        'filter-store',
        'filter-category',
        'filter-product',
        'filter-period',
      ],
      autoScopedFilters: ['filter-category'],
      lockedFilters: [],
    },
  },

  inventory_planner: {
    allowedSections: [
      'overview',
      'demand-forecasting',
      'inventory-planning',
      'pricing-promotion',
      'category-management',
    ],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'inventory_charts'],
        'demand-forecasting': ['forecast_charts', 'tables'],
        'inventory-planning': ['inventory_charts', 'tables'],
        'pricing-promotion': ['promotion_data', 'tables'],
        'category-management': [],
      },
    },
    dataScope: 'all',
    canExport: true,
    filterPermissions: {
      allowedFilters: [
        'filter-region',
        'filter-store',
        'filter-category',
        'filter-product',
        'filter-period',
      ],
      autoScopedFilters: [],
      lockedFilters: [],
    },
  },

  regional_manager: {
    allowedSections: [
      'overview',
      'demand-forecasting',
      'inventory-planning',
      'pricing-promotion',
      'administration',
    ],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'revenue_charts'],
        'demand-forecasting': ['forecast_charts', 'tables'],
        'inventory-planning': ['inventory_charts', 'tables'],
        'pricing-promotion': ['promotion_data', 'tables'],
        administration: [],
      },
    },
    dataScope: 'region',
    canExport: false,
    filterPermissions: {
      allowedFilters: [
        'filter-store',
        'filter-category',
        'filter-period',
      ],
      autoScopedFilters: ['filter-store'],
      lockedFilters: ['filter-region'],
    },
  },

  store_manager: {
    allowedSections: ['overview', 'inventory-planning', 'administration'],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics'],
        'inventory-planning': ['inventory_charts', 'tables'],
        administration: [],
      },
    },
    dataScope: 'store',
    canExport: false,
    filterPermissions: {
      allowedFilters: [
        'filter-category',
        'filter-period',
      ],
      autoScopedFilters: ['filter-category'],
      lockedFilters: ['filter-region', 'filter-store'],
    },
  },

  finance: {
    allowedSections: [
      'overview',
      'demand-forecasting',
      'pricing-promotion',
      'financial-overview',
    ],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'revenue_charts', 'financial_metrics'],
        'demand-forecasting': ['forecast_charts', 'tables'],
        'pricing-promotion': ['promotion_data', 'tables'],
        'financial-overview': [],
      },
    },
    dataScope: 'all',
    canExport: true,
    filterPermissions: {
      allowedFilters: [
        'filter-region',
        'filter-category',
        'filter-period',
        'filter-date-range',
      ],
      autoScopedFilters: [],
      lockedFilters: [],
    },
  },

  marketing: {
    allowedSections: ['overview', 'pricing-promotion'],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'revenue_charts'],
        'pricing-promotion': [
          'promotion_data',
          'tables',
          'similar_campaigns',
          'upcoming_promotions',
        ],
      },
    },
    dataScope: 'all',
    canExport: true,
    filterPermissions: {
      allowedFilters: [
        'filter-region',
        'filter-category',
        'filter-promo-type',
        'filter-date-range',
      ],
      autoScopedFilters: [],
      lockedFilters: [],
    },
  },

  production_planning: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning'],
    allowedComponents: {
      pages: {
        overview: ['kpi_metrics', 'forecast_charts'],
        'demand-forecasting': [
          'forecast_charts',
          'tables',
          'growth_analysis',
          'forecast_errors',
          'bias_risk',
          'year_comparison',
        ],
        'inventory-planning': ['inventory_charts', 'tables'],
      },
    },
    dataScope: 'all',
    canExport: false,
    filterPermissions: {
      allowedFilters: [
        'filter-category',
        'filter-product',
        'filter-period',
        'filter-granularity',
      ],
      autoScopedFilters: [],
      lockedFilters: [],
    },
  },
};
