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
import { getInventoryKPIs } from '@/data/mock-data';
import { InventoryItem } from '@/types/inventory';
import type { InventoryAlert } from '@/types/inventory';

import { usePermissions } from '@/hooks/use-permissions';
import {
  useInventoryKPIs,
  useInventoryItems,
  useStockTrends,
  useStorePerformance,
  useInventoryAlerts,
} from '@/services';
import { useFilterOptions } from '@/services/hooks/filters/use-filter-options';

function parseStoreCodeFromAlert(storeName?: string) {
  if (!storeName) {
    return undefined;
  }
  const match = storeName.match(/-\s*(\d+)\s*$/);
  return match?.[1];
}

export function InventoryPlanningSection() {
  // Get user permissions and data scope
  const {
    dataScope,
    userRole,
    isLoading: permissionsLoading,
  } = usePermissions();

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
  const [pendingAlertTarget, setPendingAlertTarget] = useState<{
    sku: string;
    storeCode?: string;
  } | null>(null);

  // Get filter options from API
  const { regionOptions, storeOptions, categoryOptions, productOptions } =
    useFilterOptions({
      selectedRegions,
      selectedStores,
      selectedCategories,
    });

  // Filter region options based on user permissions
  const filteredRegionOptions = useMemo(() => {
    if (dataScope.regions.length > 0) {
      return regionOptions.filter((r) => dataScope.regions.includes(r.value));
    }
    return regionOptions;
  }, [dataScope.regions, regionOptions]);

  // Compute effective selections (filter out invalid values)
  const effectiveSelectedStores = useMemo(() => {
    const validValues = new Set(storeOptions.map((s) => s.value));
    return selectedStores.filter((s) => validValues.has(s));
  }, [selectedStores, storeOptions]);

  const effectiveSelectedCategories = useMemo(() => {
    const validValues = new Set(categoryOptions.map((c) => c.value));
    return selectedCategories.filter((c) => validValues.has(c));
  }, [selectedCategories, categoryOptions]);

  const effectiveSelectedProducts = useMemo(() => {
    const validValues = new Set(productOptions.map((p) => p.value));
    return selectedProducts.filter((p) => validValues.has(p));
  }, [selectedProducts, productOptions]);

  // --- Chart Selection Logic ---
  const [chartSelectedProductId, setChartSelectedProductId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // 1. If global filter has exactly 1 product, force chart to match
    if (
      effectiveSelectedProducts.length === 1 &&
      chartSelectedProductId !== effectiveSelectedProducts[0]
    ) {
      setChartSelectedProductId(effectiveSelectedProducts[0]);
      return;
    }

    // 2. If current chart selection is invalid or empty, pick the first option
    if (productOptions.length > 0) {
      const isValid =
        chartSelectedProductId &&
        productOptions.some((p) => p.value === chartSelectedProductId);
      if (!isValid && chartSelectedProductId !== productOptions[0].value) {
        setChartSelectedProductId(productOptions[0].value);
      }
      return;
    }

    if (chartSelectedProductId !== undefined) {
      setChartSelectedProductId(undefined);
    }
  }, [chartSelectedProductId, effectiveSelectedProducts, productOptions]);

  // Fetch real KPIs from API
  const { data: kpis, isLoading: kpisLoading } = useInventoryKPIs({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
  });

  // Fallback to mock data if API is not available
  const fallbackKpis = useMemo(
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

  const displayKpis = kpis || fallbackKpis;

  // 2. Period-Aware Data (Lists & Charts)
  // Fetch real data from API
  const { data: inventoryItemsData } = useInventoryItems({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
    limit: 100,
  });

  const { data: stockTrendsData } = useStockTrends({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: chartSelectedProductId
      ? [chartSelectedProductId]
      : effectiveSelectedProducts,
    days: periodDays,
  });

  const { data: storePerformanceData } = useStorePerformance({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
  });

  // Use API data or fallback to empty arrays
  const periodItems = inventoryItemsData?.items ?? [];
  const stockTrends = stockTrendsData?.trends ?? [];
  const storePerformance = (storePerformanceData?.stores ?? []).map(
    (store) => ({
      ...store,
      stockEfficiency: store.stockEfficiency ?? store.storeEfficiency ?? 0,
    }),
  );

  const { data: inventoryAlerts = [] } = useInventoryAlerts({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    limit: 40,
  });
  const inventoryAlertCount = inventoryAlerts.length;

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
  const findMatchingItem = useCallback(
    (sku: string, storeCode?: string) => {
      if (!storeCode) {
        return periodItems.find((item) => item.sku === sku);
      }
      const prefix = `${storeCode}_`;
      return periodItems.find(
        (item) => item.sku === sku && item.productKey.startsWith(prefix),
      );
    },
    [periodItems],
  );

  const handleAlertActionClick = useCallback(
    (alert: InventoryAlert) => {
      const sku = alert.sku;
      const storeCode = parseStoreCodeFromAlert(alert.storeName);
      const matchingItem = findMatchingItem(sku, storeCode);

      if (matchingItem) {
        setAlertSelectedItem(matchingItem);
        setAlertSheetOpen(true);
        return;
      }

      // If item is not in the current page/filter context, narrow filters
      // so the target can be fetched and opened automatically.
      if (storeCode) {
        setSelectedStores([storeCode]);
      }
      setSelectedProducts([sku]);
      setPendingAlertTarget({ sku, storeCode });
    },
    [findMatchingItem],
  );

  useEffect(() => {
    if (!pendingAlertTarget) {
      return;
    }

    const matchingItem = findMatchingItem(
      pendingAlertTarget.sku,
      pendingAlertTarget.storeCode,
    );
    if (!matchingItem) {
      return;
    }

    setAlertSelectedItem(matchingItem);
    setAlertSheetOpen(true);
    setPendingAlertTarget(null);
  }, [pendingAlertTarget, findMatchingItem]);

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

    if (displayKpis && inventoryAlerts) {
      setMetrics({
        'Toplam Stok Değeri': `${(displayKpis.totalStockValue / 1000000).toFixed(1)}M TL`,
        'Stok Kapsam Süresi': `${displayKpis.stockCoverageDays.toFixed(1)} Gün`,
        'Stoksuz Kalma Riski': `${displayKpis.stockOutRiskItems} Ürün`,
        'Fazla Stok': `${displayKpis.excessInventoryItems} Ürün`,
        'Aktif Uyarılar': inventoryAlertCount,
      });
    }
  }, [
    selectedRegions,
    effectiveSelectedStores,
    effectiveSelectedCategories,
    effectiveSelectedProducts,
    kpis,
    inventoryAlertCount,
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

      <InventoryKpiSection data={displayKpis} />

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
