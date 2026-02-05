'use client';

import { useMemo } from 'react';
import { usePermissions } from './use-permissions';
import {
  ROLE_VISIBILITY,
  SECTION_KEYS,
  isElementVisible,
  type KpiId,
  type ChartId,
  type TableId,
  type AlertId,
  type FilterId,
  type ActionId,
  type SectionVisibility,
  type RoleVisibilityConfig,
} from '@/types/visibility';

/**
 * Visibility hook for role-based UI element visibility control
 * Provides helper functions to check if specific elements should be visible
 *
 * @example
 * const { canSeeKpi, canSeeChart, getVisibleKpis } = useVisibility('demand-forecasting');
 *
 * {canSeeKpi('demand-total-forecast') && <KPICard ... />}
 * {getVisibleKpis(['kpi1', 'kpi2', 'kpi3']).map(id => <KPICard key={id} id={id} />)}
 */
export function useVisibility(section: keyof RoleVisibilityConfig | '' = '') {
  const { userRole, isLoading } = usePermissions();

  // Get visibility config for current role and section
  const visibilityConfig = useMemo(() => {
    if (!userRole || isLoading) {return null;}

    const roleConfig = ROLE_VISIBILITY[userRole];
    if (!roleConfig) {return null;}

    // If no section specified, return the full role config
    if (!section) {return roleConfig;}

    // Get the section key (handles string -> key conversion)
    const sectionKey = SECTION_KEYS[section] || section;
    return roleConfig[sectionKey]!;
  }, [userRole, section, isLoading]);

  /**
   * Check if a KPI card is visible
   * @param kpiId - KPI card identifier
   * @returns true if KPI should be shown
   */
  const canSeeKpi = (kpiId: KpiId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(kpiId, visibilityConfig.kpiCards, visibilityConfig.hideElements);
  };

  /**
   * Check if a chart is visible
   * @param chartId - Chart identifier
   * @returns true if chart should be shown
   */
  const canSeeChart = (chartId: ChartId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(chartId, visibilityConfig.charts, visibilityConfig.hideElements);
  };

  /**
   * Check if a table is visible
   * @param tableId - Table identifier
   * @returns true if table should be shown
   */
  const canSeeTable = (tableId: TableId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(tableId, visibilityConfig.tables, visibilityConfig.hideElements);
  };

  /**
   * Check if an alert is visible
   * @param alertId - Alert identifier
   * @returns true if alert should be shown
   */
  const canSeeAlert = (alertId: AlertId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(alertId, visibilityConfig.alerts, visibilityConfig.hideElements);
  };

  /**
   * Check if a filter is available
   * @param filterId - Filter identifier
   * @returns true if filter should be shown
   */
  const canSeeFilter = (filterId: FilterId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(filterId, visibilityConfig.filters, visibilityConfig.hideElements);
  };

  /**
   * Check if an action button is visible
   * @param actionId - Action identifier
   * @returns true if action button should be shown
   */
  const canSeeAction = (actionId: ActionId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(actionId, visibilityConfig.actions, visibilityConfig.hideElements);
  };

  /**
   * Filter an array of KPI IDs to return only visible ones
   * @param kpiIds - Array of KPI IDs to filter
   * @returns Array of visible KPI IDs
   */
  const getVisibleKpis = (kpiIds: KpiId[]): KpiId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return kpiIds.filter((id) => canSeeKpi(id));
  };

  /**
   * Filter an array of chart IDs to return only visible ones
   * @param chartIds - Array of chart IDs to filter
   * @returns Array of visible chart IDs
   */
  const getVisibleCharts = (chartIds: ChartId[]): ChartId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return chartIds.filter((id) => canSeeChart(id));
  };

  /**
   * Filter an array of table IDs to return only visible ones
   * @param tableIds - Array of table IDs to filter
   * @returns Array of visible table IDs
   */
  const getVisibleTables = (tableIds: TableId[]): TableId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return tableIds.filter((id) => canSeeTable(id));
  };

  /**
   * Filter an array of alert IDs to return only visible ones
   * @param alertIds - Array of alert IDs to filter
   * @returns Array of visible alert IDs
   */
  const getVisibleAlerts = (alertIds: AlertId[]): AlertId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return alertIds.filter((id) => canSeeAlert(id));
  };

  /**
   * Filter an array of filter IDs to return only visible ones
   * @param filterIds - Array of filter IDs to filter
   * @returns Array of visible filter IDs
   */
  const getVisibleFilters = (filterIds: FilterId[]): FilterId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return filterIds.filter((id) => canSeeFilter(id));
  };

  /**
   * Filter an array of action IDs to return only visible ones
   * @param actionIds - Array of action IDs to filter
   * @returns Array of visible action IDs
   */
  const getVisibleActions = (actionIds: ActionId[]): ActionId[] => {
    if (!visibilityConfig || isLoading) {return [];}
    return actionIds.filter((id) => canSeeAction(id));
  };

  /**
   * Check if any elements of a given type are visible
   * Useful for showing/hiding entire sections
   */
  const hasVisibleKpis = (): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return !isElementVisible('', visibilityConfig.kpiCards, visibilityConfig.hideElements);
  };

  const hasVisibleCharts = (): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    const charts = visibilityConfig.charts;
    return charts === 'all' || (Array.isArray(charts) && charts.length > 0);
  };

  const hasVisibleTables = (): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    const tables = visibilityConfig.tables;
    return tables === 'all' || (Array.isArray(tables) && tables.length > 0);
  };

  /**
   * Check if a filter can be used by the current user's role
   * @param filterId - Filter identifier
   * @returns true if filter can be used
   */
  const canUseFilter = (filterId: FilterId): boolean => {
    if (!visibilityConfig || isLoading) {return false;}
    return isElementVisible(filterId, visibilityConfig.filters, visibilityConfig.hideElements);
  };

  /**
   * Get all available filters for the current user's role
   * @returns Array of available filter IDs
   */
  const getAvailableFilters = (): FilterId[] => {
    if (!visibilityConfig || isLoading) {return [];}

    const filters = visibilityConfig.filters;

    // If 'all', return all standard filters
    if (filters === 'all') {
      return [
        'filter-region',
        'filter-store',
        'filter-category',
        'filter-product',
        'filter-period',
        'filter-date-range',
        'filter-promo-type',
        'filter-granularity',
      ];
    }

    // If array, return those not in hideElements
    if (Array.isArray(filters)) {
      const hidden = visibilityConfig.hideElements || [];
      return filters.filter((f) => !hidden.includes(f as FilterId)) as FilterId[];
    }

    // Default: no filters available
    return [];
  };

  return {
    isLoading,
    visibilityConfig,
    // Individual checks
    canSeeKpi,
    canSeeChart,
    canSeeTable,
    canSeeAlert,
    canSeeFilter,
    canSeeAction,
    // Batch filters
    getVisibleKpis,
    getVisibleCharts,
    getVisibleTables,
    getVisibleAlerts,
    getVisibleFilters,
    getVisibleActions,
    // Has checks
    hasVisibleKpis,
    hasVisibleCharts,
    hasVisibleTables,
    // Filter methods
    canUseFilter,
    getAvailableFilters,
  };
}

/**
 * Simplified hook that returns a single function to check visibility
 * Useful for quick checks without importing all types
 *
 * @example
 * const { canSee } = useSimpleVisibility('overview');
 * {canSee('kpi', 'overview-model-accuracy') && <Component />}
 */
export function useSimpleVisibility(section: keyof RoleVisibilityConfig | '' = '') {
  const { visibilityConfig, isLoading } = useVisibility(section);

  const canSee = (
    type: 'kpi' | 'chart' | 'table' | 'alert' | 'filter' | 'action',
    id: string
  ): boolean => {
    if (!visibilityConfig || isLoading) {return false;}

    const map = {
      kpi: visibilityConfig.kpiCards,
      chart: visibilityConfig.charts,
      table: visibilityConfig.tables,
      alert: visibilityConfig.alerts,
      filter: visibilityConfig.filters,
      action: visibilityConfig.actions,
    }[type];

    return isElementVisible(id as KpiId | ChartId | TableId | AlertId | FilterId | ActionId, map, visibilityConfig.hideElements);
  };

  return { canSee, isLoading, visibilityConfig };
}
