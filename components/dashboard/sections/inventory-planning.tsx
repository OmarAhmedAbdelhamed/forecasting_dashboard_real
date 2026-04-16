'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDashboardContext } from '@/contexts/dashboard-context';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { InventoryKpiSection } from '@/components/ui/inventory-planning/inventory-kpis';
import { InventoryCharts } from '@/components/ui/inventory-planning/inventory-charts';
import { StoreComparison } from '@/components/ui/inventory-planning/store-comparison';
import { InventoryTable } from '@/components/ui/inventory-planning/inventory-table';
import { PlanningAlerts } from '@/components/ui/inventory-planning/planning-alerts';
import type { TransferAdviceClickPayload } from '@/components/ui/inventory-planning/planning-alerts';
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
import { PageLoading } from '@/components/ui/shared/page-loading';
import { getDistance, getDistanceDisplay } from '@/lib/store-distances';
import { maxSafeTransferForSender } from '@/components/ui/inventory-planning/transfer-safety';

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
  const parts = withoutCode
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : withoutCode;
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
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('all');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryPage, setInventoryPage] = useState(1);

  // Period Selection State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const parsedPeriodDays = parseInt(selectedPeriod, 10);
  const periodDays = Number.isNaN(parsedPeriodDays) ? 30 : parsedPeriodDays;

  const tableRef = useRef<HTMLDivElement>(null);
  const lastRiskLogKeyRef = useRef<string>('');

  // Product detail sheet state for planning alerts
  const [alertSelectedItem, setAlertSelectedItem] =
    useState<InventoryItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(
    null,
  );
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const [sheetInitialForm, setSheetInitialForm] = useState<
    'none' | 'purchase' | 'transfer' | 'safety'
  >('none');
  const [sheetTransferPrefill, setSheetTransferPrefill] = useState<{
    sourceStoreLabel?: string;
    sourceStoreId?: string;
    destinationStoreId?: string;
    transferQuantity?: number;
    reason?: string;
    notes?: string;
  } | null>(null);
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
  // Base items for non-table widgets (must stay independent from table-only filters)
  const baseItemsParams = {
    regionIds: selectedRegions,
    storeIds: effectiveSelectedStores,
    categoryIds: effectiveSelectedCategories,
    productIds: effectiveSelectedProducts,
    days: periodDays,
  };

  const { data: inventoryItemsData, isLoading: itemsLoading } =
    useInventoryItems({
      ...baseItemsParams,
      limit: 1000,
      page: 1,
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
  const inventoryPagination = {
    page: inventoryPage,
    totalPages: Math.max(1, Math.ceil((periodItems.length || 0) / 25)),
    total: periodItems.length || 0,
  };
  const stockTrends = stockTrendsData?.trends ?? [];
  const storePerformance = (storePerformanceData?.stores ?? []).map(
    (store) => ({
      ...store,
      stockEfficiency: store.stockEfficiency ?? store.storeEfficiency ?? 0,
    }),
  );

  const stockRiskItems = useMemo(
    () =>
      periodItems.filter(
        (item) => item.status === 'Low Stock' || item.status === 'Out of Stock',
      ),
    [periodItems],
  );

  useEffect(() => {
    setInventoryPage(1);
  }, [
    selectedRegions,
    effectiveSelectedStores,
    effectiveSelectedCategories,
    effectiveSelectedProducts,
    tableStatusFilter,
    tablePerformanceFilter,
    periodDays,
  ]);

  useEffect(() => {
    const totalPages = inventoryPagination?.totalPages ?? 1;
    if (inventoryPage > totalPages) {
      setInventoryPage(totalPages);
    }
  }, [inventoryPage, inventoryPagination?.totalPages]);

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
    const safePeriodDays = Math.max(1, periodDays);
    const alertBySkuAndStore = new Map<string, InventoryAlert>();
    inventoryAlerts.forEach((alert) => {
      const key = `${alert.sku}__${alert.storeName || ''}`;
      alertBySkuAndStore.set(key, alert);
    });

    return inventoryAlerts.map((alert) => {
      const transferSourceStore = alert.metrics?.transferSourceStore;
      const requestedTransferQty = Math.max(
        0,
        alert.metrics?.transferQuantity ?? 0,
      );

      const getSafeTransferQty = (): number => {
        if (!transferSourceStore || requestedTransferQty <= 0) {
          return 0;
        }

        const sourceKey = `${alert.sku}__${transferSourceStore}`;
        const sourceAlert = alertBySkuAndStore.get(sourceKey);
        if (!sourceAlert) {
          return 0;
        }

        const sourceStock = Math.max(0, sourceAlert.metrics?.currentStock ?? 0);
        const sourceForecastPeriod = Math.max(
          0,
          sourceAlert.metrics?.forecastedDemand ?? 0,
        );
        const senderTransferableSurplus = maxSafeTransferForSender(
          sourceStock,
          sourceForecastPeriod,
          safePeriodDays,
        );
        return Math.max(
          0,
          Math.min(requestedTransferQty, senderTransferableSurplus),
        );
      };

      const safeTransferQty = getSafeTransferQty();

      if (transferSourceStore && safeTransferQty > 0) {
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
              availableStock: safeTransferQty,
              isSurplus: true,
            },
          ],
          metrics: {
            ...alert.metrics,
            transferQuantity: safeTransferQty,
          },
          noTransferOptions: false,
        };
      }

      if (alert.type === 'stockout' || alert.type === 'reorder') {
        return {
          ...alert,
          metrics: {
            ...alert.metrics,
            transferSourceStore: null,
            transferQuantity: 0,
          },
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (itemsLoading || !inventoryItemsData) {
      return;
    }

    const logKey = [
      selectedRegions.join(','),
      effectiveSelectedStores.join(','),
      effectiveSelectedCategories.join(','),
      effectiveSelectedProducts.join(','),
      periodDays,
      stockRiskItems.length,
    ].join('|');

    if (lastRiskLogKeyRef.current === logKey) {
      return;
    }

    lastRiskLogKeyRef.current = logKey;

    console.groupCollapsed(
      `[inventory-planning] stock risk items (${stockRiskItems.length})`,
    );
    console.log('filters', {
      regions: selectedRegions,
      stores: effectiveSelectedStores,
      categories: effectiveSelectedCategories,
      products: effectiveSelectedProducts,
      periodDays,
    });
    console.table(
      stockRiskItems.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        stockLevel: item.stockLevel,
        forecastedDemand: item.forecastedDemand,
        daysOfCoverage: item.daysOfCoverage,
        status: item.status,
      })),
    );
    console.groupEnd();
  }, [
    effectiveSelectedCategories,
    effectiveSelectedProducts,
    effectiveSelectedStores,
    inventoryItemsData,
    itemsLoading,
    periodDays,
    selectedRegions,
    stockRiskItems,
  ]);

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
      setSheetInitialForm('none');
      setSheetTransferPrefill(null);
      setAlertSheetOpen(true);
    },
    [buildItemFromAlert, findMatchingItem],
  );

  const handleTransferAdviceClick = useCallback(
    (payload: TransferAdviceClickPayload) => {
      const sourceStoreId =
        parseStoreCodeFromAlert(payload.fromStore) ?? undefined;
      const destinationStoreId =
        parseStoreCodeFromAlert(payload.toStore) ?? undefined;

      const sourceAlert = enhancedAlerts.find(
        (alert) =>
          alert.sku === payload.sku && alert.storeName === payload.fromStore,
      );
      const targetAlert = enhancedAlerts.find(
        (alert) =>
          alert.sku === payload.sku && alert.storeName === payload.toStore,
      );
      const fallbackAlert = targetAlert ?? sourceAlert;
      if (!fallbackAlert) {
        return;
      }
      const sourceItem = sourceStoreId
        ? findMatchingItem(payload.sku, sourceStoreId)
        : undefined;

      setSelectedAlert(fallbackAlert);
      setAlertSelectedItem(
        sourceItem ??
          (sourceAlert ? buildItemFromAlert(sourceAlert) : null) ??
          buildItemFromAlert(fallbackAlert),
      );
      setSheetInitialForm('transfer');
      setSheetTransferPrefill({
        sourceStoreLabel: payload.fromStore,
        sourceStoreId,
        destinationStoreId,
        transferQuantity: payload.transferQty,
        reason: 'stock_balancing',
        notes: `${payload.toStore} magazasinda ${periodDays} gunluk stok hedefine ulasmak icin transfer onerisi.`,
      });
      setAlertSheetOpen(true);
    },
    [buildItemFromAlert, enhancedAlerts, findMatchingItem, periodDays],
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
        'Toplam Stok Degeri': `${(displayKpis.totalStockValue / 1000000).toFixed(1)}M TL`,
        'Stok Kapsam Suresi': `${displayKpis.stockCoverageDays.toFixed(1)} Gun`,
        'Stoksuz Kalma Riski': `${displayKpis.stockOutRiskItems} Urun`,
        'Fazla Stok': `${displayKpis.excessInventoryItems} Urun`,
        'Aktif Uyarilar': inventoryAlertCount,
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
        variant='inventory'
        title='Envanter Planlama yukleniyor...'
        description='Stok KPI, urun listeleri ve uyarilar getiriliyor.'
      />
    );
  }

  return (
    <div className='flex flex-col space-y-6 pb-6'>
      <FilterBar
        title='Envanter Planlama'
        titleTooltip='Bolge, magaza ve urun bazinda filtreleme yaparak envanter verilerini ozellestirin.'
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
                <SelectItem value='4'>4 Gun</SelectItem>
                <SelectItem value='7'>7 Gun</SelectItem>
                <SelectItem value='14'>2 Hafta</SelectItem>
                <SelectItem value='30'>1 Ay</SelectItem>
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
            items={periodItems}
            onSeeAll={handleSeeAllPerformance}
            period={periodDays}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
        <PlanningAlerts
          data={filteredEnhancedAlerts}
          allData={enhancedAlerts}
          onActionClick={handleAlertActionClick}
          onTransferAdviceClick={handleTransferAdviceClick}
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
          searchTerm={inventorySearchTerm}
          onSearchTermChange={(term) => {
            setInventorySearchTerm(term);
            setInventoryPage(1);
          }}
          statusFilter={tableStatusFilter}
          onStatusFilterChange={(filter) => {
            setTableStatusFilter(filter);
            setInventoryPage(1);
          }}
          performanceFilter={tablePerformanceFilter}
          onPerformanceFilterChange={(filter) => {
            setTablePerformanceFilter(filter);
            setInventoryPage(1);
          }}
          period={periodDays}
          storeOptions={alertMarketOptions}
          currentPage={inventoryPagination?.page ?? inventoryPage}
          totalPages={inventoryPagination?.totalPages ?? 1}
          totalItems={inventoryPagination?.total ?? periodItems.length}
          onPageChange={setInventoryPage}
          isLoading={itemsLoading}
        />
      </div>

      {/* Product Detail Sheet for Planning Alerts */}
      <ProductDetailSheet
        item={alertSelectedItem}
        alert={selectedAlert}
        storeOptions={storeOptions}
        initialForm={sheetInitialForm}
        transferPrefill={sheetTransferPrefill}
        open={alertSheetOpen}
        onOpenChange={(open) => {
          setAlertSheetOpen(open);
          if (!open) {
            setSelectedAlert(null);
            setSheetInitialForm('none');
            setSheetTransferPrefill(null);
          }
        }}
        period={periodDays}
      />
    </div>
  );
}
