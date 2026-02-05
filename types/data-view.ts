import type { UserRole } from './auth';

/**
 * Data view modes for transforming values based on role perspective
 * - units: Display raw unit counts (default for most roles)
 * - monetary: Display currency values (TL) for finance roles
 * - volume: Display volume measurements (cartons/pallets) for production roles
 */
export type DataViewMode = 'units' | 'monetary' | 'volume';

/**
 * Volume units for volume-based data view
 */
export type VolumeUnit = 'cartons' | 'pallets';

/**
 * Configuration for data transformation
 */
export interface DataTransformConfig {
  /** The target mode for transformation */
  mode: DataViewMode;
  /** Volume unit (only applies when mode is 'volume') */
  volumeUnit?: VolumeUnit;
  /** Currency code (defaults to 'TL') */
  currency?: string;
  /** Custom conversion rate (overrides category defaults) */
  conversionRate?: number;
}

/**
 * Role-specific data view configuration
 * Defines how each role views data by default and what modes they can switch between
 */
export interface RoleDataView {
  /** Default data view mode for this role */
  defaultMode: DataViewMode;
  /** Whether this role can switch between different view modes */
  allowModeSwitch: boolean;
  /** Available view modes for this role (undefined = all modes) */
  availableModes?: DataViewMode[];
  /** Volume unit to use when mode is 'volume' */
  volumeUnit?: VolumeUnit;
}

/**
 * Conversion rates by category for transforming units to TL
 * Prices per unit in Turkish Lira
 */
export const CATEGORY_UNIT_TO_TL_RATES: Record<string, number> = {
  gıda: 45,
  icecek: 18,
  temizlik: 85,
  atistirmalik: 32,
  // Default fallback for unknown categories
  default: 30,
};

/**
 * Conversion rates by category for transforming units to cartons
 * Units per carton
 */
export const CATEGORY_UNIT_TO_CARTONS_RATES: Record<string, number> = {
  gıda: 24,
  icecek: 12,
  temizlik: 48,
  atistirmalik: 36,
  // Default fallback for unknown categories
  default: 24,
};

/**
 * Cartons per pallet (standard conversion rate)
 */
export const CARTONS_PER_PALLET = 10;

/**
 * Role data view configurations
 * Defines how each role views and can transform data
 */
export const ROLE_DATA_VIEWS: Record<UserRole, RoleDataView> = {
  // Super Admin: Can see all modes, switch between them
  super_admin: {
    defaultMode: 'units',
    allowModeSwitch: true,
    availableModes: ['units', 'monetary', 'volume'],
    volumeUnit: 'cartons',
  },

  // General Manager: Units or monetary view
  general_manager: {
    defaultMode: 'units',
    allowModeSwitch: true,
    availableModes: ['units', 'monetary'],
  },

  // Buyer: Units only (focus on quantities)
  buyer: {
    defaultMode: 'units',
    allowModeSwitch: false,
    availableModes: ['units'],
  },

  // Inventory Planner: Units only (focus on quantities)
  inventory_planner: {
    defaultMode: 'units',
    allowModeSwitch: false,
    availableModes: ['units'],
  },

  // Regional Manager: Units or monetary view
  regional_manager: {
    defaultMode: 'units',
    allowModeSwitch: true,
    availableModes: ['units', 'monetary'],
  },

  // Store Manager: Units only
  store_manager: {
    defaultMode: 'units',
    allowModeSwitch: false,
    availableModes: ['units'],
  },

  // Finance: Monetary view ONLY (all values in TL)
  finance: {
    defaultMode: 'monetary',
    allowModeSwitch: false,
    availableModes: ['monetary'],
  },

  // Marketing: Units or monetary view (for campaign ROI)
  marketing: {
    defaultMode: 'units',
    allowModeSwitch: true,
    availableModes: ['units', 'monetary'],
  },

  // Production Planning: Volume view ONLY (all values in cartons)
  production_planning: {
    defaultMode: 'volume',
    allowModeSwitch: false,
    availableModes: ['volume'],
    volumeUnit: 'cartons',
  },
};

/**
 * Get the data view configuration for a given role
 * @param role - User role
 * @returns Role data view configuration
 */
export function getRoleDataView(role: UserRole): RoleDataView {
  return ROLE_DATA_VIEWS[role] || ROLE_DATA_VIEWS.super_admin;
}

/**
 * Get the conversion rate for a category (units to TL)
 * @param category - Category name
 * @returns Conversion rate
 */
export function getUnitToTLRate(category: string): number {
  return CATEGORY_UNIT_TO_TL_RATES[category.toLowerCase()] ||
         CATEGORY_UNIT_TO_TL_RATES.default;
}

/**
 * Get the conversion rate for a category (units to cartons)
 * @param category - Category name
 * @returns Conversion rate
 */
export function getUnitToCartonsRate(category: string): number {
  return CATEGORY_UNIT_TO_CARTONS_RATES[category.toLowerCase()] ||
         CATEGORY_UNIT_TO_CARTONS_RATES.default;
}

/**
 * Format a value based on data view mode
 * @param value - Numeric value to format
 * @param mode - Data view mode
 * @param volumeUnit - Volume unit (for 'volume' mode)
 * @returns Formatted value string
 */
export function formatValueByMode(
  value: number,
  mode: DataViewMode,
  volumeUnit?: VolumeUnit
): string {
  if (mode === 'monetary') {
    // Format as Turkish Lira
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (mode === 'volume') {
    const unit = volumeUnit === 'pallets' ? 'Palet' : 'Koli';
    // Format with thousand separator
    return `${new Intl.NumberFormat('tr-TR').format(value)} ${unit}`;
  }

  // Default: units
  return new Intl.NumberFormat('tr-TR').format(value);
}

/**
 * Get the label for a data view mode
 * @param mode - Data view mode
 * @returns Localized label
 */
export function getDataModeLabel(mode: DataViewMode): string {
  const labels: Record<DataViewMode, string> = {
    units: 'Adet',
    monetary: 'TL',
    volume: 'Koli',
  };
  return labels[mode] || mode;
}
