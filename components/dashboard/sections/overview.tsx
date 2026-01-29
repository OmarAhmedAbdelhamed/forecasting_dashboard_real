'use client';

import { useState, useMemo } from 'react';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { AlertsBar } from '@/components/dashboard/alerts-bar';
import { MetricCard } from '@/components/dashboard/metric-card';
import { RevenueTargetChart } from '@/components/dashboard/charts/revenue-target-chart';
import { HistoricalUnitsChart } from '@/components/dashboard/charts/historical-units-chart';
import { UpcomingPromotions } from '@/components/dashboard/tables/upcoming-promotions';
import { StockRiskTable } from '@/components/dashboard/tables/stock-risk-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CalendarRange,
  Tags,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  REGIONS,
  getStoresByRegions,
  getCategoriesByStores,
} from '@/data/mock-data';

export function OverviewSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Compute filtered options based on parent selections
  const regionOptions = useMemo(
    () => REGIONS.map((r) => ({ value: r.value, label: r.label })),
    [],
  );

  const storeOptions = useMemo(
    () => getStoresByRegions(selectedRegions),
    [selectedRegions],
  );

  const categoryOptions = useMemo(
    () => getCategoriesByStores(selectedStores),
    [selectedStores],
  );

  // Reset child selections when parent changes
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
    <div className='space-y-4'>
      {/* Global Filter */}
      <FilterBar
        title='Genel Bakış'
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

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
        {/* Top Row: KPIs and Alert Center */}
        <div className='lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4'>
          <MetricCard
            title='Genel Model Doğruluğu'
            value='94.2%'
            subtext='Ortalama Başarı'
            icon={Target}
            change='+1.5%'
            changeType='positive'
            delay={0}
          />
          <MetricCard
            title='Gelecek 30 Günlük Tahmin'
            value='2.8M TL'
            secondaryValue='142K Adet'
            icon={TrendingUp}
            change='+8.2%'
            changeType='positive'
            delay={0.1}
          />
          <MetricCard
            title='YTD Başarı Miktarı'
            value='12.5M TL'
            subtext='Yılbaşından Bugüne'
            icon={CalendarRange}
            change='+12%'
            changeType='positive'
            delay={0.2}
          />
          <MetricCard
            title='Forecast Gap to Sales'
            value='-2.3%'
            subtext='Tahmin Sapması'
            icon={AlertTriangle}
            change='-0.5%'
            changeType='negative'
            delay={0.3}
          />
        </div>

        {/* Alert Center */}
        <div className='lg:col-span-4'>
          <Card className='h-full border-red-200 bg-red-50/10'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-red-600 flex items-center gap-2 text-lg'>
                <AlertTriangle className='h-7 w-7' />
                Alert Center
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap justify-center gap-4 h-auto'>
                <div className='bg-card border rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-md transition-shadow cursor-pointer w-40 h-40'>
                  <span className='text-lg font-medium text-muted-foreground mb-1'>
                    Low Growth
                  </span>
                  <span className='text-3xl font-bold text-red-600'>4</span>
                </div>
                <div className='bg-card border rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-md transition-shadow cursor-pointer w-40 h-40'>
                  <span className='text-lg font-medium text-muted-foreground mb-1'>
                    High Growth
                  </span>
                  <span className='text-3xl font-bold text-green-600'>12</span>
                </div>
                <div className='bg-card border rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-md transition-shadow cursor-pointer w-40 h-40'>
                  <span className='text-lg font-medium text-muted-foreground mb-1'>
                    Forecast Hatalar
                  </span>
                  <span className='text-3xl font-bold text-orange-600'>7</span>
                </div>
                <div className='bg-card border rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-md transition-shadow cursor-pointer w-40 h-40'>
                  <span className='text-lg font-medium text-muted-foreground mb-1'>
                    Kritik Stok
                  </span>
                  <span className='text-3xl font-bold text-red-600'>3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Charts */}
        <div className='lg:col-span-6'>
          <RevenueTargetChart />
        </div>
        <div className='lg:col-span-6'>
          <HistoricalUnitsChart />
        </div>

        {/* Bottom Row: Tables */}
        <div className='lg:col-span-12'>
          <UpcomingPromotions />
        </div>
      </div>
    </div>
  );
}
