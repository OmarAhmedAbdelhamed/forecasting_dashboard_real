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
import type { CustomProductList, InventoryAlert } from '@/types/inventory';
import { useCustomLists } from '@/contexts/custom-lists-context';

import { usePermissions } from '@/hooks/use-permissions';
import {
  useInventoryKPIs,
  useInventoryItems,
  useStockTrends,
  useStorePerformance,
  useInventoryAlerts,
} from '@/services';
import { useFilterOptions } from '@/services/hooks/filters/use-filter-options';
import { PageLoading } from '@/components/ui/shared/page-loading';
import { getDistance, getDistanceDisplay } from '@/lib/store-distances';

function parseStoreCodeFromAlert(storeName?: string) {
  if (!storeName || storeName.trim().length === 0) {
    return undefined;
  }
  const match = /-\s*(\d+)\s*$/.exec(storeName);
  return match?.[1] ?? undefined;
}

function parseStoreLabelForDistance(storeName?: string) {
  if (!storeName || storeName.trim().length === 0) {
    return undefined;
  }
  const codeMatch = /-\s*(\d+)\s*$/.exec(storeName);
  if (codeMatch?.[1]) {
    return codeMatch[1];
  }
  // Fallback for labels without code.
  const withoutCode = storeName.replace(/-\s*\d+\s*$/, '').trim();
  const parts = withoutCode.split('-').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : withoutCode;
}

function buildRandomProductLists(
  productOptions: { value: string; label: string }[],
): CustomProductList[] {
  if (productOptions.length === 0) {
    return [];
  }

  const shuffled = [...productOptions].sort(() => Math.random() - 0.5);
  const bucketSize = Math.max(1, Math.floor(shuffled.length / 3));
  const groups = [
    shuffled.slice(0, bucketSize),
    shuffled.slice(bucketSize, bucketSize * 2),
    shuffled.slice(bucketSize * 2, bucketSize * 3),
  ];

  const fallback = shuffled.slice(0, Math.min(8, shuffled.length));
  const today = new Date().toISOString().slice(0, 10);
  const names = [
    'Kampanya Adaylari',
    'Stok Takip Grubu',
    'Odak Urunler',
  ];

  return groups.map((group, index) => {
    const selected = group.length > 0 ? group : fallback;
    return {
      id: `AUTO_LIST_${index + 1}`,
      name: names[index],
      itemCount: selected.length,
      lastModified: today,
      skus: selected.map((item) => item.value),
    };
  });
}

export function InventoryPlanningSection() {
  // Get user permissions and data scope
  const {
    dataScope,
    userRole,
    isLoading: permissionsLoading,
    canUseFilter,
  } = usePermissions();

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedAlertMarket, setSelectedAlertMarket] = useState<string>('all');
  const [tablePerformanceFilter, setTablePerformanceFilter] =
    useState<string>('all');

  // Period Selection State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const parsedPeriodDays = parseInt(selectedPeriod, 10);
  const periodDays = Number.isNaN(parsedPeriodDays) ? 30 : parsedPeriodDays;

  const tableRef = useRef<HTMLDivElement>(null);

  // Product detail sheet state for planning alerts
  const [alertSelectedItem, setAlertSelectedItem] =
    useState<InventoryItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(null);
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const { replaceAutoLists } = useCustomLists();

  // Get filter options from API
  const {
    regionOptions,
    storeOptions,
    categoryOptions,
    productOptions,
    isLoading: filterOptionsLoading,
  } = useFilterOptions({
    selectedRegions,
    selectedStores,
    selectedCategories,
  });

  useEffect(() => {
    replaceAutoLists(buildRandomProductLists(productOptions));
  }, [productOptions, replaceAutoLists]);

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
    days: periodDays,
  });

  // Fallback to mock data if API is not available
  const fallbackKpis = useMemo(
    () =>
      getInventoryKPIs(
        selectedRegions,
        effectiveSelectedStores,
        effectiveSelectedCategories,
        effectiveSelectedProducts,
        periodDays,
      ),
    [
      selectedRegions,
      effectiveSelectedStores,
      effectiveSelectedCategories,
      effectiveSelectedProducts,
      periodDays,
    ],
  );

  const displayKpis = kpis || fallbackKpis;

  // 2. Period-Aware Data (Lists & Charts)
  // Fetch real data from API
  const { data: inventoryItemsData, isLoading: itemsLoading } =
    useInventoryItems({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
    limit: 100,
    days: periodDays,
  });

  const { data: stockTrendsData, isLoading: trendsLoading } = useStockTrends({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: chartSelectedProductId
      ? [chartSelectedProductId]
      : effectiveSelectedProducts,
    days: periodDays,
  });

  const { data: storePerformanceData, isLoading: storePerformanceLoading } =
    useStorePerformance({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
    days: periodDays,
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

  const { data: inventoryAlerts = [], isLoading: alertsLoading } =
    useInventoryAlerts({
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
    limit: 5000,
    days: periodDays,
  });

  const enhancedAlerts = useMemo(() => {
    return inventoryAlerts.map((alert) => {
      const transferSourceStore = alert.metrics?.transferSourceStore;
      const transferQuantity = alert.metrics?.transferQuantity ?? 0;

      if (transferSourceStore) {
        const targetKey = parseStoreLabelForDistance(alert.storeName);
        const sourceKey = parseStoreLabelForDistance(transferSourceStore);
        const distance =
          targetKey && sourceKey ? getDistance(targetKey, sourceKey) : null;
        const distanceDisplay =
          targetKey && sourceKey
            ? getDistanceDisplay(targetKey, sourceKey)
            : '?';

        return {
          ...alert,
          proximityOptions: [
            {
              storeName: transferSourceStore,
              distance: distance ?? Number.MAX_VALUE,
              distanceDisplay,
              availableStock: transferQuantity,
              isSurplus: true,
            },
          ],
          noTransferOptions: false,
        };
      }

      if (alert.type === 'stockout' || alert.type === 'reorder') {
        return {
          ...alert,
          noTransferOptions: true,
        };
      }

      return alert;
    });
  }, [inventoryAlerts]);

  const inventoryAlertCount = inventoryAlerts.length;

  const alertMarketOptions = useMemo(() => {
    if (effectiveSelectedStores.length > 0) {
      const selectedSet = new Set(effectiveSelectedStores);
      return storeOptions.filter((store) => selectedSet.has(store.value));
    }
    return storeOptions;
  }, [effectiveSelectedStores, storeOptions]);

  const effectiveSelectedAlertMarket = useMemo(() => {
    if (effectiveSelectedStores.length === 0) {
      return selectedAlertMarket;
    }
    if (effectiveSelectedStores.includes(selectedAlertMarket)) {
      return selectedAlertMarket;
    }
    return effectiveSelectedStores[0];
  }, [effectiveSelectedStores, selectedAlertMarket]);

  const filteredEnhancedAlerts = useMemo(() => {
    if (effectiveSelectedAlertMarket === 'all') {
      return enhancedAlerts;
    }
    return enhancedAlerts.filter((alert) => {
      const alertStoreCode = parseStoreCodeFromAlert(alert.storeName);
      return alertStoreCode === effectiveSelectedAlertMarket;
    });
  }, [effectiveSelectedAlertMarket, enhancedAlerts]);

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

  const buildItemFromAlert = useCallback(
    (alert: InventoryAlert): InventoryItem => {
      const currentStock = alert.metrics?.currentStock ?? 0;
      const threshold = alert.metrics?.threshold ?? 0;
      const forecastedDemand = alert.metrics?.forecastedDemand ?? threshold;
      const coverage =
        forecastedDemand > 0
          ? Number(
              (
                currentStock /
                (forecastedDemand / Math.max(periodDays, 1))
              ).toFixed(1),
            )
          : 0;
      const status: InventoryItem['status'] =
        alert.type === 'stockout'
          ? 'Out of Stock'
          : alert.type === 'reorder'
            ? 'Low Stock'
            : alert.type === 'overstock'
              ? 'Overstock'
              : 'In Stock';

      return {
        id: alert.id,
        sku: alert.sku,
        productName: alert.productName,
        category: 'Belirsiz',
        productKey: `${parseStoreCodeFromAlert(alert.storeName) ?? 'store'}_${alert.sku}`,
        stockLevel: currentStock,
        minStockLevel: threshold,
        maxStockLevel: Math.max(threshold, forecastedDemand),
        reorderPoint: threshold,
        forecastedDemand,
        stockValue: 0,
        daysOfCoverage: coverage,
        status,
        turnoverRate: 0,
        lastRestockDate: null,
        leadTimeDays: 5,
        quantityOnOrder: 0,
        todaysSales: 0,
        price: 0,
      };
    },
    [periodDays],
  );

  const handleAlertActionClick = useCallback(
    (alert: InventoryAlert) => {
      const sku = alert.sku;
      const storeCode = parseStoreCodeFromAlert(alert.storeName);
      const matchingItem = findMatchingItem(sku, storeCode);
      setSelectedAlert(alert);
      setAlertSelectedItem(matchingItem ?? buildItemFromAlert(alert));
      setAlertSheetOpen(true);
    },
    [buildItemFromAlert, findMatchingItem],
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

  const isInitialLoading =
    permissionsLoading ||
    filterOptionsLoading ||
    kpisLoading ||
    itemsLoading ||
    trendsLoading ||
    storePerformanceLoading ||
    alertsLoading;

  const hasInitialData =
    inventoryItemsData !== undefined ||
    stockTrendsData !== undefined ||
    storePerformanceData !== undefined ||
    kpis !== undefined;

  if (isInitialLoading && !hasInitialData) {
    return (
      <PageLoading
        title='Envanter Planlama yükleniyor…'
        description='Stok KPI, ürün listeleri ve uyarılar getiriliyor.'
      />
    );
  }

  return (
    <div className='flex flex-col space-y-6 pb-6'>
      <FilterBar
        title='Envanter Planlama'
        titleTooltip='Bölge, mağaza ve ürün bazında filtreleme yaparak envanter verilerini özelleştirin.'
        regionOptions={filteredRegionOptions}
        selectedRegions={selectedRegions}
        onRegionChange={(regions) => {
          setSelectedRegions(regions);
          setSelectedStores([]);
          setSelectedCategories([]);
          setSelectedProducts([]);
        }}
        storeOptions={storeOptions}
        selectedStores={effectiveSelectedStores}
        onStoreChange={(stores) => {
          setSelectedStores(stores);
          setSelectedCategories([]);
          setSelectedProducts([]);
        }}
        categoryOptions={categoryOptions}
        selectedCategories={effectiveSelectedCategories}
        onCategoryChange={(categories) => {
          setSelectedCategories(categories);
          setSelectedProducts([]);
        }}
        productOptions={productOptions}
        selectedProducts={effectiveSelectedProducts}
        onProductChange={setSelectedProducts}
      >
        {canUseFilter('filter-period') && (
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
        )}
      </FilterBar>

      <InventoryKpiSection data={displayKpis} period={periodDays} />

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
          data={filteredEnhancedAlerts}
          onActionClick={handleAlertActionClick}
          period={periodDays}
          marketOptions={alertMarketOptions}
          selectedMarket={effectiveSelectedAlertMarket}
          onMarketChange={setSelectedAlertMarket}
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
          <CustomProductLists
            onListSelect={setSelectedProducts}
            productOptions={productOptions}
            activeSkus={effectiveSelectedProducts}
          />
        </div>
      </div>

      <div ref={tableRef}>
        <InventoryTable
          data={periodItems}
          performanceFilter={tablePerformanceFilter}
          onPerformanceFilterChange={setTablePerformanceFilter}
          period={periodDays}
          storeOptions={alertMarketOptions}
        />
      </div>

      {/* Product Detail Sheet for Planning Alerts */}
      <ProductDetailSheet
        item={alertSelectedItem}
        alert={selectedAlert}
        storeOptions={storeOptions}
        open={alertSheetOpen}
        onOpenChange={(open) => {
          setAlertSheetOpen(open);
          if (!open) {
            setSelectedAlert(null);
          }
        }}
        period={periodDays}
      />
    </div>
  );
}
