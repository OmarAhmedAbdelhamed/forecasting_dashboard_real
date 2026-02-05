'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDashboardContext } from '@/contexts/dashboard-context';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { InventoryKpiSection } from '@/components/ui/inventory-planning/inventory-kpis';
import { InventoryCharts } from '@/components/ui/inventory-planning/inventory-charts';
import { StoreComparison } from '@/components/ui/inventory-planning/store-comparison';
import { InventoryTable } from '@/components/ui/inventory-planning/inventory-table';
import { PlanningAlerts } from '@/components/ui/inventory-planning/planning-alerts';
import { CustomProductLists } from '@/components/ui/inventory-planning/custom-product-lists';
import { ProductDetailSheet } from '@/components/ui/inventory-planning/product-detail-sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';

// Mock Options for Filters (matching overview style for consistency)
import { SaleRateChart } from '@/components/ui/inventory-planning/sale-rate-chart';
import { FastestMovingTable } from '@/components/ui/inventory-planning/fastest-moving-table';
import {
  REGIONS_FLAT,
  getStoresByRegions,
  getCategoriesByStores,
  getProductsByContext,
  getInventoryKPIs,
  generateInventoryItems,
  generateStockTrendsWithPeriod,
  generateStorePerformance,
  generateInventoryAlerts,
} from '@/data/mock-data';
import { InventoryItem } from '@/types/inventory';

import { usePermissions } from '@/hooks/use-permissions';

export function InventoryPlanningSection() {
  // Get user permissions and data scope
  const {
    dataScope,
    userRole,
    isLoading: permissionsLoading,
  } = usePermissions();

  const filteredRegionOptions = useMemo(() => {
    if (dataScope.regions.length > 0) {
      return REGIONS_FLAT.filter((r) => dataScope.regions.includes(r.value));
    }
    return REGIONS_FLAT;
  }, [dataScope.regions]);

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [tablePerformanceFilter, setTablePerformanceFilter] =
    useState<string>('all');

  // Period Selection State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const periodDays = parseInt(selectedPeriod, 10);

  const tableRef = useRef<HTMLDivElement>(null);

  // Product detail sheet state for planning alerts
  const [alertSelectedItem, setAlertSelectedItem] =
    useState<InventoryItem | null>(null);
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);

  // Hierarchical Filter Options
  const storeOptions = useMemo(
    () => getStoresByRegions(selectedRegions),
    [selectedRegions],
  );

  const effectiveSelectedStores = useMemo(() => {
    const validValues = new Set(storeOptions.map((s) => s.value));
    return selectedStores.filter((s) => validValues.has(s));
  }, [selectedStores, storeOptions]);

  const categoryOptions = useMemo(
    () => getCategoriesByStores(effectiveSelectedStores, selectedRegions),
    [effectiveSelectedStores, selectedRegions],
  );

  const effectiveSelectedCategories = useMemo(() => {
    const validValues = new Set(categoryOptions.map((c) => c.value));
    return selectedCategories.filter((c) => validValues.has(c));
  }, [selectedCategories, categoryOptions]);

  const productOptions = useMemo(
    () =>
      getProductsByContext(
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedCategories,
      ),
    [selectedRegions, effectiveSelectedStores, effectiveSelectedCategories],
  );

  const effectiveSelectedProducts = useMemo(() => {
    const validValues = new Set(productOptions.map((p) => p.value));
    return selectedProducts.filter((p) => validValues.has(p));
  }, [selectedProducts, productOptions]);

  // --- Chart Selection Logic ---
  const [chartSelectedProductId, setChartSelectedProductId] = useState<
    string | undefined
  >(undefined);

  // 1. If global filter has exactly 1 product, force chart to match
  if (
    effectiveSelectedProducts.length === 1 &&
    chartSelectedProductId !== effectiveSelectedProducts[0]
  ) {
    setChartSelectedProductId(effectiveSelectedProducts[0]);
  }
  // 2. If current chart selection is invalid or empty, pick the first available option
  else if (productOptions.length > 0) {
    const isValid =
      chartSelectedProductId &&
      productOptions.some((p) => p.value === chartSelectedProductId);

    if (!isValid && chartSelectedProductId !== productOptions[0].value) {
      setChartSelectedProductId(productOptions[0].value);
    }
  } else if (
    productOptions.length === 0 &&
    chartSelectedProductId !== undefined
  ) {
    setChartSelectedProductId(undefined);
  }

  // Derived Data based on ALL filters
  const kpis = useMemo(
    () =>
      getInventoryKPIs(
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedCategories,
        effectiveSelectedProducts,
      ),
    [
      selectedRegions,
      effectiveSelectedStores,
      effectiveSelectedCategories,
      effectiveSelectedProducts,
    ],
  );

  // 2. Period-Aware Data (Lists & Charts)
  const periodItems = useMemo(
    () =>
      generateInventoryItems(
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedCategories,
        effectiveSelectedProducts,
        periodDays, // Variable
      ),
    [
      selectedRegions,
      effectiveSelectedStores,
      effectiveSelectedCategories,
      effectiveSelectedProducts,
      periodDays,
    ],
  );

  const stockTrends = useMemo(
    () =>
      generateStockTrendsWithPeriod(
        periodDays, // Variable
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedCategories,
        chartSelectedProductId ? [chartSelectedProductId] : [],
      ),
    [
      selectedRegions,
      effectiveSelectedStores,
      effectiveSelectedCategories,
      chartSelectedProductId,
      periodDays,
    ],
  );

  const storePerformance = useMemo(
    () =>
      generateStorePerformance(
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedProducts,
        effectiveSelectedCategories,
        periodDays, // Added period
      ),
    [
      selectedRegions,
      effectiveSelectedStores,
      effectiveSelectedProducts,
      effectiveSelectedCategories,
      periodDays,
    ],
  );

  const inventoryAlerts = useMemo(() => {
    return generateInventoryAlerts(
      selectedRegions,
      effectiveSelectedStores,
      periodDays, // Added period
    );
  }, [selectedRegions, effectiveSelectedStores, periodDays]);

  const hasChartSelection =
    effectiveSelectedStores.length > 0 ||
    effectiveSelectedCategories.length > 0 ||
    !!chartSelectedProductId;

  const handleSeeAllPerformance = (filterType: 'fast' | 'slow') => {
    setTablePerformanceFilter(filterType);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle alert action click - find the matching inventory item and open the detail sheet
  const handleAlertActionClick = useCallback(
    (sku: string) => {
      // Search in all inventory items (not filtered)
      const allItems = generateInventoryItems([], [], [], []);
      const matchingItem = allItems.find((item) => item.sku === sku);

      if (matchingItem) {
        setAlertSelectedItem(matchingItem);
        setAlertSheetOpen(true);
      } else {
        // If not found in all items, try filtered items
        const filteredItem = periodItems.find((item) => item.sku === sku);
        if (filteredItem) {
          setAlertSelectedItem(filteredItem);
          setAlertSheetOpen(true);
        }
      }
    },
    [periodItems],
  );

  // Sync with Dashboard Context
  const { setSection, setFilters, setMetrics } = useDashboardContext();

  useEffect(() => {
    setSection('Envanter Planlama');
    setFilters({
      regions: selectedRegions,
      stores: effectiveSelectedStores,
      categories: effectiveSelectedCategories,
      products: effectiveSelectedProducts,
    });

    if (kpis && inventoryAlerts) {
      setMetrics({
        'Toplam Stok Değeri': `${(kpis.totalStockValue / 1000000).toFixed(1)}M TL`,
        'Stok Kapsam Süresi': `${kpis.stockCoverageDays.toFixed(1)} Gün`,
        'Stoksuz Kalma Riski': `${kpis.stockOutRiskItems} Ürün`,
        'Fazla Stok': `${kpis.excessInventoryItems} Ürün`,
        'Aktif Uyarılar': inventoryAlerts.length,
      });
    }
  }, [
    selectedRegions,
    effectiveSelectedStores,
    effectiveSelectedCategories,
    effectiveSelectedProducts,
    kpis,
    inventoryAlerts,
    setSection,
    setFilters,
    setMetrics,
  ]);

  return (
    <div className='flex flex-col space-y-6 pb-6'>
      <FilterBar
        title='Envanter Planlama'
        titleTooltip='Bölge, mağaza ve ürün bazında filtreleme yaparak envanter verilerini özelleştirin.'
        regionOptions={filteredRegionOptions}
        selectedRegions={selectedRegions}
        onRegionChange={setSelectedRegions}
        storeOptions={storeOptions}
        selectedStores={effectiveSelectedStores}
        onStoreChange={setSelectedStores}
        categoryOptions={categoryOptions}
        selectedCategories={effectiveSelectedCategories}
        onCategoryChange={setSelectedCategories}
        productOptions={productOptions}
        selectedProducts={effectiveSelectedProducts}
        onProductChange={setSelectedProducts}
      >
        <div className='w-full md:w-auto min-w-32'>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder='Periyot' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='30'>30 Gün</SelectItem>
              <SelectItem value='60'>60 Gün</SelectItem>
              <SelectItem value='180'>180 Gün</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <InventoryKpiSection data={kpis} />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-1'>
          <SaleRateChart
            items={periodItems}
            selectedCategories={effectiveSelectedCategories}
            onCategoryClick={(categoryValue) => {
              // Simple toggle behavior since categories are now unique keys
              setSelectedCategories((prev) => {
                if (prev.includes(categoryValue)) {
                  // Deselect
                  return prev.filter((c) => c !== categoryValue);
                }
                // Select (single selection to match pie chart behavior, or append for multi-select)
                // Let's support multi-select toggling
                return [...prev, categoryValue];
              });
            }}
          />
        </div>
        <div className='lg:col-span-2'>
          <FastestMovingTable
            items={periodItems.slice(0, 8)}
            onSeeAll={handleSeeAllPerformance}
            period={periodDays}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
        <PlanningAlerts
          data={inventoryAlerts}
          onActionClick={handleAlertActionClick}
          period={periodDays}
        />
        <StoreComparison data={storePerformance} period={periodDays} />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
        <div className='lg:col-span-3'>
          <InventoryCharts
            data={stockTrends}
            hasSelection={hasChartSelection}
            products={productOptions}
            selectedProductId={chartSelectedProductId}
            onProductChange={setChartSelectedProductId}
            period={periodDays}
          />
        </div>
        <div className='lg:col-span-2'>
          <CustomProductLists onListSelect={setSelectedProducts} />
        </div>
      </div>

      <div ref={tableRef}>
        <InventoryTable
          data={periodItems}
          performanceFilter={tablePerformanceFilter}
          onPerformanceFilterChange={setTablePerformanceFilter}
          period={periodDays}
        />
      </div>

      {/* Product Detail Sheet for Planning Alerts */}
      <ProductDetailSheet
        item={alertSelectedItem}
        open={alertSheetOpen}
        onOpenChange={setAlertSheetOpen}
      />
    </div>
  );
}
