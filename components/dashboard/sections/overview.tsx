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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CalendarRange,
  Tags,
  ArrowUpRight,
  ArrowDownRight,
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
  getStockRisks,
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

  const promotions = useMemo(
    () => getPromotions(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
  );

  const stockRisks = useMemo(
    () => getStockRisks(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories],
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
            value={`${metrics.accuracy.toFixed(1)}%`}
            subtext='Ortalama Başarı'
            icon={Target}
            change={`${metrics.accuracyChange > 0 ? '+' : ''}${metrics.accuracyChange.toFixed(1)}%`}
            changeType={metrics.accuracyChange >= 0 ? 'positive' : 'negative'}
            delay={0}
          />
          <MetricCard
            title='Gelecek 30 Günlük Tahmin'
            value={`${(metrics.forecastValue / 1000000).toFixed(1)}M TL`}
            secondaryValue={`${(metrics.forecastUnit / 1000).toFixed(0)}K Adet`}
            icon={TrendingUp}
            change={`${metrics.forecastChange > 0 ? '+' : ''}${metrics.forecastChange.toFixed(1)}%`}
            changeType={metrics.forecastChange >= 0 ? 'positive' : 'negative'}
            delay={0.1}
          />
          <MetricCard
            title='YTD Başarı Miktarı'
            value={`${(metrics.ytdValue / 1000000).toFixed(1)}M TL`}
            subtext='Yılbaşından Bugüne'
            icon={CalendarRange}
            change={`${metrics.ytdChange > 0 ? '+' : ''}${metrics.ytdChange.toFixed(0)}%`}
            changeType={metrics.ytdChange >= 0 ? 'positive' : 'negative'}
            delay={0.2}
          />
          <MetricCard
            title='Forecast Gap to Sales'
            value={`${metrics.gapToSales.toFixed(1)}%`}
            subtext='Tahmin Sapması'
            icon={AlertTriangle}
            change={`${metrics.gapToSalesChange > 0 ? '+' : ''}${metrics.gapToSalesChange.toFixed(1)}%`}
            changeType={metrics.gapToSalesChange >= 0 ? 'positive' : 'negative'} // Negative gap change might be good or bad depending on context, assuming closer to 0 is better? Or just direction. Let's stick to standard logic.
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
              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
                <div className='bg-card border rounded-lg p-4 2xl:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-square max-w-[180px] mx-auto w-full relative group'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className='absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                        <Info className='h-4 w-4 2xl:h-5 2xl:w-5' />
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
                  <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-1'>
                    Low Growth
                  </span>
                  <span className='text-3xl 2xl:text-4xl font-bold text-red-600'>
                    4
                  </span>
                </div>
                <div className='bg-card border rounded-lg p-4 2xl:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-square max-w-[180px] mx-auto w-full relative group'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className='absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                        <Info className='h-4 w-4 2xl:h-5 2xl:w-5' />
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
                  <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-1'>
                    High Growth
                  </span>
                  <span className='text-3xl 2xl:text-4xl font-bold text-green-600'>
                    12
                  </span>
                </div>
                <div className='bg-card border rounded-lg p-4 2xl:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-square max-w-[180px] mx-auto w-full relative group'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className='absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                        <Info className='h-4 w-4 2xl:h-5 2xl:w-5' />
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
                  <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-1'>
                    Forecast Hatalar
                  </span>
                  <span className='text-3xl 2xl:text-4xl font-bold text-orange-600'>
                    7
                  </span>
                </div>
                <div className='bg-card border rounded-lg p-4 2xl:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-square max-w-[180px] mx-auto w-full relative group'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className='absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'>
                        <Info className='h-4 w-4 2xl:h-5 2xl:w-5' />
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
                  <span className='text-sm 2xl:text-base font-medium text-muted-foreground mb-1'>
                    Kritik Stok
                  </span>
                  <span className='text-3xl 2xl:text-4xl font-bold text-red-600'>
                    3
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Charts */}
        <div className='lg:col-span-6'>
          <RevenueTargetChart data={revenueData} />
        </div>
        <div className='lg:col-span-6'>
          <HistoricalUnitsChart data={historicalData} />
        </div>

        {/* Bottom Row: Tables */}
        <div className='lg:col-span-12'>
          <UpcomingPromotions promotions={promotions} />
        </div>
        {/* <div className='lg:col-span-12'>
          <StockRiskTable risks={stockRisks} />
        </div> */}
      </div>
    </div>
  );
}
