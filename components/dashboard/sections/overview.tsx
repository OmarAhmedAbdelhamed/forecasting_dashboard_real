'use client';

import Link from 'next/link';

import { useState, useMemo, useEffect } from 'react';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { MetricCard } from '@/components/dashboard/metric-card';
import { RevenueTargetChart } from '@/components/dashboard/charts/revenue-target-chart';
import { HistoricalUnitsChart } from '@/components/dashboard/charts/historical-units-chart';
import { UpcomingPromotions } from '@/components/dashboard/tables/upcoming-promotions';
import { Button } from '@/components/ui/shared/button';
import { useDashboardContext } from '@/contexts/dashboard-context';
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
import { useRef } from 'react';
import {
  useHistoricalChart,
  useAlertsSummary,
  useDashboardMetrics,
  useRevenueChart,
  useDashboardPromotions,
} from '@/services';
import { useFilterOptions } from '@/services/hooks/filters/use-filter-options';
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import { PageLoading } from '@/components/ui/shared/page-loading';

const DEFAULT_METRICS = {
  accuracy: 0,
  accuracyChange: 0,
  forecastValue: 0,
  forecastUnit: 0,
  forecastChange: 0,
  ytdValue: 0,
  ytdChange: 0,
  gapToSales: 0,
  gapToSalesChange: 0,
};

export function OverviewSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get visibility config
  const { canSeeKpi, canSeeChart, canSeeTable } = useVisibility('overview');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dataScope } = usePermissions();

  // Get filter options from API
  const { regionOptions, storeOptions, categoryOptions } = useFilterOptions({
    selectedRegions,
    selectedStores,
    selectedCategories,
  });

  const filterParams = useMemo(
    () => ({
      regionIds: selectedRegions,
      storeIds: selectedStores,
      categoryIds: selectedCategories,
    }),
    [selectedRegions, selectedStores, selectedCategories],
  );

  // --- Dynamic Data Calculation ---
  // Metrics from API
  const { data: metricsData, isLoading: metricsLoading } =
    useDashboardMetrics(filterParams);
  const metrics = metricsData || DEFAULT_METRICS;

  // Helper to format large numbers to M (Millions) or K (Thousands)
  const formatMetricValue = (value: number | undefined, suffix: string) => {
    if (value === undefined || value === 0) return `0 ${suffix}`;
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M ${suffix}`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K ${suffix}`;
    }
    return `${value} ${suffix}`;
  };

  // Revenue Chart
  const { data: revenueResponse, isLoading: revenueLoading } =
    useRevenueChart(filterParams);
  const revenueData = revenueResponse?.data || [];
  console.log('OverviewSection: Revenue Chart Data:', revenueData);

  // Historical Chart
  const { data: historicalChartData, isLoading: historicalLoading } =
    useHistoricalChart(filterParams);
  const historicalData = historicalChartData?.data || [];

  const alertsSummaryParams = useMemo(
    () => ({
      regionIds: selectedRegions,
      storeIds:
        selectedStores.length > 0
          ? selectedStores
          : storeOptions.map((store) => store.value),
      categoryIds: selectedCategories,
    }),
    [selectedRegions, selectedStores, selectedCategories, storeOptions],
  );

  // Alerts
  const { data: alertsSummaryData, isLoading: alertsSummaryLoading } =
    useAlertsSummary(alertsSummaryParams);

  useEffect(() => {
    if (alertsSummaryData) {
      console.log(
        'OverviewSection: Alerts Summary API Response:',
        alertsSummaryData,
      );
    }
  }, [alertsSummaryData]);

  // Promotions
  const { data: promotionsResponse, isLoading: promotionsLoading } =
    useDashboardPromotions(filterParams);
  const promotions = promotionsResponse?.promotions || [];

  useEffect(() => {
    if (promotionsResponse) {
      console.log(
        'OverviewSection: Dashboard Promotions API Response:',
        promotionsResponse,
      );
    }
  }, [promotionsResponse]);

  const isInitialLoading =
    metricsLoading ||
    revenueLoading ||
    historicalLoading ||
    alertsSummaryLoading ||
    promotionsLoading;

  const hasInitialData =
    metricsData !== undefined ||
    revenueResponse !== undefined ||
    historicalChartData !== undefined ||
    alertsSummaryData !== undefined ||
    promotionsResponse !== undefined;

  const showLoading = isInitialLoading && !hasInitialData;
/*
    return (
      <PageLoading
        title='Genel Bakış yükleniyor…'
        description='KPI, grafik ve uyarılar getiriliyor.'
      />
    );
  }

*/

  // Sync with Dashboard Context - Optimized to prevent loops
  const { setSection, setFilters, setMetrics } = useDashboardContext();
  const prevMetricsRef = useRef<string>('');
  const prevFiltersRef = useRef<string>('');

  useEffect(() => {
    setSection('Genel Bakış');

    const currentFilters = {
      regions: selectedRegions,
      stores: selectedStores,
      categories: selectedCategories,
    };
    const filtersStr = JSON.stringify(currentFilters);
    if (prevFiltersRef.current !== filtersStr) {
      setFilters(currentFilters);
      prevFiltersRef.current = filtersStr;
    }

    const currentMetrics = {
      'Model Doğruluğu': `${metrics.accuracy.toFixed(1)}%`,
      'Gelecek 30 Günlük Tahmin': formatMetricValue(
        metrics.forecastRevenue,
        'TL',
      ),
      'YTD Başarı Miktarı': formatMetricValue(metrics.ytdRevenue, 'TL'),
      'Tahmin Sapması': `${metrics.gapToSales.toFixed(1)}%`,
    };
    const metricsStr = JSON.stringify(currentMetrics);

    if (prevMetricsRef.current !== metricsStr) {
      setMetrics(currentMetrics);
      prevMetricsRef.current = metricsStr;
    }
  }, [
    selectedRegions,
    selectedStores,
    selectedCategories,
    metrics,
    setSection,
    setFilters,
    setMetrics,
  ]);

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

  return showLoading ? (
    <PageLoading
      title='Genel Bakış yükleniyor…'
      description='KPI, grafik ve uyarılar getiriliyor.'
    />
  ) : (
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
              value={`${(metrics.accuracy || 0).toFixed(1)}%`}
              subtext='Ortalama Başarı'
              icon={Target}
              change={`${(metrics.accuracyChange || 0) > 0 ? '+' : ''}${(metrics.accuracyChange || 0).toFixed(1)}%`}
              changeType={
                (metrics.accuracyChange || 0) >= 0 ? 'positive' : 'negative'
              }
              delay={0}
            />
          )}

          {/* Forecast KPI */}
          {canSeeKpi('overview-30day-forecast') && (
            <MetricCard
              title='Gelecek 30 Günlük Tahmin'
              value={formatMetricValue(metrics.forecastRevenue, 'TL')}
              secondaryValue={formatMetricValue(metrics.forecastValue, 'Adet')}
              icon={TrendingUp}
              change={`${(metrics.forecastChange || 0) > 0 ? '+' : ''}${(metrics.forecastChange || 0).toFixed(1)}%`}
              changeType={
                (metrics.forecastChange || 0) >= 0 ? 'positive' : 'negative'
              }
              delay={0.1}
            />
          )}

          {/* Actual Sales KPI */}
          {canSeeKpi('overview-ytd-value') && (
            <MetricCard
              title='YTD Başarı Miktarı'
              value={formatMetricValue(metrics.ytdRevenue, 'TL')}
              subtext='Yılbaşından Bugüne'
              secondaryValue={formatMetricValue(metrics.ytdValue, 'Adet')}
              icon={CalendarRange}
              change={`${(metrics.ytdChange || 0) > 0 ? '+' : ''}${(metrics.ytdChange || 0).toFixed(0)}%`}
              changeType={
                (metrics.ytdChange || 0) >= 0 ? 'positive' : 'negative'
              }
              delay={0.2}
            />
          )}

          {/* Forecast Gap KPI */}
          {canSeeKpi('overview-forecast-gap') && (
            <MetricCard
              title='Satışa Göre Tahmin Sapması'
              value={`${(metrics.gapToSales || 0).toFixed(1)}%`}
              subtext='Tahmin Sapması'
              icon={AlertTriangle}
              change={`${(metrics.gapToSalesChange || 0) > 0 ? '+' : ''}${(metrics.gapToSalesChange || 0).toFixed(1)}%`}
              changeType={
                (metrics.gapToSalesChange || 0) >= 0 ? 'positive' : 'negative'
              }
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
                <span className='font-semibold'>Uyarı Merkezi</span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='text-xs h-8 hover:bg-red-100 hover:text-red-700 text-red-600'
                asChild
              >
                <Link href='/alert-center'>Daha Fazla</Link>
              </Button>
            </div>
            <div className='p-2 flex-1'>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xlg:grid-cols-4 gap-2 h-full'>
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
                    Düşük Büyüme
                  </span>
                  <span className='text-2xl 2xl:text-3xl font-bold text-red-600'>
                    {alertsSummaryData?.summary?.lowGrowth?.count ?? 0}
                  </span>
                </div>
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
                    Yüksek Büyüme
                  </span>
                  <span className='text-2xl 2xl:text-3xl font-bold text-green-600'>
                    {alertsSummaryData?.summary?.highGrowth?.count ?? 0}
                  </span>
                </div>
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
                    Tahmin Hataları
                  </span>
                  <span className='text-2xl 2xl:text-3xl font-bold text-orange-600'>
                    {alertsSummaryData?.summary?.forecastErrors?.count ?? 0}
                  </span>
                </div>
                <Link
                  href='/dashboard?section=inventory_planning'
                  className='bg-card border rounded-lg p-1.5 2xl:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer mx-auto w-full relative group'
                >
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
                    Stok uyarıları
                  </span>
                  <span className='text-2xl 2xl:text-3xl font-bold text-red-600'>
                    {alertsSummaryData?.summary?.inventory?.count ?? 0}
                  </span>
                </Link>
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
            <HistoricalUnitsChart
              data={historicalData}
              currentWeek={historicalChartData?.currentWeek}
            />
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
