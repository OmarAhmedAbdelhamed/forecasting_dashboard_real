'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Button } from '@/components/ui/shared/button';
import { ExportForecastModal } from '@/components/dashboard/modals/export-forecast-modal';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  AlertTriangle,
  Search,
  Info,
  HardDriveDownload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import { useFilterOptions } from '@/services/hooks/filters/use-filter-options';
import { demandApi } from '@/services/api/demand';
import type {
  DemandKPIs,
  DemandTrendData,
  YearComparisonData,
  MonthlyBiasData,
  GrowthProduct,
  ForecastErrorProduct,
} from '@/services/types/api';
import { toast } from 'sonner';
import { PageLoading } from '@/components/ui/shared/page-loading';

// Responsive chart config for different screen sizes
const getChartConfig = (is2xl: boolean) => ({
  axisFontSize: is2xl ? 14 : 11,
  tooltipFontSize: is2xl ? '13px' : '11px',
  legendFontSize: is2xl ? '12px' : '10px',
  dotRadius: is2xl ? 4 : 2,
  activeDotRadius: is2xl ? 6 : 4,
  strokeWidth: is2xl ? 3 : 2,
  yAxisWidth: is2xl ? 50 : 40,
});

// ============ MAIN COMPONENT ============

export function DemandForecastingSection() {
  // Permissions hook
  const { dataScope, isLoading: permissionsLoading } = usePermissions();

  // Visibility hook
  const { canSeeKpi, canSeeChart, canSeeTable, canSeeFilter, canSeeAction } =
    useVisibility('demandForecasting');

  // Filter states
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedReyonlar, setSelectedReyonlar] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Table search/filter states
  const [growthSearch, setGrowthSearch] = useState('');
  const [growthFilter, setGrowthFilter] = useState('all');
  const [errorSearch, setErrorSearch] = useState('');
  const [errorFilter, setErrorFilter] = useState('all');

  // Screen size detection for responsive charts
  const [is2xl, setIs2xl] = useState(false);
  const [screenWidth, setScreenWidth] = useState<number>(1920);

  // Get filter options from API
  const {
    regionOptions,
    storeOptions,
    categoryOptions,
    productOptions,
    isLoading: isFilterLoading,
  } = useFilterOptions({
    selectedStores,
    selectedCategories: selectedReyonlar,
  });

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Data states
  const [kpis, setKpis] = useState<DemandKPIs>({
    totalForecast: { value: 0, units: 0, trend: 0 },
    accuracy: { value: 0, trend: 0 },
    yoyGrowth: { value: 0, trend: 0 },
    bias: { value: 0, type: 'over', trend: 'Stabil' },
    lowGrowthCount: 0,
    highGrowthCount: 0,
  });
  const [trendDataState, setTrendDataState] = useState<DemandTrendData[]>([]);
  const [biasDataState, setBiasDataState] = useState<MonthlyBiasData[]>([]);
  const [yearDataState, setYearDataState] = useState<YearComparisonData[]>([]);
  const [yearCurrentWeek, setYearCurrentWeek] = useState<number | null>(null);
  const [growthProductsState, setGrowthProductsState] = useState<
    GrowthProduct[]
  >([]);
  const [errorProductsState, setErrorProductsState] = useState<
    ForecastErrorProduct[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasAnyData =
    trendDataState.length > 0 ||
    biasDataState.length > 0 ||
    yearDataState.length > 0 ||
    growthProductsState.length > 0 ||
    errorProductsState.length > 0;

  useEffect(() => {
    const checkScreenSize = () => {
      setIs2xl(window.innerWidth >= 1536);
      setScreenWidth(window.innerWidth);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const showLoading =
    (permissionsLoading || isFilterLoading || isLoading) && !hasAnyData;
/*
    return (
      <PageLoading
        title='Talep Tahminleme yükleniyor…'
        description='KPI, tablolar ve grafikler getiriliyor.'
      />
    );
  }

*/
  const chartConfig = getChartConfig(is2xl);

  const xAxisInterval = useMemo(() => {
    if (screenWidth >= 2100) return 0; // show every week
    if (screenWidth >= 1280) return 1; // skip 1 week
    return 3; // skip 3 weeks
  }, [screenWidth]);

  const monthNames = useMemo(
    () => [
      'ocak',
      'subat',
      'mart',
      'nisan',
      'mayis',
      'haziran',
      'temmuz',
      'agustos',
      'eylul',
      'ekim',
      'kasim',
      'aralik',
    ],
    [],
  );

  const getWeekNumber = (weekLabel: string) => {
    const match = weekLabel.match(/\d+/);
    return match ? Number(match[0]) : NaN;
  };

  const getWeekEndDate = (weekNumber: number, year: number) => {
    // ISO week 1 starts on the week containing Jan 4. We display the week-end (Sunday).
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
    const firstIsoMonday = new Date(jan4);
    firstIsoMonday.setDate(jan4.getDate() - jan4Day + 1);

    const weekEnd = new Date(firstIsoMonday);
    weekEnd.setDate(firstIsoMonday.getDate() + (weekNumber - 1) * 7 + 6);
    return weekEnd;
  };

  const formatWeekTick = (weekLabel: string) => {
    const weekNumber = getWeekNumber(weekLabel);
    if (!weekNumber || Number.isNaN(weekNumber)) return weekLabel;

    const year = new Date().getFullYear();
    const weekEndDate = getWeekEndDate(weekNumber, year);
    const day = weekEndDate.getDate();
    const month = monthNames[weekEndDate.getMonth()];
    return `H${weekNumber} (${day} ${month})`;
  };

  const formatYAxisTick = (value: number) => {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toLocaleString('tr-TR');
  };

  const formatTrendAxisTick = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return Math.round(value).toLocaleString('tr-TR');
  };

  const periodDays = useMemo(() => {
    const parsed = Number(selectedPeriod);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }, [selectedPeriod]);

  // Determine granularity based on selected period length
  const granularity = useMemo<'daily' | 'weekly' | 'monthly'>(() => {
    if (periodDays >= 365) {
      return 'monthly';
    }
    if (periodDays >= 180) {
      return 'weekly';
    }
    return 'daily';
  }, [periodDays]);

  // Fetch data on filter change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const errorMessages: string[] = [];

      const getErrorMessage = (error: unknown) => {
        if (error instanceof Error) return error.message;
        return 'Bilinmeyen bir hata oluştu.';
      };

      try {
        // Tables are defined as "month over month" style insights; keep them stable at 30 days
        // even when the main period selector is 180/365+.
        const tableWindowDays = 30;

        const filterParams = {
          storeIds: selectedStores.length > 0 ? selectedStores : undefined,
          productIds: selectedProducts.length > 0 ? selectedProducts : undefined,
          categoryIds:
            selectedReyonlar.length > 0 ? selectedReyonlar : undefined,
          periodValue: periodDays,
          periodUnit: 'gun' as const,
        };

        // Fetch KPIs
        try {
          const kpiRes = await demandApi.getKPIs(filterParams);
          if (kpiRes) {
            setKpis(kpiRes);
            console.log(
              'DemandForecastingSection: KPIs API Response:',
              kpiRes,
              'filters:',
              filterParams,
            );
          }
        } catch (error) {
          errorMessages.push(`KPI: ${getErrorMessage(error)}`);
        }

        // Fetch tables (parallel for better performance)
        const [growthRes, errorRes] = await Promise.allSettled([
          demandApi.getGrowthProducts({
            storeIds: filterParams.storeIds,
            categoryIds: filterParams.categoryIds,
            productIds: filterParams.productIds,
            days: tableWindowDays,
            type: growthFilter as 'all' | 'high' | 'low',
          }),
          demandApi.getForecastErrors({
            storeIds: filterParams.storeIds,
            categoryIds: filterParams.categoryIds,
            productIds: filterParams.productIds,
            severityFilter: errorFilter,
            days: tableWindowDays,
          }),
        ]);

        if (growthRes.status === 'fulfilled' && growthRes.value?.products) {
          setGrowthProductsState(growthRes.value.products);
        } else if (growthRes.status === 'rejected') {
          errorMessages.push(`Büyüme Tablosu: ${getErrorMessage(growthRes.reason)}`);
        }
        if (errorRes.status === 'fulfilled' && errorRes.value?.products) {
          setErrorProductsState(errorRes.value.products);
        } else if (errorRes.status === 'rejected') {
          errorMessages.push(`Hata Tablosu: ${getErrorMessage(errorRes.reason)}`);
        }

        // Aggregate charts - fetch always with current filters
        const detailParams = {
          storeIds: filterParams.storeIds,
          productIds: filterParams.productIds,
          categoryIds: filterParams.categoryIds,
        };

        const [trendRes, biasRes, yearRes] = await Promise.allSettled([
          demandApi.getTrendForecast({
            ...detailParams,
            period: granularity,
            daysPast: periodDays,
            daysFuture: periodDays,
          }),
          demandApi.getMonthlyBias(detailParams),
          demandApi.getYearComparison(detailParams),
        ]);

        if (trendRes.status === 'fulfilled' && trendRes.value?.data) {
          setTrendDataState(trendRes.value.data);
        } else if (trendRes.status === 'rejected') {
          errorMessages.push(`Trend Grafiği: ${getErrorMessage(trendRes.reason)}`);
        }
        if (biasRes.status === 'fulfilled' && biasRes.value?.data) {
          setBiasDataState(biasRes.value.data);
        } else if (biasRes.status === 'rejected') {
          errorMessages.push(`Bias Grafiği: ${getErrorMessage(biasRes.reason)}`);
        }
        if (yearRes.status === 'fulfilled' && yearRes.value?.data) {
          setYearDataState(yearRes.value.data);
          setYearCurrentWeek(
            typeof yearRes.value.currentWeek === 'number'
              ? yearRes.value.currentWeek
              : null,
          );
        } else if (yearRes.status === 'rejected') {
          errorMessages.push(`Yıllık Karşılaştırma: ${getErrorMessage(yearRes.reason)}`);
        }

        if (errorMessages.length > 0) {
          console.warn('Demand Forecasting partial fetch errors:', errorMessages);
          toast.error('Bazı veriler yüklenemedi. Lütfen tekrar deneyin.');
        }
      } catch (error) {
        console.error('Demand Forecasting fetch error:', error);
        toast.error('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [
    selectedStores,
    selectedProducts,
    selectedReyonlar,
    periodDays,
    granularity,
    growthFilter,
    errorFilter,
  ]);

  // Reactive data based on filters
  const trendData = useMemo(() => {
    // Map API data keys to chart keys
    const mapped = trendDataState.map((d) => ({
      date: d.date,
      history: d.actual,
      forecast: d.forecast,
      trendline: d.trendline,
    }));

    // Bridge the boundary so past/future look continuous in the chart.
    const firstForecastIdx = mapped.findIndex(
      (point) => typeof point.forecast === 'number',
    );
    if (firstForecastIdx > 0) {
      const prevIdx = firstForecastIdx - 1;
      const lastHistoryVal = mapped[prevIdx].history;
      const firstForecastVal = mapped[firstForecastIdx].forecast;

      if (
        typeof lastHistoryVal === 'number' &&
        (mapped[prevIdx].forecast === null || mapped[prevIdx].forecast === undefined)
      ) {
        mapped[prevIdx].forecast = lastHistoryVal;
      }
      if (
        typeof firstForecastVal === 'number' &&
        (mapped[firstForecastIdx].history === null ||
          mapped[firstForecastIdx].history === undefined)
      ) {
        mapped[firstForecastIdx].history = firstForecastVal;
      }
    }

    return mapped;
  }, [trendDataState]);

  const biasData = useMemo(() => biasDataState, [biasDataState]);

  const yearData = useMemo(() => {
    return yearDataState.map((d) => ({
      ...d,
      week: d.month, // The API uses "month" key but it's actually week label in backend
    }));
  }, [yearDataState]);

  const kpiValues = useMemo(() => {
    return {
      totalForecast: `${(kpis.totalForecast.value / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}TL`,
      totalUnits: `${(kpis.totalForecast.units / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} Ünite`,
      accuracy: `${kpis.accuracy.value}%`,
      yoyGrowth: `${kpis.yoyGrowth.value > 0 ? '+' : ''}${
        kpis.yoyGrowth.value
      }%`,
      bias: `${kpis.bias.value}%`,
      lowGrowth: kpis.lowGrowthCount,
      highGrowth: kpis.highGrowthCount,
    };
  }, [kpis]);

  const formatSignedPercent = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    const str = Number.isInteger(rounded)
      ? rounded.toFixed(0)
      : rounded.toFixed(1);
    return `${rounded > 0 ? '+' : ''}${str}%`;
  };

  const totalForecastTrend =
    typeof kpis.totalForecast.trend === 'number' ? kpis.totalForecast.trend : 0;
  const accuracyTrend =
    typeof kpis.accuracy.trend === 'number' ? kpis.accuracy.trend : 0;

  // Filtered table data
  const filteredGrowthProducts = useMemo(() => {
    return growthProductsState.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(growthSearch.toLowerCase()) ||
        product.id.toLowerCase().includes(growthSearch.toLowerCase());
      return matchesSearch;
    });
  }, [growthSearch, growthProductsState]);

  const filteredErrorProducts = useMemo(() => {
    return errorProductsState.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(errorSearch.toLowerCase()) ||
        product.id.toLowerCase().includes(errorSearch.toLowerCase());
      return matchesSearch;
    });
  }, [errorSearch, errorProductsState]);

  return showLoading ? (
    <PageLoading
      title='Talep Tahminleme yükleniyor…'
      description='KPI, tablolar ve grafikler getiriliyor.'
    />
  ) : (
    <div className='space-y-4 2xl:space-y-6'>
      {/* Universal Filter Bar */}
      <FilterBar
        title='Talep Tahminleme'
        leftContent={
          canSeeAction('action-export') && (
            <Button
              variant='outline'
              size='icon'
              onClick={() => {
                setIsExportModalOpen(true);
              }}
              className='h-10 w-10 2xl:h-12 2xl:w-12 border-[#FFB840] bg-[#FFB840]/10 text-[#0D1E3A] hover:bg-[#FFB840] hover:text-[#0D1E3A] transition-all duration-200'
              title='Excel Olarak Dışa Aktar'
            >
              <HardDriveDownload className='h-7 w-7 2xl:h-8 2xl:w-8' />
            </Button>
          )
        }
        storeOptions={storeOptions}
        selectedStores={selectedStores}
        onStoreChange={(val) => {
          setSelectedStores(val);
          setSelectedReyonlar([]);
          setSelectedProducts([]);
        }}
        categoryOptions={categoryOptions}
        selectedCategories={selectedReyonlar}
        onCategoryChange={(val) => {
          setSelectedReyonlar(val);
          setSelectedProducts([]);
        }}
        productOptions={productOptions}
        selectedProducts={selectedProducts}
        onProductChange={setSelectedProducts}
      >
        {/* Period Selector */}
        {canSeeFilter('filter-period') && (
          <div className='w-full md:w-auto min-w-32'>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className='h-8 2xl:h-10 text-xs 2xl:text-sm bg-white dark:bg-slate-900'>
                <SelectValue placeholder='Periyot' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='30'>30 Gün</SelectItem>
                <SelectItem value='60'>60 Gün</SelectItem>
                <SelectItem value='180'>180 Gün</SelectItem>
                <SelectItem value='365'>1 Yıl</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </FilterBar>

      {/* Export Modal */}
      <ExportForecastModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />

      {/* KPI Cards */}
      <div
        className={cn(
          'grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4',
          isLoading && 'opacity-60 pointer-events-none transition-opacity',
        )}
      >
        <div className='lg:col-span-4 grid grid-cols-2 gap-2 2xl:gap-3'>
          {canSeeKpi('demand-total-forecast') && (
            <KPICard
              title='Toplam Tahmin'
              value={kpiValues.totalForecast}
              subValue={kpiValues.totalUnits}
              trend={
                totalForecastTrend !== 0
                  ? formatSignedPercent(totalForecastTrend)
                  : ''
              }
              trendUp={totalForecastTrend >= 0}
              icon={TrendingUp}
              tooltip='Seçilen dönem için AI modelinin öngördüğü toplam satış tutarı ve adet.'
            />
          )}

          {canSeeKpi('demand-accuracy') && (
            <KPICard
              title='Doğruluk Oranı'
              value={kpiValues.accuracy}
              subValue='Geçen Ay'
              trend={accuracyTrend !== 0 ? formatSignedPercent(accuracyTrend) : ''}
              trendUp={accuracyTrend >= 0}
              icon={Target}
              tooltip='Model doğruluğu. Tahmin ile gerçekleşen arasındaki tutarlılık.'
            />
          )}

          {canSeeKpi('demand-yoy-growth') && (
            <KPICard
              title='Yıllık Büyüme'
              value={kpiValues.yoyGrowth}
              subValue='vs. Geçen Yıl'
              trend=''
              trendUp={kpis.yoyGrowth.value >= 0}
              icon={Calendar}
              tooltip='Geçen yılın aynı dönemine kıyasla satışlardaki büyüme oranı (YoY).'
            />
          )}

          {canSeeKpi('demand-bias') && (
            <KPICard
              title='Bias (Sapma)'
              value={kpiValues.bias}
              subValue={
                kpis.bias.type === 'over' ? 'Over-forecast' : 'Under-forecast'
              }
              trend={kpis.bias.trend === 'stable' ? 'Stabil' : kpis.bias.trend}
              trendUp={true}
              icon={AlertTriangle}
              tooltip='Pozitif: Tahmin > Gerçek (Over). Negatif: Tahmin < Gerçek (Under).'
            />
          )}

          {canSeeKpi('demand-low-growth') && (
            <KPICard
              title='Düşük Büyüme'
              value={String(kpiValues.lowGrowth)}
              subValue='Ürün'
              trend=''
              trendUp={false}
              icon={TrendingDown}
              accentColor='red'
              tooltip='Düşük büyüme gösteren ürün sayısı. Pazarlama stratejisi gözden geçirilmeli.'
            />
          )}

          {canSeeKpi('demand-high-growth') && (
            <KPICard
              title='Yüksek Büyüme'
              value={String(kpiValues.highGrowth)}
              subValue='Ürün'
              trend=''
              trendUp={true}
              icon={TrendingUp}
              accentColor='green'
              tooltip='Yüksek büyüme gösteren ürün sayısı. Stok ve tedarik planlaması öncelikli.'
            />
          )}
        </div>

        {/* Trend Forecast Chart */}
        {canSeeChart('demand-trend-forecast-chart') && (
          <div className='lg:col-span-8'>
            <Card className='h-full'>
              <CardHeader className='pb-2 2xl:pb-3'>
                <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl'>
                  Talep Tahmin ve Trend
                </CardTitle>
                <CardDescription className='text-xs md:text-xs 2xl:text-sm'>
                  Geçmiş satışlar, AI tahmini ve trend çizgisi
                </CardDescription>
              </CardHeader>
              <CardContent className='h-[250px] 2xl:h-[350px]'>
                <ResponsiveContainer
                  width='100%'
                  height={is2xl ? 400 : 260}
                  key={granularity}
                >
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={false}
                      stroke='#f3f4f6'
                    />
                    <XAxis
                      dataKey='date'
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(str: string) => {
                        const date = new Date(str);
                        return date.toLocaleDateString('tr-TR', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                      interval={
                        granularity === 'daily'
                          ? 'preserveStartEnd'
                          : granularity === 'monthly'
                            ? 0
                            : is2xl
                              ? 10
                              : 15
                      }
                      minTickGap={40}
                      angle={granularity === 'monthly' ? -45 : 0}
                      textAnchor={granularity === 'monthly' ? 'end' : 'middle'}
                      height={granularity === 'monthly' ? 60 : 30}
                    />
                    <YAxis
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatTrendAxisTick}
                      width={chartConfig.yAxisWidth}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: chartConfig.tooltipFontSize,
                      }}
                      formatter={(value: number, name: string) => [
                        value?.toLocaleString() || '—',
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: chartConfig.legendFontSize,
                        paddingTop: '10px',
                      }}
                    />
                    <Area
                      type='monotone'
                      dataKey='history'
                      fill='#64748b'
                      fillOpacity={0.6}
                      stroke='#475569'
                      strokeWidth={is2xl ? 2 : 1}
                      name='Geçmiş'
                      connectNulls
                    />
                    <Area
                      type='monotone'
                      dataKey='forecast'
                      fill='#93c5fd'
                      fillOpacity={0.6}
                      stroke='#3b82f6'
                      strokeWidth={chartConfig.strokeWidth}
                      name='Tahmin'
                      connectNulls
                    />
                    <Line
                      type='monotone'
                      dataKey='trendline'
                      stroke='#1f2937'
                      strokeWidth={chartConfig.strokeWidth}
                      dot={false}
                      name='Trend'
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Second Row: Yearly Comparison + Risk Chart */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4'>
        {/* Year Comparison Chart */}
        {canSeeChart('demand-year-comparison-chart') && (
          <div className='lg:col-span-6'>
            <Card className='h-full'>
              <CardHeader className='pb-2 2xl:pb-3'>
                <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl'>
                  Yıllık Karşılaştırma
                </CardTitle>
                <CardDescription className='text-xs md:text-xs 2xl:text-sm'>
                  Mevcut yıl ile geçmiş 2 yıl satış karşılaştırması (Haftalık) -
                  {` H${yearCurrentWeek ?? '-'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className='h-[250px] 2xl:h-[350px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart
                    data={yearData}
                    margin={{ top: 0, right: 10, left: 0, bottom: 20}}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={false}
                      stroke='#e5e7eb'
                    />
                    <XAxis
                      dataKey='week'
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                      interval={xAxisInterval}
                      tickFormatter={formatWeekTick}
                      angle={-45}
                      textAnchor='end'
                      height={60}
                    />
                    <YAxis
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatYAxisTick}
                      width={Math.max(60, chartConfig.yAxisWidth)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (typeof value !== 'number') {
                          return ['—', ''];
                        }
                        const year =
                          name === 'y2024'
                            ? '2024'
                            : name === 'y2025'
                              ? '2025'
                              : '2026';
                        return [value.toLocaleString('tr-TR'), year];
                      }}
                      labelFormatter={(label) => formatWeekTick(String(label))}
                      contentStyle={{ fontSize: chartConfig.tooltipFontSize, marginBottom: '50px' }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'y2024'
                          ? '2024'
                          : value === 'y2025'
                            ? '2025'
                            : '2026'
                      }
                      wrapperStyle={{
                        fontSize: chartConfig.legendFontSize,
                        paddingTop: '10px', marginBottom: '-50px'
                      }}
                    />
                    <Line
                      type='monotone'
                      dataKey='y2024'
                      stroke='#9ca3af'
                      strokeWidth={chartConfig.strokeWidth}
                      dot={{ r: chartConfig.dotRadius }}
                      activeDot={{ r: chartConfig.activeDotRadius }}
                      name='y2024'
                      connectNulls
                    />
                    <Line
                      type='monotone'
                      dataKey='y2025'
                      stroke='#374151'
                      strokeWidth={chartConfig.strokeWidth}
                      dot={{ r: chartConfig.dotRadius }}
                      activeDot={{ r: chartConfig.activeDotRadius }}
                      name='y2025'
                      connectNulls
                    />
                    <Line
                      type='monotone'
                      dataKey='y2026'
                      stroke='#3b82f6'
                      strokeWidth={is2xl ? 4 : 2.5}
                      dot={{ r: is2xl ? 5 : 3 }}
                      activeDot={{ r: is2xl ? 7 : 5 }}
                      name='y2026'
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bias Risk Chart */}
        {canSeeChart('demand-bias-risk-chart') && (
          <div className='lg:col-span-6'>
            <Card className='h-full'>
              <CardHeader className='pb-2 2xl:pb-3'>
                <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl flex items-center gap-2'>
                  Aylık Tahmin Sapma Riski
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className='h-3.5 w-3.5 2xl:h-4 2xl:w-4 text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent className='max-w-[320px] text-xs 2xl:text-sm p-3 2xl:p-3'>
                      <p className='font-semibold mb-1'>Risk Bölgeleri:</p>
                      <p>
                        <span className='text-green-600 font-medium'>
                          Yeşil (±5%):
                        </span>{' '}
                        Güvenli - Aksiyon gerekmez
                      </p>
                      <p>
                        <span className='text-orange-500 font-medium'>
                          Turuncu (&gt;+5%):
                        </span>{' '}
                        Stok tükenme riski
                      </p>
                      <p>
                        <span className='text-blue-500 font-medium'>
                          Mavi (&lt;-5%):
                        </span>{' '}
                        Fazla stok riski
                      </p>
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className='h-75 2xl:h-112.5'>
                <ResponsiveContainer width='100%' height='100%'>
                  <ComposedChart
                    data={biasData}
                    margin={{ top: 20, right: 15, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={false}
                      stroke='#e5e7eb'
                    />
                    <XAxis
                      dataKey='month'
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[-30, 40]}
                      fontSize={chartConfig.axisFontSize}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      width={chartConfig.yAxisWidth}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Sapma']}
                      contentStyle={{ fontSize: chartConfig.tooltipFontSize }}
                    />

                    <ReferenceArea
                      y1={-30}
                      y2={-5}
                      fill='#3b82f6'
                      fillOpacity={0.15}
                    />
                    <ReferenceArea
                      y1={-5}
                      y2={5}
                      fill='#22c55e'
                      fillOpacity={0.2}
                    />
                    <ReferenceArea
                      y1={5}
                      y2={40}
                      fill='#f97316'
                      fillOpacity={0.15}
                    />

                    <ReferenceLine
                      y={0}
                      stroke='#22c55e'
                      strokeDasharray='3 3'
                    />

                    <Line
                      type='monotone'
                      dataKey='bias'
                      stroke='#1f2937'
                      strokeWidth={chartConfig.strokeWidth}
                      dot={{ fill: '#1f2937', r: chartConfig.dotRadius }}
                      activeDot={{ r: chartConfig.activeDotRadius }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Tables Row */}
      <div className='grid gap-3 2xl:gap-4 lg:grid-cols-2'>
        {/* Growth Products Table */}
        {canSeeTable('demand-growth-analysis-table') && (
          <Card>
            <CardHeader className='pb-2 2xl:pb-4'>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl'>
                  Büyüme Analizi
                </CardTitle>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className='h-3.5 w-3.5 2xl:h-5 2xl:w-5 text-muted-foreground' />
                  </TooltipTrigger>
                  <TooltipContent className='max-w-[320px] text-xs 2xl:text-base'>
                    <p>
                      <strong>Tahmin:</strong> AI modelinin öngördüğü satış
                      adedi
                    </p>
                    <p>
                      <strong>Satış:</strong> Gerçekleşen satış adedi
                    </p>
                    <p>
                      <strong>Büyüme:</strong> Geçen aya göre % değişim
                    </p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className='flex flex-col sm:flex-row gap-2 mt-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 2xl:h-5 2xl:w-5 text-muted-foreground' />
                  <Input
                    placeholder='Ara...'
                    value={growthSearch}
                    onChange={(e) => {
                      setGrowthSearch(e.target.value);
                    }}
                    className='pl-9 h-8 2xl:h-12 text-xs 2xl:text-base'
                  />
                </div>
                <Select value={growthFilter} onValueChange={setGrowthFilter}>
                  <SelectTrigger className='w-28 2xl:w-36 h-8 2xl:h-12 text-xs 2xl:text-base'>
                    <SelectValue placeholder='Filtre' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tümü</SelectItem>
                    <SelectItem value='high'>Yüksek</SelectItem>
                    <SelectItem value='low'>Düşük</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='overflow-auto max-h-70 2xl:max-h-100'>
                <table className='w-full text-[10px] 2xl:text-sm'>
                  <thead className='sticky top-0 bg-card'>
                    <tr className='border-b'>
                      <th className='text-left p-2 font-medium text-muted-foreground'>
                        SKU
                      </th>
                      <th className='text-left p-2 font-medium text-muted-foreground'>
                        Ürün
                      </th>
                      <th className='text-right p-2 font-medium text-muted-foreground'>
                        <span className='inline-flex items-center justify-end gap-1 w-full'>
                          Büyüme
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help' />
                            </TooltipTrigger>
                            <TooltipContent className='max-w-[360px] text-xs 2xl:text-base'>
                              <p>
                                Formül:{' '}
                                <strong>(Satış - Önceki dönem satış)</strong> /
                                Önceki dönem satış × 100
                              </p>
                              <p className='mt-1'>
                                Satış: son <strong>30</strong> gün, önceki dönem:
                                bir önceki <strong>30</strong> gün.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </span>
                      </th>
                      <th className='text-right p-2 font-medium text-muted-foreground'>
                        Tahmin
                      </th>
                      <th className='text-right p-2 font-medium text-muted-foreground'>
                        Satış
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrowthProducts.map((product) => (
                      <tr
                        key={product.id}
                        className='border-b hover:bg-muted/50'
                      >
                        <td className='p-2 font-mono text-[10px] 2xl:text-xs'>
                          {product.id}
                        </td>
                        <td className='p-2 truncate max-w-30 2xl:max-w-45'>
                          {product.name}
                        </td>
                        <td
                          className={cn(
                            'p-2 text-right font-semibold',
                            product.growth > 0
                              ? 'text-green-600'
                              : 'text-red-600',
                          )}
                        >
                          {product.growth > 0 ? '+' : ''}
                          {product.growth}%
                        </td>
                        <td className='p-2 text-right text-muted-foreground'>
                          {product.forecast.toLocaleString()}
                        </td>
                        <td className='p-2 text-right font-medium'>
                          {product.actualSales.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast Error Table */}
        {canSeeTable('demand-forecast-errors-table') && (
          <Card>
            <CardHeader className='pb-2 2xl:pb-4'>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl'>
                  Tahmin Hataları
                </CardTitle>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className='h-3.5 w-3.5 2xl:h-5 2xl:w-5 text-muted-foreground' />
                  </TooltipTrigger>
                  <TooltipContent className='max-w-[320px] text-xs 2xl:text-base'>
                    <p>
                      <strong>Hata (Bias):</strong> Tahmin ile gerçek arasındaki
                      % sapma
                    </p>
                    <p>
                      <strong>Aksiyon:</strong> Önerilen düzeltme adımı
                    </p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className='flex flex-col sm:flex-row gap-2 mt-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 2xl:h-5 2xl:w-5 text-muted-foreground' />
                  <Input
                    placeholder='Ara...'
                    value={errorSearch}
                    onChange={(e) => {
                      setErrorSearch(e.target.value);
                    }}
                    className='pl-9 h-8 2xl:h-12 text-xs 2xl:text-base'
                  />
                </div>
                <Select value={errorFilter} onValueChange={setErrorFilter}>
                  <SelectTrigger className='w-28 2xl:w-36 h-8 2xl:h-12 text-xs 2xl:text-base'>
                    <SelectValue placeholder='Filtre' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tümü</SelectItem>
                    <SelectItem value='high'>&gt;10%</SelectItem>
                    <SelectItem value='medium'>5-10%</SelectItem>
                    <SelectItem value='low'>&lt;5%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='overflow-auto max-h-70 2xl:max-h-100'>
                <table className='w-full text-[10px] 2xl:text-sm'>
                  <thead className='sticky top-0 bg-card'>
                    <tr className='border-b'>
                      <th className='text-left p-2 font-medium text-muted-foreground'>
                        SKU
                      </th>
                      <th className='text-left p-2 font-medium text-muted-foreground'>
                        Ürün
                      </th>
                      <th className='text-right p-2 font-medium text-muted-foreground'>
                        <span className='inline-flex items-center justify-end gap-1 w-full'>
                          Hata
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help' />
                            </TooltipTrigger>
                            <TooltipContent className='max-w-[360px] text-xs 2xl:text-base'>
                              <p>
                                Formül: <strong>|Tahmin - Satış| / Satış × 100</strong>
                              </p>
                              <p className='mt-1'>
                                Hesaplama son <strong>30</strong> gün üzerinden yapılır.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </span>
                      </th>
                      <th className='text-left p-2 font-medium text-muted-foreground'>
                        Aksiyon
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredErrorProducts.map((product) => (
                      <tr
                        key={product.id}
                        className='border-b hover:bg-muted/50'
                      >
                        <td className='p-2 font-mono text-[10px] 2xl:text-xs'>
                          {product.id}
                        </td>
                        <td className='p-2 truncate max-w-30 2xl:max-w-45'>
                          {product.name}
                        </td>
                        <td
                          className={cn(
                            'p-2 text-right font-semibold',
                            product.error > 10
                              ? 'text-red-600'
                              : product.error > 5
                                ? 'text-orange-500'
                                : 'text-green-600',
                          )}
                        >
                          {product.error}%
                        </td>
                        <td className='p-2'>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] 2xl:text-xs font-medium whitespace-nowrap',
                              product.error > 10
                                ? 'bg-red-100 text-red-700'
                                : product.error > 5
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700',
                            )}
                          >
                            {product.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============ KPI Card Component ============

function KPICard({
  title,
  value,
  subValue,
  trend,
  trendUp,
  icon: Icon,
  accentColor,
  tooltip,
}: {
  title: string;
  value: string;
  subValue?: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  accentColor?: 'green' | 'red';
  tooltip?: string;
}) {
  const iconBgColor =
    accentColor === 'green'
      ? 'bg-green-100'
      : accentColor === 'red'
        ? 'bg-red-100'
        : 'bg-accent/10';
  const iconColor =
    accentColor === 'green'
      ? 'text-green-600'
      : accentColor === 'red'
        ? 'text-red-600'
        : 'text-accent';

  return (
    <div className='rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden'>
      <div className='flex flex-row items-center justify-between pb-1 pt-1.5 2xl:pt-3 px-2 2xl:px-3'>
        <div className='text-[10px] md:text-[11px] 2xl:text-sm font-medium text-muted-foreground truncate flex items-center gap-1'>
          {title}
          {tooltip !== undefined && tooltip !== '' && (
            <UITooltip>
              <TooltipTrigger asChild>
                <div className='cursor-help'>
                  <Info className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground/60' />
                </div>
              </TooltipTrigger>
              <TooltipContent className='max-w-62.5 text-xs 2xl:text-sm'>
                {tooltip}
              </TooltipContent>
            </UITooltip>
          )}
        </div>
        <div
          className={cn(
            'w-5 h-5 2xl:w-8 2xl:h-8 rounded-md flex items-center justify-center shrink-0',
            iconBgColor,
          )}
        >
          <Icon className={cn('h-2.5 w-2.5 2xl:h-4 2xl:w-4', iconColor)} />
        </div>
      </div>
      <div className='px-2 2xl:px-3 pb-2 2xl:pb-2'>
        <div className='text-lg md:text-xl 2xl:text-2xl font-bold tracking-tight'>
          {value}
        </div>
        {subValue !== undefined && subValue !== '' && (
          <div className='text-[9px] md:text-[10px] 2xl:text-sm text-muted-foreground'>
            {subValue}
          </div>
        )}
        {trend !== undefined && trend !== '' && (
          <div className='flex items-center mt-0.5 2xl:mt-1'>
            <span
              className={cn(
                'flex items-center text-[9px] 2xl:text-xs font-medium',
                trendUp ? 'text-green-600' : 'text-red-500',
              )}
            >
              {trendUp ? (
                <ArrowUpRight className='h-2 w-2 2xl:h-3 2xl:w-3 mr-0.5' />
              ) : (
                <ArrowDownRight className='h-2 w-2 2xl:h-3 2xl:w-3 mr-0.5' />
              )}
              {trend}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
