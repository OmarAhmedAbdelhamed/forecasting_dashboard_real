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
  generateStockTrends,
  generateStorePerformance,
  generateInventoryAlerts,
} from '@/data/mock-data';
import { InventoryItem } from '@/types/inventory';

export function InventoryPlanningSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [tablePerformanceFilter, setTablePerformanceFilter] =
    useState<string>('all');
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

  const categoryOptions = useMemo(
    () => getCategoriesByStores(selectedStores, selectedRegions),
    [selectedStores, selectedRegions],
  );

  const productOptions = useMemo(
    () =>
      getProductsByContext(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
  );

  // Cascading Selection Resets
  useEffect(() => {
    const validStoreValues = storeOptions.map((s) => s.value);
    setSelectedStores((prev) =>
      prev.filter((s) => validStoreValues.includes(s)),
    );
  }, [storeOptions]);

  useEffect(() => {
    const validCategoryValues = categoryOptions.map((c) => c.value);
    setSelectedCategories((prev) =>
      prev.filter((c) => validCategoryValues.includes(c)),
    );
  }, [categoryOptions]);

  useEffect(() => {
    const validProductValues = productOptions.map((p) => p.value);
    setSelectedProducts((prev) =>
      prev.filter((p) => validProductValues.includes(p)),
    );
  }, [productOptions]);

  // Derived Data based on ALL filters
  const kpis = useMemo(
    () =>
      getInventoryKPIs(
        selectedRegions,
        selectedStores,
        selectedCategories,
        selectedProducts,
      ),
    [selectedRegions, selectedStores, selectedCategories, selectedProducts],
  );

  const inventoryItems = useMemo(
    () =>
      generateInventoryItems(
        selectedRegions,
        selectedStores,
        selectedCategories,
        selectedProducts,
      ),
    [selectedRegions, selectedStores, selectedCategories, selectedProducts],
  );

  const stockTrends = useMemo(
    () =>
      generateStockTrends(
        30,
        selectedRegions,
        selectedStores,
        selectedCategories,
        selectedProducts,
      ),
    [selectedRegions, selectedStores, selectedCategories, selectedProducts],
  );

  const storePerformance = useMemo(
    () =>
      generateStorePerformance(
        selectedRegions,
        selectedStores,
        selectedProducts,
        selectedCategories,
      ),
    [selectedRegions, selectedStores, selectedProducts, selectedCategories],
  );

  const inventoryAlerts = useMemo(
    () => {
      // Assuming selectedRegion and selectedStore are meant to be derived from selectedRegions and selectedStores
      // and that the intent is to pass only the first selected region/store if available, or empty arrays.
      // This interpretation aligns with the provided Code Edit's structure,
      // while correcting the syntax and variable names to match existing state.
      const selectedRegion =
        selectedRegions.length > 0 ? selectedRegions[0] : undefined;
      const selectedStore =
        selectedStores.length > 0 ? selectedStores[0] : undefined;

      return generateInventoryAlerts(
        selectedRegion ? [selectedRegion] : [],
        selectedStore ? [selectedStore] : [],
      );
    },
    [selectedRegions, selectedStores], // Dependency array updated to reflect actual dependencies
  );

  const hasChartSelection =
    selectedStores.length > 0 || selectedProducts.length > 0;

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
        const filteredItem = inventoryItems.find((item) => item.sku === sku);
        if (filteredItem) {
          setAlertSelectedItem(filteredItem);
          setAlertSheetOpen(true);
        }
      }
    },
    [inventoryItems],
  );

  // Sync with Dashboard Context
  const { setSection, setFilters, setMetrics } = useDashboardContext();

  useEffect(() => {
    setSection('Envanter Planlama');
    setFilters({
      regions: selectedRegions,
      stores: selectedStores,
      categories: selectedCategories,
      products: selectedProducts,
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
    selectedStores,
    selectedCategories,
    selectedProducts,
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
        regionOptions={REGIONS_FLAT}
        selectedRegions={selectedRegions}
        onRegionChange={setSelectedRegions}
        storeOptions={storeOptions}
        selectedStores={selectedStores}
        onStoreChange={setSelectedStores}
        categoryOptions={categoryOptions}
        selectedCategories={selectedCategories}
        onCategoryChange={setSelectedCategories}
        productOptions={productOptions}
        selectedProducts={selectedProducts}
        onProductChange={setSelectedProducts}
      />

      <InventoryKpiSection data={kpis} />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-1'>
          <SaleRateChart items={inventoryItems} />
        </div>
        <div className='lg:col-span-2'>
          <FastestMovingTable
            items={inventoryItems.slice(0, 8)}
            onSeeAll={handleSeeAllPerformance}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
        <PlanningAlerts
          data={inventoryAlerts}
          onActionClick={handleAlertActionClick}
        />
        <StoreComparison data={storePerformance} />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
        <div className='lg:col-span-3'>
          <InventoryCharts
            data={stockTrends}
            hasSelection={hasChartSelection}
          />
        </div>
        <div className='lg:col-span-2'>
          <CustomProductLists onListSelect={setSelectedProducts} />
        </div>
      </div>

      <div ref={tableRef}>
        <InventoryTable
          data={inventoryItems}
          performanceFilter={tablePerformanceFilter}
          onPerformanceFilterChange={setTablePerformanceFilter}
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
