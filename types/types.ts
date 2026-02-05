// Dashboard section types
export type Section =
  | 'overview'
  | 'demand_forecasting'
  | 'inventory_planning'
  | 'pricing_promotion'
  | 'seasonal_planning'
  | 'alert_center'
  | 'user_management'
  | 'administration'
  | 'product_management'
  | 'category_management'
  | 'financial_overview'
  | 'operational_overview';

// Administration drill-down view types
export type AdministrationView =
  | 'list' // Show all organizations
  | 'users' // Show all users (Super Admin) or organization users (GM)
  | 'regions' // Drilled into organization → showing regions
  | 'stores' // Drilled into region → showing stores
  | 'store-management'; // Drilled into store → showing store management (categories + products)

/**
 * Drill-down navigation state for administration section
 */
export interface DrillDownState {
  view: AdministrationView;
  organizationId?: string;
  organizationName?: string;
  regionId?: string;
  regionName?: string;
  storeId?: string;
  storeName?: string;
}

/**
 * Breadcrumb item for navigation
 */
export interface BreadcrumbItem {
  label: string;
  view: AdministrationView;
  state?: Partial<DrillDownState>;
}
