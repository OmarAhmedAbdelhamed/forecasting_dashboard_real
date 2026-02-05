'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { InventoryKpiSection } from '@/components/ui/inventory-planning/inventory-kpis';
import { InventoryCharts } from '@/components/ui/inventory-planning/inventory-charts';
import { StoreComparison } from '@/components/ui/inventory-planning/store-comparison';
import { InventoryTable } from '@/components/ui/inventory-planning/inventory-table';
import { PlanningAlerts } from '@/components/ui/inventory-planning/planning-alerts';
import { CustomProductLists } from '@/components/ui/inventory-planning/custom-product-lists';

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
import { useMemo, useEffect, useRef } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { UserRole } from '@/types/auth';

export function InventoryPlanningSection() {
  // Get user permissions and data scope
  const { dataScope, userRole, isLoading: permissionsLoading } = usePermissions();

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [tablePerformanceFilter, setTablePerformanceFilter] =
    useState<string>('all');
  const tableRef = useRef<HTMLDivElement>(null);

  // Filter options based on user's data scope
  const filteredRegionOptions = useMemo(() => {
    if (permissionsLoading) {return [];}

    // If user has unrestricted access (general_manager, inventory_planner, buyer), show all regions
    if (!userRole || !dataScope.regions || dataScope.regions.length === 0) {
      return REGIONS_FLAT;
    }

    // Filter regions to only those in user's scope
    return REGIONS_FLAT.filter((region) =>
      dataScope.regions?.includes(region.value)
    );
  }, [dataScope.regions, userRole, permissionsLoading]);

  // Hierarchical Filter Options (with data scope filtering)
  const storeOptions = useMemo(() => {
    // Get all stores for selected regions
    const allStores = getStoresByRegions(selectedRegions);

    // Filter stores based on user's data scope
    if (!permissionsLoading && dataScope.stores && dataScope.stores.length > 0) {
      return allStores.filter((store) => dataScope.stores?.includes(store.value));
    }

    return allStores;
  }, [selectedRegions, dataScope.stores, permissionsLoading]);

  const categoryOptions = useMemo(() => {
    // Get all categories for selected stores/regions
    const allCategories = getCategoriesByStores(selectedStores, selectedRegions);

    // Filter categories based on user's data scope
    if (!permissionsLoading && dataScope.categories && dataScope.categories.length > 0) {
      return allCategories.filter((category) =>
        dataScope.categories?.includes(category.value)
      );
    }

    return allCategories;
  }, [selectedStores, selectedRegions, dataScope.categories, permissionsLoading]);

  const productOptions = useMemo(
    () =>
      getProductsByContext(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
  );

  // Cascading Selection Resets
  useEffect(() => {
    // If region changes and current stores are no longer in the new region list, clear them
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

  return (
    <div className='flex flex-col space-y-6 pb-6'>
      <FilterBar
        title='Envanter Planlama'
        titleTooltip='Bölge, mağaza ve ürün bazında filtreleme yaparak envanter verilerini özelleştirin.'
        regionOptions={filteredRegionOptions}
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
        <PlanningAlerts data={inventoryAlerts} />
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
    </div>
  );
}
