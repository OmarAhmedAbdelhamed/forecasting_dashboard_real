'use client';

import { useMemo } from 'react';
import { usePermissions } from './use-permissions';
import type {
  DataViewMode,
  VolumeUnit,
  DataTransformConfig,
  RoleDataView,
} from '@/types/data-view';
import {
  getRoleDataView,
  formatValueByMode,
  getDataModeLabel,
} from '@/types/data-view';
import {
  transformValue,
  transformDataArray,
  transformChartData,
  transformKPI,
  transformKPIBatch,
  type DataPoint,
  type TransformedDataPoint,
  type ChartDataPoint,
} from '@/lib/data-transform';

/**
 * Data view hook for role-based data transformation
 * Provides methods to transform and format data based on user role
 *
 * @example
 * const { currentMode, transform, format, canSwitchMode } = useDataView();
 * const transformed = transform(1000, 'gıda'); // Finance role: converts to TL
 * const formatted = format(transformed.value); // "₺45.000"
 */
export function useDataView() {
  const { userRole, isLoading } = usePermissions();

  // Get role-specific data view configuration
  const roleConfig = useMemo((): RoleDataView | undefined => {
    if (isLoading || !userRole) {
      return undefined;
    }
    return getRoleDataView(userRole);
  }, [userRole, isLoading]);

  // Current data view mode for the user's role
  const currentMode = useMemo((): DataViewMode => {
    return roleConfig?.defaultMode || 'units';
  }, [roleConfig]);

  // Volume unit (only applicable for volume mode)
  const volumeUnit = useMemo((): VolumeUnit | undefined => {
    return roleConfig?.volumeUnit;
  }, [roleConfig]);

  // Whether the user can switch between different view modes
  const canSwitchMode = useMemo((): boolean => {
    return roleConfig?.allowModeSwitch || false;
  }, [roleConfig]);

  // Available view modes for the user's role
  const availableModes = useMemo((): DataViewMode[] => {
    return roleConfig?.availableModes || [currentMode];
  }, [roleConfig, currentMode]);

  /**
   * Transform a single value based on current role's data view mode
   * @param value - Value to transform
   * @param category - Product category (for conversion rate lookup)
   * @returns Transformed data point
   */
  const transform = useMemo(
    () => (value: number, category?: string): TransformedDataPoint => {
      return transformValue(value, currentMode, category, volumeUnit);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Transform an array of data points
   * @param data - Array of data points
   * @returns Array of transformed data points
   */
  const transformArray = useMemo(
    () => (data: DataPoint[]): TransformedDataPoint[] => {
      const config: DataTransformConfig = {
        mode: currentMode,
        volumeUnit,
      };
      return transformDataArray(data, config);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Transform chart data with forecast/actual support
   * @param data - Chart data array
   * @param valueKey - Key to use for value (default: 'value')
   * @returns Transformed chart data
   */
  const transformChart = useMemo(
    () => (data: ChartDataPoint[], valueKey?: string): ChartDataPoint[] => {
      const config: DataTransformConfig = {
        mode: currentMode,
        volumeUnit,
      };
      return transformChartData(data, config, valueKey);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Transform a KPI value with formatting
   * @param value - KPI value
   * @param category - Product category
   * @returns Object with transformed value and formatted strings
   */
  const transformKPIValue = useMemo(
    () => (value: number, category?: string): ReturnType<typeof transformKPI> => {
      return transformKPI(value, category || '', currentMode, volumeUnit);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Transform multiple KPIs at once
   * @param kpis - Object mapping KPI names to { value, category }
   * @returns Object with transformed KPIs
   */
  const transformKPIBatch = useMemo(
    () => (
      kpis: Record<string, { value: number; category?: string }>
    ): Record<string, ReturnType<typeof transformKPI>> => {
      const config: DataTransformConfig = {
        mode: currentMode,
        volumeUnit,
      };
      return transformKPIBatch(kpis, config);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Format a value based on current mode
   * @param value - Numeric value to format
   * @returns Formatted value string
   */
  const format = useMemo(
    () => (value: number): string => {
      return formatValueByMode(value, currentMode, volumeUnit);
    },
    [currentMode, volumeUnit]
  );

  /**
   * Get the label for the current data mode
   * @returns Localized label (e.g., 'Adet', 'TL', 'Koli')
   */
  const getModeLabel = useMemo((): string => {
    return getDataModeLabel(currentMode);
  }, [currentMode]);

  /**
   * Check if a specific mode is available for the current user
   * @param mode - Data view mode to check
   * @returns true if mode is available
   */
  const isModeAvailable = useMemo(
    () => (mode: DataViewMode): boolean => {
      return availableModes.includes(mode);
    },
    [availableModes]
  );

  /**
   * Get transformation configuration for external use
   * @returns Current transformation configuration
   */
  const getTransformConfig = useMemo((): DataTransformConfig => {
    return {
      mode: currentMode,
      volumeUnit,
    };
  }, [currentMode, volumeUnit]);

  return {
    // State
    currentMode,
    volumeUnit,
    isLoading,
    canSwitchMode,
    availableModes,
    roleConfig,

    // Transformation methods
    transform,
    transformArray,
    transformChart,
    transformKPIValue,
    transformKPIBatch,

    // Formatting
    format,
    getModeLabel,

    // Utilities
    isModeAvailable,
    getTransformConfig,
  };
}

/**
 * Simplified data view hook for quick access to transformation
 * Useful in components that only need basic transformation
 *
 * @example
 * const { transformValue, formatValue } = useSimpleDataView();
 * const transformed = transformValue(100, 'gıda');
 */
export function useSimpleDataView() {
  const { currentMode, volumeUnit, transform, format, isLoading } = useDataView();

  /**
   * Transform a value (simplified version)
   */
  const transformValue = (
    value: number,
    category?: string
  ): { value: number; formatted: string; unit: string } => {
    const result = transform(value, category);
    return {
      value: result.transformedValue,
      formatted: result.formattedValue,
      unit: result.unitLabel,
    };
  };

  /**
   * Format a value (simplified version)
   */
  const formatValue = (value: number): string => {
    return format(value);
  };

  return {
    currentMode,
    volumeUnit,
    transformValue,
    formatValue,
    isLoading,
  };
}

/**
 * Hook for data view mode switching (only for roles that allow it)
 * Provides state and methods for switching between view modes
 *
 * @example
 * const { mode, setMode, canSwitch } = useDataViewSwitch();
 */
export function useDataViewSwitch() {
  const { currentMode, availableModes, canSwitchMode } = useDataView();

  /**
   * Check if can switch to a specific mode
   */
  const canSwitchTo = (mode: DataViewMode): boolean => {
    return canSwitchMode && availableModes.includes(mode);
  };

  return {
    mode: currentMode,
    availableModes,
    canSwitch: canSwitchMode,
    canSwitchTo,
    // Note: setMode would be implemented if we add local state for mode switching
    // For now, modes are role-based and fixed
  };
}
