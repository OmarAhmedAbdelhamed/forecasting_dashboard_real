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
import { MultiSelect } from '@/components/ui/shared/multi-select';
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
import { STORES, PRODUCTS, REYONLAR } from '@/data/mock-data';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { GROWTH_PRODUCTS_DATA, FORECAST_ERROR_DATA } from '@/data/mock-alerts';

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

// ============ MOCK DATA ============

// Monthly Bias Data - per store/product
const generateMonthlyBiasData = (storeId?: string, productId?: string) => {
  // Base data - slightly modified based on selection
  const seed = (storeId?.charCodeAt(0) || 0) + (productId?.charCodeAt(0) || 0);
  const modifier = (seed % 10) - 5;

  return [
    { month: 'Oca', bias: -3 + modifier },
    { month: 'Şub', bias: 0 + modifier },
    { month: 'Mar', bias: 2 + modifier },
    { month: 'Nis', bias: 8 + modifier },
    { month: 'May', bias: 22 + modifier },
    { month: 'Haz', bias: 23 + modifier },
    { month: 'Tem', bias: 25 + modifier },
    { month: 'Ağu', bias: 30 + modifier },
    { month: 'Eyl', bias: 12 + modifier },
    { month: 'Eki', bias: 5 + modifier },
    { month: 'Kas', bias: 4 + modifier },
    { month: 'Ara', bias: 0 + modifier },
  ];
};

// Trend Forecast Data - reactive to filters with realistic patterns
// Trend Forecast Data - reactive to filters with realistic patterns
const generateTrendForecastData = (
  storeId?: string,
  productId?: string,
  filterSeed: number = 0,
  granularity: 'daily' | 'weekly' | 'monthly' = 'weekly',
) => {
  const data = [];
  const startYear = 2023;
  const endYear = 2026;
  const baseSeed =
    (storeId?.charCodeAt(0) || 0) +
    (productId?.charCodeAt(0) || 0) +
    filterSeed;
  const multiplier = 0.7 + (baseSeed % 8) * 0.1;

  // Seasonal pattern factors (peaks in summer for most products)
  const getSeasonalFactor = (week: number) => {
    // Winter low, spring rising, summer peak, fall declining
    return Math.sin(((week - 13) * Math.PI) / 26) * 0.3 + 1;
  };

  // Noise generator
  const getVariation = (index: number, seed: number) => {
    const pseudoRandom = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
    return (pseudoRandom - Math.floor(pseudoRandom)) * 400 - 200;
  };

  // Current date context: 2026-01-29
  const currentYear = 2026;
  const currentMonth = 0; // Jan
  const currentDay = 29;
  const currentWeek = 5;

  if (granularity === 'daily') {
    for (let year = startYear; year <= endYear; year++) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeap ? 366 : 365;

      for (let day = 1; day <= daysInYear; day++) {
        const date = new Date(year, 0, day); // Start from Jan 1st
        const month = date.getMonth();
        const dayOfMonth = date.getDate();

        // Forecast cutoff: After Jan 29, 2026
        const isForecast =
          year > currentYear ||
          (year === currentYear && month > currentMonth) ||
          (year === currentYear &&
            month === currentMonth &&
            dayOfMonth > currentDay);

        const weekNum = Math.ceil(day / 7); // Approx week for seasonality
        const seasonal = getSeasonalFactor(weekNum);
        const yearGrowth = (year - startYear) * 150;
        const baseValue = (1800 + yearGrowth) * multiplier;
        const dailyNoise = getVariation(day + year * 365, baseSeed);
        const dayOfWeek = date.getDay();
        const weekendBoost =
          dayOfWeek === 0 || dayOfWeek === 6 ? baseValue * 0.15 : 0;

        let value = (baseValue * seasonal + dailyNoise + weekendBoost) / 7; // Daily volume is ~1/7th of weekly
        if (isForecast) value *= 1.08; // Growth

        const trendValue =
          ((1600 + (year - startYear) * 200 + weekNum * 3) * multiplier) / 7;

        const dateStr = date.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        });

        data.push({
          date: dateStr,
          history: isForecast ? null : Math.round(value),
          forecast: isForecast ? Math.round(value) : null,
          trendline: Math.round(trendValue),
        });
      }
    }
  } else if (granularity === 'monthly') {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const isForecast =
          year > currentYear || (year === currentYear && month > currentMonth);

        const weekNum = (month + 1) * 4.3;
        const seasonal = getSeasonalFactor(weekNum);
        const yearGrowth = (year - startYear) * 150;
        const baseValue = (1800 + yearGrowth) * multiplier * 4.3; // Monthly volume
        const noise = getVariation(month + year * 12, baseSeed) * 5;

        let value = baseValue * seasonal + noise;
        if (isForecast) value *= 1.08;

        const trendValue =
          (1600 + (year - startYear) * 200 + weekNum * 3) * multiplier * 4.3;

        const date = new Date(year, month, 1);
        const dateStr = date.toLocaleDateString('tr-TR', {
          month: 'short',
          year: '2-digit',
        });

        data.push({
          date: dateStr,
          history: isForecast ? null : Math.round(value),
          forecast: isForecast ? Math.round(value) : null,
          trendline: Math.round(trendValue),
        });
      }
    }
  } else {
    // Weekly (Default)
    for (let year = startYear; year <= endYear; year++) {
      for (let week = 1; week <= 52; week++) {
        const isForecast = year === 2026 && week > currentWeek;
        const yearGrowth = (year - startYear) * 150;
        const baseValue = (1800 + yearGrowth) * multiplier;
        const seasonal = getSeasonalFactor(week);
        const weeklyNoise = getVariation(week + year * 52, baseSeed);
        const hasPromo = (week * 7 + baseSeed) % 17 === 0;
        const promoBoost = hasPromo ? baseValue * 0.25 : 0;

        let value = baseValue * seasonal + weeklyNoise + promoBoost;
        if (isForecast) {
          const lastYearSameWeekValue =
            (1800 + (year - 1 - startYear) * 150) *
            multiplier *
            getSeasonalFactor(week);
          value =
            lastYearSameWeekValue * 1.08 +
            getVariation(week, baseSeed + 1000) * 0.3;
        }

        const trendValue =
          (1600 + (year - startYear) * 200 + week * 3) * multiplier;

        data.push({
          date: `H${week} ${year.toString().slice(-2)}`,
          history: isForecast ? null : Math.round(value),
          forecast: isForecast ? Math.round(value) : null,
          trendline: Math.round(trendValue),
        });
      }
    }
  }
  return data;
};

// Year Comparison Data - 3 years (2024, 2025, 2026)
const generateYearComparisonData = (storeId?: string, productId?: string) => {
  const data = [];
  const seed = (storeId?.charCodeAt(0) || 0) + (productId?.charCodeAt(0) || 0);
  const multiplier = 0.8 + (seed % 5) * 0.1;
  const currentWeek = 4; // Current date: 2026-01-29 = Week 4

  for (let week = 1; week <= 52; week++) {
    const baseValue = (8000 + Math.sin(week / 6) * 2000) * multiplier;
    data.push({
      week: `H${week}`,
      y2024: Math.round(baseValue + Math.random() * 500),
      y2025: Math.round(baseValue * 1.08 + Math.random() * 500),
      y2026:
        week <= currentWeek
          ? Math.round(baseValue * 1.15 + Math.random() * 500)
          : null,
    });
  }
  return data;
};

// Growth Products Data - Imported from mock-alerts
const growthProductsData = GROWTH_PRODUCTS_DATA;

// Forecast Error Products Data - Imported from mock-alerts
const forecastErrorData = FORECAST_ERROR_DATA;

// KPI values generator - reactive to filters
const generateKPIValues = (stores: string[], products: string[]) => {
  const hasFilters = stores.length > 0 || products.length > 0;
  const modifier = hasFilters ? 0.7 + Math.random() * 0.3 : 1;

  return {
    totalForecast: hasFilters
      ? `${(2.8 * modifier).toFixed(1)}M TL`
      : '2.8M TL',
    totalUnits: hasFilters
      ? `${Math.round(142 * modifier)}K Adet`
      : '142K Adet',
    accuracy: hasFilters
      ? `${(94.8 * (0.95 + Math.random() * 0.1)).toFixed(1)}%`
      : '94.8%',
    yoyGrowth: hasFilters ? `${(12.4 * modifier).toFixed(1)}%` : '12.4%',
    bias: hasFilters ? `+${(2.3 * modifier).toFixed(1)}%` : '+2.3%',
    lowGrowth: hasFilters ? Math.ceil(4 * modifier) : 4,
    highGrowth: hasFilters ? Math.ceil(12 * modifier) : 12,
  };
};

// ============ MAIN COMPONENT ============

export function DemandForecastingSection() {
  // Filter states
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedReyonlar, setSelectedReyonlar] = useState<string[]>([]);
  const [periodValue, setPeriodValue] = useState('30');
  const [periodUnit, setPeriodUnit] = useState('gun');

  // Table search/filter states
  const [growthSearch, setGrowthSearch] = useState('');
  const [growthFilter, setGrowthFilter] = useState('all');
  const [errorSearch, setErrorSearch] = useState('');
  const [errorFilter, setErrorFilter] = useState('all');

  // Screen size detection for responsive charts
  const [is2xl, setIs2xl] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIs2xl(window.innerWidth >= 1536); // 2xl breakpoint
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const chartConfig = getChartConfig(is2xl);

  // Period calculation with 1 year max cap
  const periodInDays = useMemo(() => {
    const value = parseInt(periodValue) || 30;
    let days: number;

    switch (periodUnit) {
      case 'hafta':
        days = Math.min(value * 7, 365); // Max 52 weeks = 364 days
        break;
      case 'ay':
        days = Math.min(value * 30, 365); // Max 12 months = 360 days
        break;
      case 'yil':
        days = 365; // Always 1 year max
        break;
      default: // gun
        days = Math.min(value, 365);
    }

    return days;
  }, [periodValue, periodUnit]);

  // Combine all filter selections into a seed for data generation
  const filterSeed = useMemo(() => {
    const storeChar = selectedStores[0]?.charCodeAt(0) || 0;
    const productChar = selectedProducts[0]?.charCodeAt(0) || 0;
    const reyonChar = selectedReyonlar[0]?.charCodeAt(0) || 0;
    return storeChar + productChar + reyonChar;
  }, [selectedStores, selectedProducts, selectedReyonlar]);

  // Determine granularity based on period unit
  const granularity = useMemo<'daily' | 'weekly' | 'monthly'>(() => {
    if (periodUnit === 'yil') return 'monthly';
    if (periodUnit === 'ay') return 'weekly';
    return 'daily';
  }, [periodUnit]);

  // Reactive data based on filters
  const trendData = useMemo(() => {
    const fullData = generateTrendForecastData(
      selectedStores[0],
      selectedProducts[0],
      filterSeed,
      granularity,
    );

    // Split into history and forecast
    // History points have forecast as null
    const historyData = fullData.filter((d) => d.forecast === null);
    const forecastData = fullData.filter((d) => d.history === null);

    // Slice forecast based on period
    let sliceCount = 0;
    if (granularity === 'daily') {
      sliceCount = periodInDays;
    } else if (granularity === 'weekly') {
      sliceCount = Math.ceil(periodInDays / 7);
    } else {
      // Monthly
      sliceCount = Math.ceil(periodInDays / 30);
      // Ensure 1 year forecast shows 12 months exactly
      if (periodUnit === 'yil') {
        sliceCount = 12 * (parseInt(periodValue) || 1);
      }
    }

    // Ensure at least 1 point
    sliceCount = Math.max(1, sliceCount);

    const slicedForecast = forecastData.slice(0, sliceCount);

    // Bridge the gap: Ensure the last history point also starts the forecast area
    if (historyData.length > 0 && slicedForecast.length > 0) {
      const lastHistoryIndex = historyData.length - 1;
      const lastHistory = historyData[lastHistoryIndex];

      // Update the last history point to also have a forecast value (equal to history)
      historyData[lastHistoryIndex] = {
        ...lastHistory,
        forecast: lastHistory.history,
      };
    }

    // For daily granularity, cap history to last 365 days to ensure readability
    // For monthly granularity (1 year forecast), cap history to last 2 years (24 months)
    let finalHistory = historyData;
    if (granularity === 'daily' && historyData.length > 365) {
      finalHistory = historyData.slice(-365);
    } else if (granularity === 'monthly' && historyData.length > 24) {
      finalHistory = historyData.slice(-24);
    }

    // Combine: All history + Selected Forecast period
    return [...finalHistory, ...slicedForecast];
  }, [
    selectedStores,
    selectedProducts,
    filterSeed,
    granularity,
    periodInDays,
    periodUnit,
    periodValue,
  ]);

  const biasData = useMemo(
    () => generateMonthlyBiasData(selectedStores[0], selectedProducts[0]),
    [selectedStores, selectedProducts],
  );

  const yearData = useMemo(
    () => generateYearComparisonData(selectedStores[0], selectedProducts[0]),
    [selectedStores, selectedProducts],
  );

  const kpiValues = useMemo(
    () => generateKPIValues(selectedStores, selectedProducts),
    [selectedStores, selectedProducts],
  );

  // Filtered table data
  const filteredGrowthProducts = useMemo(() => {
    return growthProductsData.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(growthSearch.toLowerCase()) ||
        product.id.toLowerCase().includes(growthSearch.toLowerCase());
      const matchesFilter =
        growthFilter === 'all' || product.type === growthFilter;
      const matchesStore =
        selectedStores.length === 0 || selectedStores.includes(product.store);
      return matchesSearch && matchesFilter && matchesStore;
    });
  }, [growthSearch, growthFilter, selectedStores]);

  const filteredErrorProducts = useMemo(() => {
    return forecastErrorData.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(errorSearch.toLowerCase()) ||
        product.id.toLowerCase().includes(errorSearch.toLowerCase());
      const matchesFilter =
        errorFilter === 'all' ||
        (errorFilter === 'high' && product.error > 10) ||
        (errorFilter === 'medium' &&
          product.error >= 5 &&
          product.error <= 10) ||
        (errorFilter === 'low' && product.error < 5);
      const matchesStore =
        selectedStores.length === 0 || selectedStores.includes(product.store);
      return matchesSearch && matchesFilter && matchesStore;
    });
  }, [errorSearch, errorFilter, selectedStores]);

  return (
    <div className='space-y-4 2xl:space-y-6'>
      {/* Universal Filter Bar */}
      <FilterBar
        title='Talep Tahminleme'
        leftContent={
          <Button
            variant='outline'
            size='icon'
            onClick={() => setIsExportModalOpen(true)}
            className='h-10 w-10 2xl:h-12 2xl:w-12 border-[#FFB840] bg-[#FFB840]/10 text-[#0D1E3A] hover:bg-[#FFB840] hover:text-[#0D1E3A] transition-all duration-200'
            title='Excel Olarak Dışa Aktar'
          >
            <HardDriveDownload className='h-7 w-7 2xl:h-8 2xl:w-8' />
          </Button>
        }
        storeOptions={STORES}
        selectedStores={selectedStores}
        onStoreChange={setSelectedStores}
        categoryOptions={REYONLAR}
        selectedCategories={selectedReyonlar}
        onCategoryChange={setSelectedReyonlar}
        productOptions={PRODUCTS}
        selectedProducts={selectedProducts}
        onProductChange={setSelectedProducts}
      >
        {/* Period Selector (passed as children to appear before main filters) */}
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            min='1'
            max={
              periodUnit === 'yil'
                ? 1
                : periodUnit === 'ay'
                  ? 12
                  : periodUnit === 'hafta'
                    ? 52
                    : 365
            }
            value={periodValue}
            onChange={(e) => setPeriodValue(e.target.value)}
            className='w-14 2xl:w-16 h-8 2xl:h-10 text-center text-xs 2xl:text-sm bg-white dark:bg-slate-900'
            disabled={periodUnit === 'yil'}
          />
          <Select
            value={periodUnit}
            onValueChange={(newUnit) => {
              setPeriodUnit(newUnit);
              const val = parseInt(periodValue) || 0;
              let max = 365;
              if (newUnit === 'ay') max = 12;
              if (newUnit === 'hafta') max = 52;
              if (newUnit === 'yil') max = 1;

              if (val > max) {
                setPeriodValue(max.toString());
              }
            }}
          >
            <SelectTrigger className='w-16 2xl:w-20 h-8 2xl:h-10 text-xs 2xl:text-sm bg-white dark:bg-slate-900'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='gun'>gün</SelectItem>
              <SelectItem value='hafta'>hafta</SelectItem>
              <SelectItem value='ay'>ay</SelectItem>
              <SelectItem value='yil'>yıl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <ExportForecastModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />

      {/* KPI Cards - 6 in a row with better padding */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4'>
        {/* Top Left: KPIs (2 cols x 3 rows) */}
        <div className='lg:col-span-4 grid grid-cols-2 gap-2 2xl:gap-3'>
          <KPICard
            title='Toplam Tahmin'
            value={kpiValues.totalForecast}
            subValue={kpiValues.totalUnits}
            trend='+8.5%'
            trendUp={true}
            icon={TrendingUp}
            tooltip='Seçilen dönem için AI modelinin öngördüğü toplam satış tutarı ve adet.'
          />
          <KPICard
            title='Doğruluk Oranı'
            value={kpiValues.accuracy}
            subValue='Geçen Ay'
            trend='+1.2%'
            trendUp={true}
            icon={Target}
            tooltip='Model doğruluğu. Tahmin ile gerçekleşen arasındaki tutarlılık.'
          />
          <KPICard
            title='Yıllık Büyüme'
            value={kpiValues.yoyGrowth}
            subValue='vs. Geçen Yıl'
            trend='-2.1%'
            trendUp={false}
            icon={Calendar}
            tooltip='Geçen yılın aynı dönemine kıyasla satışlardaki büyüme oranı (YoY).'
          />
          <KPICard
            title='Bias (Sapma)'
            value={kpiValues.bias}
            subValue='Over-forecast'
            trend='Stabil'
            trendUp={true}
            icon={AlertTriangle}
            tooltip='Pozitif: Tahmin > Gerçek (Over). Negatif: Tahmin < Gerçek (Under).'
          />
          <KPICard
            title='Low Growth'
            value={String(kpiValues.lowGrowth)}
            subValue='Ürün'
            trend=''
            trendUp={false}
            icon={TrendingDown}
            accentColor='red'
            tooltip='Düşük büyüme gösteren ürün sayısı. Pazarlama stratejisi gözden geçirilmeli.'
          />
          <KPICard
            title='High Growth'
            value={String(kpiValues.highGrowth)}
            subValue='Ürün'
            trend=''
            trendUp={true}
            icon={TrendingUp}
            accentColor='green'
            tooltip='Yüksek büyüme gösteren ürün sayısı. Stok ve tedarik planlaması öncelikli.'
          />
        </div>

        {/* Top Right: Trend Forecast Chart */}
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
              <ResponsiveContainer width='100%' height='100%' key={granularity}>
                <ComposedChart
                  data={trendData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#e5e7eb'
                  />
                  <XAxis
                    dataKey='date'
                    fontSize={chartConfig.axisFontSize}
                    tickLine={false}
                    axisLine={false}
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
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
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
                  />
                  <Area
                    type='monotone'
                    dataKey='forecast'
                    fill='#93c5fd'
                    fillOpacity={0.6}
                    stroke='#3b82f6'
                    strokeWidth={chartConfig.strokeWidth}
                    name='Tahmin'
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
      </div>

      {/* Second Row: Yearly Comparison + Risk Chart */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4'>
        {/* Left: Year Comparison Chart */}
        <div className='lg:col-span-6'>
          <Card className='h-full'>
            <CardHeader className='pb-2 2xl:pb-3'>
              <CardTitle className='text-sm md:text-base lg:text-lg 2xl:text-xl'>
                Yıllık Karşılaştırma
              </CardTitle>
              <CardDescription className='text-xs md:text-xs 2xl:text-sm'>
                Mevcut yıl ile geçmiş 2 yıl satış karşılaştırması (Haftalık) -
                H4
              </CardDescription>
            </CardHeader>
            <CardContent className='h-[250px] 2xl:h-[350px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart
                  data={yearData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
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
                    interval={is2xl ? 2 : 3}
                  />
                  <YAxis
                    fontSize={chartConfig.axisFontSize}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    width={chartConfig.yAxisWidth}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (value === null) return ['—', ''];
                      const year =
                        name === 'y2024'
                          ? '2024'
                          : name === 'y2025'
                            ? '2025'
                            : '2026';
                      return [value?.toLocaleString(), year];
                    }}
                    contentStyle={{ fontSize: chartConfig.tooltipFontSize }}
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
                      paddingTop: '10px',
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

        {/* Right: Bias Risk Chart */}
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
            <CardContent className='h-[300px] 2xl:h-[450px]'>
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

                  {/* Colored zones */}
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

                  <ReferenceLine y={0} stroke='#22c55e' strokeDasharray='3 3' />

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
      </div>

      {/* Tables Row */}
      <div className='grid gap-3 2xl:gap-4 lg:grid-cols-2'>
        {/* Growth Products Table - Enhanced */}
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
                    <strong>Tahmin:</strong> AI modelinin öngördüğü satış adedi
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
                  onChange={(e) => setGrowthSearch(e.target.value)}
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
                      Büyüme
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
                    <tr key={product.id} className='border-b hover:bg-muted/50'>
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

        {/* Forecast Error Table - Enhanced */}
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
                    <strong>Hata (Bias):</strong> Tahmin ile gerçek arasındaki %
                    sapma
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
                  onChange={(e) => setErrorSearch(e.target.value)}
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
                      Hata
                    </th>
                    <th className='text-left p-2 font-medium text-muted-foreground'>
                      Aksiyon
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrorProducts.map((product) => (
                    <tr key={product.id} className='border-b hover:bg-muted/50'>
                      <td className='p-2 font-mono text-[10px] 2xl:text-xs'>
                        {product.id}
                      </td>
                      <td className='p-2 truncate max-w-[120px] 2xl:max-w-[180px]'>
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
      </div>
    </div>
  );
}

// ============ KPI Card Component - Enhanced ============

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
          {tooltip && (
            <UITooltip>
              <TooltipTrigger>
                <Info className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground/60' />
              </TooltipTrigger>
              <TooltipContent className='max-w-[250px] text-xs 2xl:text-sm'>
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
        {subValue && (
          <div className='text-[9px] md:text-[10px] 2xl:text-sm text-muted-foreground'>
            {subValue}
          </div>
        )}
        {trend && (
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
