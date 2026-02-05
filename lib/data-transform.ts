import type {
  DataViewMode,
  VolumeUnit,
  DataTransformConfig,
} from '@/types/data-view';
import {
  getUnitToTLRate,
  getUnitToCartonsRate,
  CARTONS_PER_PALLET,
  formatValueByMode,
  getDataModeLabel,
} from '@/types/data-view';

/**
 * Data point with category for transformation
 */
export interface DataPoint {
  value: number;
  category?: string;
}

/**
 * Transformed data point with metadata
 */
export interface TransformedDataPoint extends DataPoint {
  originalValue: number;
  transformedValue: number;
  mode: DataViewMode;
  formattedValue: string;
  unitLabel: string;
}

/**
 * Chart data point with category support
 */
export interface ChartDataPoint {
  [key: string]: string | number | null;
  value?: number;
  category?: string;
  forecast?: number;
  actual?: number;
}

/**
 * Transform a single value based on data view mode and category
 * @param value - The value to transform
 * @param mode - Data view mode (units, monetary, volume)
 * @param category - Product category for conversion rate lookup
 * @param volumeUnit - Volume unit (cartons or pallets) for volume mode
 * @returns Transformed data point with formatted value
 */
export function transformValue(
  value: number,
  mode: DataViewMode,
  category?: string,
  volumeUnit?: VolumeUnit
): TransformedDataPoint {
  const originalValue = value;
  let transformedValue = value;

  switch (mode) {
    case 'monetary':
      // Convert units to TL using category-specific rate
      const rate = category ? getUnitToTLRate(category) : getUnitToTLRate('default');
      transformedValue = value * rate;
      break;

    case 'volume':
      // Convert units to cartons, then optionally to pallets
      const cartonsRate = category
        ? getUnitToCartonsRate(category)
        : getUnitToCartonsRate('default');
      const cartons = value / cartonsRate;

      if (volumeUnit === 'pallets') {
        transformedValue = cartons / CARTONS_PER_PALLET;
      } else {
        transformedValue = cartons;
      }
      break;

    case 'units':
    default:
      // No transformation needed
      transformedValue = value;
      break;
  }

  const unitLabel = getDataModeLabel(mode);
  const formattedValue = formatValueByMode(transformedValue, mode, volumeUnit);

  return {
    value: transformedValue,
    category,
    originalValue,
    transformedValue,
    mode,
    formattedValue,
    unitLabel,
  };
}

/**
 * Transform an array of data points
 * @param data - Array of data points to transform
 * @param config - Transformation configuration
 * @returns Array of transformed data points
 */
export function transformDataArray(
  data: DataPoint[],
  config: DataTransformConfig
): TransformedDataPoint[] {
  return data.map((point) =>
    transformValue(point.value, config.mode, point.category, config.volumeUnit)
  );
}

/**
 * Transform chart data with support for forecast/actual pairs
 * @param data - Chart data array
 * @param config - Transformation configuration
 * @param valueKey - Key to use for value (default: 'value')
 * @returns Transformed chart data
 */
export function transformChartData(
  data: ChartDataPoint[],
  config: DataTransformConfig,
  valueKey: string = 'value'
): ChartDataPoint[] {
  return data.map((point) => {
    const transformed: ChartDataPoint = { ...point };

    // Transform the main value
    if (valueKey in point && typeof point[valueKey] === 'number') {
      const transformedPoint = transformValue(
        point[valueKey] as number,
        config.mode,
        point.category,
        config.volumeUnit
      );
      transformed[valueKey] = transformedPoint.transformedValue;
      transformed[`${valueKey}Formatted`] = transformedPoint.formattedValue;
    }

    // Transform forecast value if present
    if ('forecast' in point && typeof point.forecast === 'number') {
      const transformedForecast = transformValue(
        point.forecast,
        config.mode,
        point.category,
        config.volumeUnit
      );
      transformed.forecast = transformedForecast.transformedValue;
      transformed.forecastFormatted = transformedForecast.formattedValue;
    }

    // Transform actual value if present
    if ('actual' in point && typeof point.actual === 'number') {
      const transformedActual = transformValue(
        point.actual,
        config.mode,
        point.category,
        config.volumeUnit
      );
      transformed.actual = transformedActual.transformedValue;
      transformed.actualFormatted = transformedActual.formattedValue;
    }

    return transformed;
  });
}

/**
 * Aggregate data by category and transform
 * @param data - Data array with category field
 * @param config - Transformation configuration
 * @returns Object mapping categories to transformed totals
 */
export function transformAndAggregateByCategory(
  data: DataPoint[],
  config: DataTransformConfig
): Record<string, TransformedDataPoint> {
  const categoryTotals: Record<string, number> = {};

  // Aggregate by category
  data.forEach((point) => {
    const category = point.category || 'unknown';
    categoryTotals[category] = (categoryTotals[category] || 0) + point.value;
  });

  // Transform each category total
  const result: Record<string, TransformedDataPoint> = {};
  Object.entries(categoryTotals).forEach(([category, total]) => {
    result[category] = transformValue(total, config.mode, category, config.volumeUnit);
  });

  return result;
}

/**
 * Calculate percentage change between two values in the same mode
 * @param oldValue - Previous value (already transformed if needed)
 * @param newValue - Current value (already transformed if needed)
 * @returns Percentage change (positive = increase, negative = decrease)
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100; // Infinite growth, cap at 100%
  }
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format a percentage change with sign and label
 * @param change - Percentage change value
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted percentage string (e.g., '+15%' or '-8%')
 */
export function formatPercentageChange(change: number, locale: string = 'tr-TR'): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Transform a KPI value with category context
 * Useful for dashboard metric cards
 * @param value - KPI value
 * @param category - Product category
 * @param mode - Data view mode
 * @param volumeUnit - Volume unit (if applicable)
 * @returns Object with transformed value and formatted strings
 */
export function transformKPI(
  value: number,
  category: string,
  mode: DataViewMode,
  volumeUnit?: VolumeUnit
): {
  value: number;
  formatted: string;
  unit: string;
  original: number;
} {
  const transformed = transformValue(value, mode, category, volumeUnit);

  return {
    value: transformed.transformedValue,
    formatted: transformed.formattedValue,
    unit: transformed.unitLabel,
    original: transformed.originalValue,
  };
}

/**
 * Batch transform multiple KPIs with their categories
 * @param kpis - Object mapping KPI names to { value, category }
 * @param config - Transformation configuration
 * @returns Object with transformed KPIs
 */
export function transformKPIBatch(
  kpis: Record<string, { value: number; category?: string }>,
  config: DataTransformConfig
): Record<string, ReturnType<typeof transformKPI>> {
  const result: Record<string, ReturnType<typeof transformKPI>> = {};

  Object.entries(kpis).forEach(([name, kpi]) => {
    result[name] = transformKPI(kpi.value, kpi.category || '', config.mode, config.volumeUnit);
  });

  return result;
}

/**
 * Get conversion factor for a category and mode
 * @param category - Product category
 * @param mode - Data view mode
 * @param volumeUnit - Volume unit (if mode is 'volume')
 * @returns Conversion factor (1.0 for units mode)
 */
export function getConversionFactor(
  category: string,
  mode: DataViewMode,
  volumeUnit?: VolumeUnit
): number {
  switch (mode) {
    case 'monetary':
      return getUnitToTLRate(category);

    case 'volume':
      const cartonsRate = getUnitToCartonsRate(category);
      if (volumeUnit === 'pallets') {
        return cartonsRate / CARTONS_PER_PALLET;
      }
      return cartonsRate;

    case 'units':
    default:
      return 1.0;
  }
}
