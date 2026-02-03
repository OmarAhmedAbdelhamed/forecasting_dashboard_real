'use client';

import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { AlertList } from './alert-list';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import {
  REGIONS_FLAT,
  getStoresByRegions,
  getCategoriesByStores,
} from '@/data/mock-data';
import { GrowthProduct, ForecastErrorProduct } from '@/data/mock-alerts';
import { InventoryAlert } from '@/types/inventory';

interface ResolvedAlert {
  id: string;
  type: string;
  name: string;
  action: string;
  comment: string;
  date: Date;
  data: GrowthProduct | ForecastErrorProduct | InventoryAlert;
}

export function AlertCenterLayout() {
  // Resolved alerts state
  const [resolvedAlerts, setResolvedAlerts] = useState<ResolvedAlert[]>([]);

  const handleResolve = (alert: ResolvedAlert) => {
    setResolvedAlerts((prev) => [alert, ...prev]);
  };

  // Filter States
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Derived Options
  const regionOptions = REGIONS_FLAT;
  const storeOptions = getStoresByRegions(selectedRegions);
  const categoryOptions = getCategoriesByStores(selectedStores);

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
        {/* Title is now part of FilterBar as requested */}
        <FilterBar
          title='Alert Center'
          selectedRegions={selectedRegions}
          onRegionChange={handleRegionChange}
          regionOptions={regionOptions}
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
            <TabsTrigger value='low-growth'>Low Growth</TabsTrigger>
            <TabsTrigger value='high-growth'>High Growth</TabsTrigger>
            <TabsTrigger value='forecast-error'>Forecast Hatalar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='low-growth' className='flex-1 mt-4'>
          <AlertList
            type='low-growth'
            filters={{ selectedRegions, selectedStores, selectedCategories }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
          />
        </TabsContent>
        <TabsContent value='high-growth' className='flex-1 mt-4'>
          <AlertList
            type='high-growth'
            filters={{ selectedRegions, selectedStores, selectedCategories }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
          />
        </TabsContent>
        <TabsContent value='forecast-error' className='flex-1 mt-4'>
          <AlertList
            type='forecast-error'
            filters={{ selectedRegions, selectedStores, selectedCategories }}
            resolvedAlerts={resolvedAlerts}
            onResolve={handleResolve}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
