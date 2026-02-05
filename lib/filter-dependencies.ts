import type { FilterType } from '@/types/permissions';
import type { FilterId } from '@/types/visibility';

/**
 * Filter dependency relationship
 * Defines which filters depend on others
 */
export interface FilterDependency {
  /** The filter that has dependencies */
  filter: FilterType;
  /** Filters that must be set before this filter can be used */
  dependsOn: FilterType[];
  /** Whether this filter is disabled when dependencies are not met */
  disableWhenMissing?: boolean;
  /** Whether this filter automatically filters based on dependencies */
  autoFilter?: boolean;
}

/**
 * Filter dependency configuration
 * Defines the dependency graph for all filters
 */
export const FILTER_DEPENDENCIES: FilterDependency[] = [
  // Store depends on Region (in regional scope contexts)
  {
    filter: 'filter-store',
    dependsOn: ['filter-region'],
    disableWhenMissing: false,
    autoFilter: false,
  },

  // Product depends on Category (usually)
  {
    filter: 'filter-product',
    dependsOn: ['filter-category'],
    disableWhenMissing: false,
    autoFilter: false,
  },

  // Date range depends on Period (for consistency)
  {
    filter: 'filter-date-range',
    dependsOn: ['filter-period'],
    disableWhenMissing: false,
    autoFilter: false,
  },

  // Promo type depends on Period
  {
    filter: 'filter-promo-type',
    dependsOn: ['filter-period'],
    disableWhenMissing: false,
    autoFilter: false,
  },

  // Granularity depends on Period
  {
    filter: 'filter-granularity',
    dependsOn: ['filter-period'],
    disableWhenMissing: false,
    autoFilter: false,
  },
];

/**
 * Get dependencies for a specific filter
 * @param filter - Filter type
 * @returns Array of filters that this filter depends on
 */
export function getFilterDependencies(filter: FilterType): FilterType[] {
  const dependency = FILTER_DEPENDENCIES.find((d) => d.filter === filter);
  return dependency?.dependsOn || [];
}

/**
 * Check if a filter's dependencies are satisfied
 * @param filter - Filter type to check
 * @param activeFilters - Currently active/selected filters
 * @returns true if all dependencies are satisfied
 */
export function areFilterDependenciesSatisfied(
  filter: FilterType,
  activeFilters: FilterType[]
): boolean {
  const dependencies = getFilterDependencies(filter);

  // If no dependencies, always satisfied
  if (dependencies.length === 0) {
    return true;
  }

  // Check if all dependencies are in active filters
  return dependencies.every((dep) => activeFilters.includes(dep));
}

/**
 * Check if a filter should be disabled based on missing dependencies
 * @param filter - Filter type to check
 * @param activeFilters - Currently active/selected filters
 * @returns true if filter should be disabled
 */
export function shouldDisableFilter(
  filter: FilterType,
  activeFilters: FilterType[]
): boolean {
  const dependency = FILTER_DEPENDENCIES.find((d) => d.filter === filter);

  // If no dependency rule or disableWhenMissing is false, don't disable
  if (!dependency?.disableWhenMissing) {
    return false;
  }

  // Disable if dependencies are not satisfied
  return !areFilterDependenciesSatisfied(filter, activeFilters);
}

/**
 * Get filters that should be auto-filtered based on other selections
 * @param filter - Filter type
 * @param selectedValues - Object mapping filter types to their selected values
 * @returns Object with auto-filtered options (empty if no auto-filter)
 */
export function getAutoFilteredOptions(
  filter: FilterType,
  selectedValues: Partial<Record<FilterType, string[]>>
): string[] | null {
  const dependency = FILTER_DEPENDENCIES.find((d) => d.filter === filter);

  // If no auto-filter rule, return null
  if (!dependency?.autoFilter) {
    return null;
  }

  // Auto-filter logic would go here based on hierarchical data
  // For now, return null to indicate no auto-filtering
  return null;
}

/**
 * Get recommended filters based on role and data scope
 * @param role - User role
 * @param dataScope - Data scope level (all, region, store, category)
 * @returns Array of recommended filter types
 */
export function getRecommendedFilters(
  role: string,
  dataScope: 'all' | 'region' | 'store' | 'category'
): FilterType[] {
  const baseFilters: FilterType[] = ['filter-period'];

  // Add filters based on data scope
  switch (dataScope) {
    case 'all':
      return [
        ...baseFilters,
        'filter-region',
        'filter-store',
        'filter-category',
        'filter-product',
      ];

    case 'region':
      return [
        ...baseFilters,
        'filter-store',
        'filter-category',
        'filter-product',
      ];

    case 'store':
      return [...baseFilters, 'filter-category', 'filter-product'];

    case 'category':
      return [...baseFilters, 'filter-product'];

    default:
      return baseFilters;
  }
}

/**
 * Get required filters for a specific section
 * @param section - Dashboard section
 * @returns Array of required filter types
 */
export function getRequiredFilters(section: string): FilterType[] {
  const requiredFilters: Record<string, FilterType[]> = {
    overview: ['filter-period'],
    'demand-forecasting': ['filter-period'],
    'inventory-planning': ['filter-period'],
    'pricing-promotion': ['filter-period', 'filter-promo-type'],
    'financial-overview': ['filter-period', 'filter-date-range'],
    'operational-overview': ['filter-period', 'filter-granularity'],
    'alert-center': [],
  };

  return requiredFilters[section] || [];
}

/**
 * Convert FilterType to FilterId (for compatibility with visibility system)
 * @param filterType - Filter type
 * @returns Corresponding filter ID
 */
export function filterTypeToFilterId(filterType: FilterType): FilterId {
  return filterType as FilterId;
}

/**
 * Convert FilterId to FilterType (for compatibility with visibility system)
 * @param filterId - Filter ID
 * @returns Corresponding filter type
 */
export function filterIdToFilterType(filterId: FilterId): FilterType {
  return filterId as FilterType;
}

/**
 * Validate filter combination
 * Check if the current filter combination is valid
 * @param activeFilters - Currently active filters
 * @returns Object with isValid flag and errors array
 */
export function validateFilterCombination(
  activeFilters: FilterType[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check each filter's dependencies
  activeFilters.forEach((filter) => {
    if (!areFilterDependenciesSatisfied(filter, activeFilters)) {
      const dependencies = getFilterDependencies(filter);
      errors.push(
        `${filter} requires ${dependencies.join(', ')} to be selected first`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get filters that should be hidden based on role restrictions
 * @param role - User role
 * @param dataScope - Data scope level
 * @returns Array of filter types to hide
 */
export function getHiddenFiltersForRole(
  role: string,
  dataScope: 'all' | 'region' | 'store' | 'category'
): FilterType[] {
  const hidden: FilterType[] = [];

  // Regional managers don't see region filter (auto-scoped)
  if (role === 'regional_manager' && dataScope === 'region') {
    hidden.push('filter-region');
  }

  // Store managers only see category filter
  if (role === 'store_manager') {
    hidden.push('filter-region', 'filter-store');
  }

  return hidden;
}

/**
 * Get enabled filters for a role considering data scope
 * @param allFilters - All available filters
 * @param role - User role
 * @param dataScope - Data scope level
 * @returns Array of enabled filter types
 */
export function getEnabledFiltersForRole(
  allFilters: FilterType[],
  role: string,
  dataScope: 'all' | 'region' | 'store' | 'category'
): FilterType[] {
  const hiddenFilters = getHiddenFiltersForRole(role, dataScope);

  return allFilters.filter((filter) => !hiddenFilters.includes(filter));
}
