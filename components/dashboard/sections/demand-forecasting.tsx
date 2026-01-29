'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/demand-forecasting/tabs';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/demand-forecasting/toggle-group';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Target,
  Calendar,
  RefreshCcw,
  MoreHorizontal,
  Info,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  format,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { STORES, PRODUCTS, REGIONS, CATEGORIES } from '@/lib/constants';
import { FilterBar } from '@/components/dashboard/filter-bar';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';

// Mock Data Generators
const generateForecastData = (granularity: string, horizon: string) => {
  const data = [];
  const today = new Date();

  // Parse horizon
  let horizonWeeks = 12;
  if (horizon === '6_months') horizonWeeks = 26;
  if (horizon === '1_year') horizonWeeks = 52;
  if (horizon === '12_weeks') horizonWeeks = 12;

  let pointsHistory = 0;
  let pointsFuture = 0;
  let addFn: any = addWeeks;
  let subFn: any = subWeeks;
  let dateFormat = 'd MMM';

  // Configuration based on granularity
  if (granularity === 'daily') {
    pointsHistory = horizonWeeks * 7;
    pointsFuture = horizonWeeks * 7;
    addFn = addDays;
    subFn = subDays;
    dateFormat = 'd MMM';
  } else if (granularity === 'monthly') {
    pointsHistory = Math.ceil(horizonWeeks / 4) + 2;
    pointsFuture = Math.ceil(horizonWeeks / 4) + 2;
    addFn = addMonths;
    subFn = subMonths;
    dateFormat = 'MMM yy';
  } else {
    // weekly
    pointsHistory = horizonWeeks;
    pointsFuture = horizonWeeks;
    addFn = addWeeks;
    subFn = subWeeks;
    dateFormat = 'd MMM';
  }

  const start = subFn(today, pointsHistory);
  const totalPoints = pointsHistory + pointsFuture;

  // Generate points
  for (let i = 0; i < totalPoints; i++) {
    const date = addFn(start, i);
    const isFuture = i >= pointsHistory;

    // Create meaningful noise based on granularity
    const i_factor = granularity === 'daily' ? i / 7 : i;
    const baseVal = 1000 + Math.sin(i_factor / 2) * 200 + i_factor * 10;

    data.push({
      date: format(date, dateFormat, { locale: tr }),
      fullDate: date,
      history: isFuture ? null : Math.round(baseVal + Math.random() * 100),
      forecast: isFuture ? Math.round(baseVal) : null,
      // Connect the lines at the transition point
      ...(i === pointsHistory - 1
        ? { forecast: Math.round(baseVal + Math.random() * 100) }
        : {}),
      confLow: isFuture ? Math.round(baseVal * 0.9) : null,
      confHigh: isFuture ? Math.round(baseVal * 1.1) : null,
    });
  }
  return data;
};

// Waterfall Data
// Logic: Start from Baseline, add/subtract components to reach Final Forecast
const driversData = [
  { name: 'Baz Satış', value: 1200, isTotal: true },
  { name: 'Mevsimsellik', value: 300, isTotal: false },
  { name: 'Trend', value: 150, isTotal: false },
  { name: 'Fiyat Etkisi', value: -100, isTotal: false },
  { name: 'Rakip Kamp.', value: -50, isTotal: false },
  { name: 'Final Tahmin', value: 1500, isTotal: true },
];

const prepareWaterfallData = (data: any[]) => {
  let currentTotal = 0;
  return data.map((item, index) => {
    // For the first item (Base), start is 0
    if (index === 0) {
      currentTotal = item.value;
      return { ...item, uv: item.value, start: 0, fill: '#94a3b8' }; // Gray for Base
    }

    // For the last item (Final), it should match the accumulated total
    if (index === data.length - 1) {
      return { ...item, uv: currentTotal, start: 0, fill: '#3b82f6' }; // Blue for Final
    }

    // For intermediate steps
    const prevTotal = currentTotal;
    currentTotal += item.value;

    // Determine start and height (uv) for floating bars
    // If positive: start at prevTotal, height is value
    // If negative: start at currentTotal (which is lower), height is abs(value)

    // Visual Fix: We want to show the bar extending FROM the previous level
    let start, size;
    let color;

    if (item.value >= 0) {
      start = prevTotal;
      size = item.value;
      color = '#22c55e'; // Green for increase
    } else {
      start = prevTotal + item.value; // e.g. 1500 + (-100) = 1400. Bar goes from 1400 to 1500? No.
      // If we drop from 1500 to 1400: Start needs to be 1400, Size 100.
      size = Math.abs(item.value);
      start = prevTotal - size;
      color = '#ef4444'; // Red for decrease
    }

    return { ...item, uv: size, start: start, fill: color };
  });
};

const processedWaterfallData = prepareWaterfallData(driversData);

const skuData = [
  {
    id: 'SKU-001',
    name: 'Yudum Ayçiçek Yağı 5L',
    forecast: 1250,
    trend: '+5%',
    acc: '96%',
  },
  {
    id: 'SKU-002',
    name: 'Çaykur Rize Turist 1kg',
    forecast: 980,
    trend: '+2%',
    acc: '94%',
  },
  {
    id: 'SKU-003',
    name: 'Erikli Su 5L',
    forecast: 850,
    trend: '-1%',
    acc: '98%',
  },
  {
    id: 'SKU-004',
    name: "Beypazarı Soda 6'lı",
    forecast: 720,
    trend: '+12%',
    acc: '91%',
  },
  {
    id: 'SKU-005',
    name: "Solo Tuvalet Kağıdı 32'li",
    forecast: 640,
    trend: '0%',
    acc: '95%',
  },
];

export function DemandForecastingSection() {
  // Multi-select state for filters (arrays for multi-selection)
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timeHorizon, setTimeHorizon] = useState('12_weeks');
  const [granularity, setGranularity] = useState('weekly');
  const [data, setData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update data when parameters change
  useEffect(() => {
    setData(generateForecastData(granularity, timeHorizon));
  }, [
    granularity,
    timeHorizon,
    selectedRegions,
    selectedStores,
    selectedCategories,
  ]);

  // Mock refresh action
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data fetch
    setTimeout(() => {
      setData(generateForecastData(granularity, timeHorizon));
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className='space-y-6'>
      {/* 1. Filter Bar with Custom Horizon Controls */}
      <FilterBar
        title='Talep Tahminleme'
        selectedRegions={selectedRegions}
        onRegionChange={setSelectedRegions}
        regionOptions={REGIONS}
        selectedStores={selectedStores}
        onStoreChange={setSelectedStores}
        storeOptions={STORES}
        selectedCategories={selectedCategories}
        onCategoryChange={setSelectedCategories}
        categoryOptions={CATEGORIES}
      >
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground hidden lg:inline-block'>
            Ufuk:
          </span>
          <ToggleGroup
            type='single'
            value={timeHorizon}
            onValueChange={(v) => v && setTimeHorizon(v)}
          >
            <ToggleGroupItem
              value='12_weeks'
              aria-label='12 Hafta'
              className='h-8 text-xs px-2'
            >
              12 Hafta
            </ToggleGroupItem>
            <ToggleGroupItem
              value='6_months'
              aria-label='6 Ay'
              className='h-8 text-xs px-2'
            >
              6 Ay
            </ToggleGroupItem>
            <ToggleGroupItem
              value='1_year'
              aria-label='1 Yıl'
              className='h-8 text-xs px-2'
            >
              1 Yıl
            </ToggleGroupItem>
          </ToggleGroup>

          <div className='h-6 w-px bg-border mx-2' />

          {/* Granularity Switch */}
          <Tabs
            value={granularity}
            onValueChange={setGranularity}
            className='w-auto'
          >
            <TabsList className='h-8'>
              <TabsTrigger value='daily' className='text-xs px-2 h-6'>
                Gün
              </TabsTrigger>
              <TabsTrigger value='weekly' className='text-xs px-2 h-6'>
                Hafta
              </TabsTrigger>
              <TabsTrigger value='monthly' className='text-xs px-2 h-6'>
                Ay
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </FilterBar>

      {/* 2. KPI Cards with Tooltips */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        <KPI_Card
          title='Gelecek 30 Gün Tahmini'
          value='2.8M TL'
          secondaryValue='142K Adet'
          trend='+8.5%'
          trendUp={true}
          icon={TrendingUp}
          tooltip='Gelecek 30 gün için öngörülen toplam satış tutarı ve adet.'
        />
        <KPI_Card
          title='Toplam Tahmin'
          value='1.2M'
          unit='Adet'
          trend='+5.2%'
          trendUp={true}
          icon={TrendingUp}
          tooltip='Gelecek dönem için öngörülen toplam satış adedi.'
        />
        <KPI_Card
          title='Doğruluk Oranı (Accuracy)'
          value='94.8%'
          unit='Geçen Ay'
          trend='+1.2%'
          trendUp={true}
          icon={Target}
          tooltip='Geçen ayın gerçekleşen verisi ile tahmin arasındaki sapma oranı. (1 - MAPE)'
        />
        <KPI_Card
          title='Yıllık Büyüme (YoY)'
          value='12.4%'
          unit='Geçen Yıl'
          trend='-2.1%'
          trendUp={false}
          icon={Calendar}
          tooltip='Geçen yılın aynı dönemine göre büyüme oranı.'
        />
        <KPI_Card
          title='Bias (Sapma)'
          value='+2.3%'
          unit='Over-forecast'
          trend='Stabil'
          trendUp={true}
          icon={RefreshCcw}
          tooltip='Pozitif değer: Tahmin > Gerçekleşen (Over-forecast). Negatif: Under-forecast.'
        />
      </div>

      {/* 3. Main Chart & Waterfall */}
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Main Chart */}
        <Card className='md:col-span-2 min-h-[450px]'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle>Talep Trendi ve Tahmin</CardTitle>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <div className='w-2 h-2 rounded-full bg-slate-500' />
                Geçmiş
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <div className='w-2 h-2 rounded-full bg-blue-500' />
                Tahmin
              </div>
            </div>
          </CardHeader>
          <CardContent className='h-[400px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#e5e7eb'
                />
                <XAxis
                  dataKey='date'
                  stroke='#6b7280'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke='#6b7280'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                  labelStyle={{
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: '#111827',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                <Area
                  type='monotone'
                  dataKey='confLow'
                  stroke='none'
                  fill='#93c5fd'
                  fillOpacity={0.2}
                  name='Güven Aralığı (Alt)'
                  legendType='none'
                />
                <Area
                  type='monotone'
                  dataKey='confHigh'
                  stroke='none'
                  fill='#93c5fd'
                  fillOpacity={0.2}
                  name='Güven Aralığı (Üst)'
                  legendType='none'
                />

                <Line
                  type='monotone'
                  dataKey='history'
                  stroke='#64748b'
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#64748b' }}
                  activeDot={{ r: 5 }}
                  name='Geçmiş Satışlar'
                />

                <Line
                  type='monotone'
                  dataKey='forecast'
                  stroke='#3b82f6'
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                  name='Yapay Zeka Tahmini'
                  strokeDasharray='5 5'
                />

                <ReferenceLine x='May 10' stroke='red' label='Bugün' />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Drivers Waterfall Chart */}
        <Card className='min-h-[450px]'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Etki Analizi
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <HelpCircle className='h-4 w-4 text-muted-foreground' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='max-w-[200px]'>
                      Tahminin hangi bileşenlerden oluştuğunu gösteren şelale
                      grafiği.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Tahmin Bileşenleri (Waterfall)</CardDescription>
          </CardHeader>
          <CardContent className='h-[400px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={processedWaterfallData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#e5e7eb'
                />
                <XAxis
                  dataKey='name'
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor='end'
                  height={60}
                />
                <YAxis
                  stroke='#6b7280'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value: number, name, props) => {
                    // We are using 'uv' for height, but we want to show the original 'value'
                    // The original payload is available in props.payload
                    const originalValue = props.payload.value;
                    return [
                      `${originalValue > 0 ? '+' : ''}${originalValue}`,
                      'Etki',
                    ];
                  }}
                />
                {/* We use stacked bars to create the floating effect. StackId="a" */}
                <Bar dataKey='start' stackId='a' fill='transparent' />
                <Bar dataKey='uv' stackId='a' radius={[2, 2, 2, 2]}>
                  {processedWaterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 5. SKU Table */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Detaylı Ürün Bazlı Tahmin (Top 5)</CardTitle>
          <Button variant='ghost' size='sm' className='text-muted-foreground'>
            Tümünü Gör <MoreHorizontal className='ml-2 h-4 w-4' />
          </Button>
        </CardHeader>
        <CardContent>
          <div className='relative w-full overflow-auto'>
            <table className='w-full caption-bottom text-sm text-left'>
              <thead className='[&_tr]:border-b'>
                <tr className='border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'>
                  <th className='h-10 px-4 align-middle font-medium text-muted-foreground'>
                    SKU Kodu
                  </th>
                  <th className='h-10 px-4 align-middle font-medium text-muted-foreground'>
                    Ürün Adı
                  </th>
                  <th className='h-10 px-4 align-middle font-medium text-muted-foreground'>
                    Gelecek 4 Hafta
                  </th>
                  <th className='h-10 px-4 align-middle font-medium text-muted-foreground'>
                    Trend
                  </th>
                  <th className='h-10 px-4 align-middle font-medium text-muted-foreground'>
                    Model Doğruluğu
                  </th>
                </tr>
              </thead>
              <tbody className='[&_tr:last-child]:border-0'>
                {skuData.map((sku) => (
                  <tr
                    key={sku.id}
                    className='border-b transition-colors hover:bg-muted/50'
                  >
                    <td className='p-4 align-middle font-medium'>{sku.id}</td>
                    <td className='p-4 align-middle'>{sku.name}</td>
                    <td className='p-4 align-middle font-bold'>
                      {sku.forecast}
                    </td>
                    <td
                      className={cn(
                        'p-4 align-middle',
                        sku.trend.startsWith('+')
                          ? 'text-green-600'
                          : sku.trend === '0%'
                            ? 'text-muted-foreground'
                            : 'text-red-500',
                      )}
                    >
                      {sku.trend}
                    </td>
                    <td className='p-4 align-middle'>
                      <div className='flex items-center gap-2'>
                        <div className='h-2 w-16 bg-secondary rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-blue-500'
                            style={{ width: sku.acc }}
                          />
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          {sku.acc}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Component for KPIs with Tooltip
function KPI_Card({
  title,
  value,
  secondaryValue,
  unit,
  trend,
  trendUp,
  icon: Icon,
  tooltip,
}: {
  title: string;
  value: string;
  secondaryValue?: string;
  unit?: string;
  trend: string;
  trendUp: boolean;
  icon: any;
  tooltip: string;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm md:text-base font-medium flex items-center gap-2'>
          {title}
          {tooltip && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info className='h-3 w-3 text-muted-foreground cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  <p className='max-w-[180px] text-xs md:text-sm'>{tooltip}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className='w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center'>
          <Icon className='h-4 w-4 text-accent' />
        </div>
      </CardHeader>
      <CardContent>
        <div className='text-2xl lg:text-3xl font-bold tracking-tight'>
          {value}
        </div>
        {secondaryValue && (
          <div className='text-lg lg:text-xl font-semibold text-muted-foreground mt-0.5'>
            {secondaryValue}
          </div>
        )}
        <div className='flex items-center text-xs md:text-sm text-muted-foreground mt-1'>
          <span
            className={cn(
              'flex items-center mr-1',
              trendUp ? 'text-green-600' : 'text-red-500',
            )}
          >
            {trendUp ? (
              <ArrowUpRight className='h-3.5 w-3.5 mr-0.5' />
            ) : (
              <ArrowDownRight className='h-3.5 w-3.5 mr-0.5' />
            )}
            {trend}
          </span>
          {unit}
        </div>
      </CardContent>
    </Card>
  );
}
