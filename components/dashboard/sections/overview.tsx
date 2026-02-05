'use client';

import Link from 'next/link';

import { useState, useMemo } from 'react';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { MetricCard } from '@/components/dashboard/metric-card';
import { RevenueTargetChart } from '@/components/dashboard/charts/revenue-target-chart';
import { HistoricalUnitsChart } from '@/components/dashboard/charts/historical-units-chart';
import { UpcomingPromotions } from '@/components/dashboard/tables/upcoming-promotions';
import { Button } from '@/components/ui/shared/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CalendarRange,
  Info,
} from 'lucide-react';
import {
  REGIONS,
  getStoresByRegions,
  getCategoriesByStores,
  getMetrics,
  getRevenueChartData,
  getHistoricalChartData,
  getPromotions,
} from '@/data/mock-data';
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import type { UserRole } from '@/types/auth';

export function OverviewSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get visibility config
  const { canSeeKpi, canSeeChart, canSeeTable, canSeeAlert, canSeeFilter } = useVisibility('overview');
  const { dataScope } = usePermissions();

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

  // --- Dynamic Data Calculation ---
  const metrics = useMemo(
    () => getMetrics(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
  );

  const revenueData = useMemo(
    () =>
      getRevenueChartData(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
  );

  const historicalData = useMemo(
    () =>
      getHistoricalChartData(
        selectedRegions,
        selectedStores,
        selectedCategories,
      ),
    [selectedRegions, selectedStores, selectedCategories],
  );

  const promotions = useMemo(() => getPromotions(), []);

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
        <div className='lg:col-span-8 grid grid-cols-1 md:grid-cols-4 gap-4'>
          {/* Model Accuracy KPI */}
          {canSeeKpi('overview-model-accuracy') && (
            <MetricCard
              title='Genel Model Doğruluğu'
              value={`${metrics.accuracy.toFixed(1)}%`}
              subtext='Ortalama Başarı'
              icon={Target}
              change={`${metrics.accuracyChange > 0 ? '+' : ''}${metrics.accuracyChange.toFixed(1)}%`}
              changeType={metrics.accuracyChange >= 0 ? 'positive' : 'negative'}
              delay={0}
            />
          )}

          {/* 30-Day Forecast KPI */}
          {canSeeKpi('overview-30day-forecast') && (
            <MetricCard
              title='Gelecek 30 Günlük Tahmin'
              value={`${(metrics.forecastValue / 1000000).toFixed(1)}M TL`}
              secondaryValue={`${(metrics.forecastUnit / 1000).toFixed(0)}K Adet`}
              icon={TrendingUp}
              change={`${metrics.forecastChange > 0 ? '+' : ''}${metrics.forecastChange.toFixed(1)}%`}
              changeType={metrics.forecastChange >= 0 ? 'positive' : 'negative'}
              delay={0.1}
            />
          )}

          {/* YTD Value KPI */}
          {canSeeKpi('overview-ytd-value') && (
            <MetricCard
              title='YTD Başarı Miktarı'
              value={`${(metrics.ytdValue / 1000000).toFixed(1)}M TL`}
              subtext='Yılbaşından Bugüne'
              icon={CalendarRange}
              change={`${metrics.ytdChange > 0 ? '+' : ''}${metrics.ytdChange.toFixed(0)}%`}
              changeType={metrics.ytdChange >= 0 ? 'positive' : 'negative'}
              delay={0.2}
            />
          )}

          {/* Forecast Gap KPI */}
          {canSeeKpi('overview-forecast-gap') && (
            <MetricCard
              title='Forecast Gap to Sales'
              value={`${metrics.gapToSales.toFixed(1)}%`}
              subtext='Tahmin Sapması'
              icon={AlertTriangle}
              change={`${metrics.gapToSalesChange > 0 ? '+' : ''}${metrics.gapToSalesChange.toFixed(1)}%`}
              changeType={metrics.gapToSalesChange >= 0 ? 'positive' : 'negative'}
              delay={0.3}
            />
          )}
        </div>

        {/* Alert Center */}
        <div className='lg:col-span-4'>
          <div className='border border-red-200 bg-red-50/10 rounded-lg overflow-hidden flex flex-col h-full'>
            <div className='pb-2 pt-3 px-4 flex items-center justify-between'>
              <div className='flex items-center gap-2 text-red-600'>
                <AlertTriangle className='h-5 w-5' />
                <span className='font-semibold'>Alert Center</span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='text-xs h-8 hover:bg-red-100 hover:text-red-700 text-red-600'
                asChild
              >
                <Link href='/alert-center'>See More</Link>
              </Button>
            </div>
            <div className='p-2 flex-1'>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xlg:grid-cols-4 gap-2 h-full'>
                {/* Low Growth Alert */}
                {canSeeAlert('alert-low-growth') && (
                  <div className='bg-card border rounded-lg p-1.5 2xl:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer mx-auto w-full relative group'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className='absolute top-1 right-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Info className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        className='max-w-[200px] 2xl:max-w-[250px] text-xs 2xl:text-sm'
                      >
                        Düşük büyüme gösteren ürün kategorileri. Pazarlama
                        stratejisi gözden geçirilmeli.
                      </TooltipContent>
                    </Tooltip>
                    <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-0.5'>
                      Low Growth
                    </span>
                    <span className='text-2xl 2xl:text-3xl font-bold text-red-600'>
                      4
                    </span>
                  </div>
                )}

                {/* High Growth Alert */}
                {canSeeAlert('alert-high-growth') && (
                  <div className='bg-card border rounded-lg p-1.5 2xl:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer mx-auto w-full relative group'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className='absolute top-1 right-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Info className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        className='max-w-[200px] 2xl:max-w-[250px] text-xs 2xl:text-sm'
                      >
                        Yüksek büyüme gösteren ürün kategorileri. Stok ve tedarik
                        planlaması öncelikli.
                      </TooltipContent>
                    </Tooltip>
                    <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-0.5'>
                      High Growth
                    </span>
                    <span className='text-2xl 2xl:text-3xl font-bold text-green-600'>
                      12
                    </span>
                  </div>
                )}

                {/* Forecast Errors Alert */}
                {canSeeAlert('alert-forecast-errors') && (
                  <div className='bg-card border rounded-lg p-1.5 2xl:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer mx-auto w-full relative group'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className='absolute top-1 right-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Info className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        className='max-w-[200px] 2xl:max-w-[250px] text-xs 2xl:text-sm'
                      >
                        Tahmin doğruluğu düşük olan ürünler. Model iyileştirmesi
                        gerekebilir.
                      </TooltipContent>
                    </Tooltip>
                    <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-0.5'>
                      Forecast Hatalar
                    </span>
                    <span className='text-2xl 2xl:text-3xl font-bold text-orange-600'>
                      7
                    </span>
                  </div>
                )}

                {/* Critical Stock Alert */}
                {canSeeAlert('alert-critical-stock') && (
                  <div className='bg-card border rounded-lg p-1.5 2xl:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer mx-auto w-full relative group'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className='absolute top-1 right-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Info className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        className='max-w-[200px] 2xl:max-w-[250px] text-xs 2xl:text-sm'
                      >
                        Kritik stok seviyesinde olan ürünler. Acil tedarik
                        aksiyonu gerekli.
                      </TooltipContent>
                    </Tooltip>
                    <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-0.5'>
                      Kritik Stok
                    </span>
                    <span className='text-2xl 2xl:text-3xl font-bold text-red-600'>
                      3
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Charts */}
        {/* Revenue Target Chart */}
        {canSeeChart('overview-revenue-target-chart') && (
          <div className='lg:col-span-6'>
            <RevenueTargetChart data={revenueData} />
          </div>
        )}

        {/* Historical Units Chart */}
        {canSeeChart('overview-historical-units-chart') && (
          <div className='lg:col-span-6'>
            <HistoricalUnitsChart data={historicalData} />
          </div>
        )}

        {/* Bottom Row: Tables */}
        {/* Upcoming Promotions Table */}
        {canSeeTable('overview-upcoming-promotions') && (
          <div className='lg:col-span-12'>
            <UpcomingPromotions promotions={promotions} />
          </div>
        )}
      </div>
    </div>
  );
}
