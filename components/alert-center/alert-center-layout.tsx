'use client';

import { useMemo, useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { AlertList } from './alert-list';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import type { GrowthProduct, ForecastErrorProduct } from '@/services/types/api';
import type { DataScope } from '@/types/permissions';
import type { UserRole } from '@/types/auth';
import { useFilterOptions } from '@/services/hooks/filters/use-filter-options';

interface ResolvedAlert {
  id: string;
  type: string;
  name: string;
  action: string;
  comment: string;
  date: Date;
  data: GrowthProduct | ForecastErrorProduct;
}

interface AlertCenterLayoutProps {
  dataScope: DataScope;
  canResolveAlerts: boolean;
  userRole: UserRole | null;
}

export function AlertCenterLayout({
  dataScope,
  canResolveAlerts,
  userRole,
}: AlertCenterLayoutProps) {
  const [resolvedAlerts, setResolvedAlerts] = useState<ResolvedAlert[]>([]);

  const handleResolve = (alert: ResolvedAlert) => {
    setResolvedAlerts((prev) => [alert, ...prev]);
  };

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { regionOptions, storeOptions, categoryOptions } = useFilterOptions({
    selectedRegions,
    selectedStores,
    selectedCategories,
  });

  const filteredRegionOptions = useMemo(() => {
    if (dataScope.regions.length > 0) {
      return regionOptions.filter((r) => dataScope.regions.includes(r.value));
    }
    return regionOptions;
  }, [dataScope.regions, regionOptions]);

  // If no store explicitly selected, send all storeIds currently available in the filter list.
  const effectiveStoreIds = useMemo(() => {
    return selectedStores.length > 0
      ? selectedStores
      : storeOptions.map((store) => store.value);
  }, [selectedStores, storeOptions]);

  const handleRegionChange = (regions: string[]) => {
    setSelectedRegions(regions);
    setSelectedStores([]);
    setSelectedCategories([]);
  };

  const handleStoreChange = (stores: string[]) => {
    setSelectedStores(stores);
    setSelectedCategories([]);
  };

  return (
    <div className='flex flex-col h-full space-y-6'>
      <div className='flex flex-col space-y-4'>
        <FilterBar
          title='Uyarı Merkezi'
          selectedRegions={selectedRegions}
          onRegionChange={handleRegionChange}
          regionOptions={filteredRegionOptions}
          selectedStores={selectedStores}
          onStoreChange={handleStoreChange}
          storeOptions={storeOptions}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          categoryOptions={categoryOptions}
        />
      </div>

      <Tabs defaultValue='low-growth' className='flex-1 flex flex-col'>
        <div className='flex items-center justify-between pointer-events-auto'>
          <TabsList className='grid w-full max-w-xl grid-cols-3'>
            <TabsTrigger value='low-growth'>Düşük Büyüme</TabsTrigger>
            <TabsTrigger value='high-growth'>Yüksek Büyüme</TabsTrigger>
            <TabsTrigger value='forecast-error'>Tahmin Hataları</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='low-growth' className='flex-1 mt-4'>
          <AlertList
            type='low-growth'
            filters={{
              selectedRegions,
              selectedStores: effectiveStoreIds,
              selectedCategories,
            }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
            canResolveAlerts={canResolveAlerts}
            dataScope={dataScope}
            userRole={userRole}
          />
        </TabsContent>
        <TabsContent value='high-growth' className='flex-1 mt-4'>
          <AlertList
            type='high-growth'
            filters={{
              selectedRegions,
              selectedStores: effectiveStoreIds,
              selectedCategories,
            }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
            canResolveAlerts={canResolveAlerts}
            dataScope={dataScope}
            userRole={userRole}
          />
        </TabsContent>
        <TabsContent value='forecast-error' className='flex-1 mt-4'>
          <AlertList
            type='forecast-error'
            filters={{
              selectedRegions,
              selectedStores: effectiveStoreIds,
              selectedCategories,
            }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
            canResolveAlerts={canResolveAlerts}
            dataScope={dataScope}
            userRole={userRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

