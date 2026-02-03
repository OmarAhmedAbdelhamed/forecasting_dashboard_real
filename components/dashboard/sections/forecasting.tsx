/* eslint-disable react-hooks/purity */
'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';

import { useDashboardContext } from '@/contexts/dashboard-context';

// ... existing imports ...

// Inside ForecastingSection component:

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { DatePicker } from '@/components/ui/shared/date-picker';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import {
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from 'recharts';
import {
  Loader2,
  TrendingUp,
  Package,
  BarChart3,
  Sun,
  Cloud,
  CloudRain,
  Info,
  TurkishLira,
  LayoutGrid,
  Calendar as CalendarIcon,
  HardDriveDownload,
  CheckCircle2,
  Copy,
  Eye,
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipTrigger as UITooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { format, addDays, differenceInDays } from 'date-fns';

// Data type based on user's JSON + Weather
interface ForecastData {
  tarih: string;
  baseline: number;
  tahmin: number | null; // Allow null for non-promo periods
  ciro_adedi: number;
  benim_promom: string[];
  benim_promom_yuzde: number;
  ciro: number;
  stok: number;
  satisFiyati: number;
  ham_fiyat: number;
  birim_kar: number;
  birim_marj_yuzde: number;
  gunluk_kar: number;
  weather: 'sun' | 'cloud' | 'rain';
  // New fields
  lost_sales: number;
  unconstrained_demand: number | null;
}

import {
  STORES,
  PRODUCTS,
  PROMOTIONS,
  REGIONS_FLAT as REGIONS,
  CATEGORIES,
  SIMILAR_CAMPAIGNS,
  type SimilarCampaign,
  PROMOTION_HISTORY_DATA,
} from '@/data/mock-data';
import { ExportPromotionModal } from '@/components/dashboard/modals/export-promotion-modal';
import { PromotionCalendar } from '@/components/dashboard/visualizations/promotion-calendar';
import { CampaignDetailModal } from '@/components/dashboard/modals/campaign-detail-modal';

// Custom X-Axis Tick Component for Weather
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, data, fontSize } = props;
  const dateStr = payload.value;
  const dayData = data.find((d: any) => d.tarih === dateStr);
  const weather = dayData?.weather;

  const Icon =
    weather === 'rain' ? CloudRain : weather === 'cloud' ? Cloud : Sun;
  const color =
    weather === 'rain'
      ? '#60a5fa'
      : weather === 'cloud'
        ? '#94a3b8'
        : '#fbbf24';

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Weather Icon - Centered close to axis */}
      <foreignObject x={-8} y={10} width={16} height={16}>
        <div className='flex items-center justify-center'>
          <Icon size={fontSize ? fontSize + 4 : 14} color={color} />
        </div>
      </foreignObject>

      {/* Date Text - Rotated Diagonally */}
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor='end'
        fill='#666'
        fontSize={fontSize || 9}
        transform='rotate(-45) translate(-10, 18)'
      >
        {format(new Date(dateStr), 'dd MMM')}
      </text>
    </g>
  );
};

export function ForecastingSection() {
  // Inputs
  const [magazaKodu, setMagazaKodu] = useState<string[]>(['1001']);
  const [bolge, setBolge] = useState<string[]>([]);
  const [reyon, setReyon] = useState<string[]>([]);
  const [urunKodu, setUrunKodu] = useState<string[]>(['30000332']);

  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date('2026-01-06'),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date('2026-01-14'),
  );

  const [startPromosyon, setStartPromosyon] = useState<Date | undefined>(
    new Date('2026-01-08'),
  );
  const [endPromosyon, setEndPromosyon] = useState<Date | undefined>(
    new Date('2026-01-11'),
  );

  const [promosyon, setPromosyon] = useState('INTERNET_INDIRIMI');
  const [promosyonIndirimOrani, setPromosyonIndirimOrani] = useState('9');

  // NEW STATES
  const [pricingMode, setPricingMode] = useState<'discount' | 'price'>(
    'discount',
  );
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [budget, setBudget] = useState<string>('');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);

  // Screen size detection for responsive charts
  const [is2xl, setIs2xl] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'calendar'>('chart');

  // Similar Campaign Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<SimilarCampaign | null>(null);

  // Filter similar campaigns based on current promotion type
  const filteredCampaigns = useMemo(() => {
    // If user selected generic 'KATALOG', show KATALOG campaigns. etc.
    // For demo purposes, if no direct match, show top 3 by score.
    const matches = SIMILAR_CAMPAIGNS.filter((c) => c.type === promosyon);
    if (matches.length > 0) return matches;
    return SIMILAR_CAMPAIGNS.slice(0, 3); // Fallback
  }, [promosyon]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIs2xl(window.innerWidth >= 1536); // 2xl breakpoint
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Sync with Dashboard Context
  const { setSection, setFilters, setMetrics } = useDashboardContext();

  useEffect(() => {
    setSection('Fiyatlandırma & Promosyon');

    setFilters({
      regions: bolge,
      stores: magazaKodu,
      categories: reyon,
      products: urunKodu,
    });

    // Only update metrics if we have forecast data
    if (forecastData && forecastData.length > 0) {
      const totalF = forecastData.reduce(
        (acc, curr) => acc + (curr.tahmin || 0),
        0,
      );
      const totalRev = forecastData.reduce((acc, curr) => acc + curr.ciro, 0);

      setMetrics({
        'Toplam Tahmin': `${(totalF / 1000).toFixed(1)}K Adet`,
        'Toplam Ciro': `${(totalRev / 1000).toFixed(1)}K TL`,
        Promosyon: promosyon,
        'İndirim Oranı': `%${promosyonIndirimOrani}`,
        ROI: `${(((totalRev * 0.22 - (budget ? parseFloat(budget) : totalF * 0.15 * 87.45)) / (budget ? parseFloat(budget) : totalF * 0.15 * 87.45)) * 100).toFixed(1)}%`,
      });
    }
  }, [
    bolge,
    magazaKodu,
    reyon,
    urunKodu,
    forecastData,
    promosyon,
    promosyonIndirimOrani,
    budget,
    setSection,
    setFilters,
    setMetrics,
  ]);

  const handleAnalyze = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulation Logic
    const data: ForecastData[] = [];
    const days = differenceInDays(endDate, startDate) + 1;

    // Base values
    // Base values - Moved out for shared access if needed, or kept here but consistent
    const baseSatisFiyati = 87.45;
    const baseHamFiyat = 67.67;
    const birimKar = baseSatisFiyati - baseHamFiyat;
    const marj = (birimKar / baseSatisFiyati) * 100;

    // Determine discount based on mode
    let discount = 0;
    if (pricingMode === 'price' && targetPrice) {
      discount =
        ((baseSatisFiyati - parseFloat(targetPrice)) / baseSatisFiyati) * 100;
      // Safety check
      if (discount < 0) discount = 0;
    } else {
      discount = parseFloat(promosyonIndirimOrani) || 0;
    }

    for (let i = 0; i < days; i++) {
      const currentDate = addDays(startDate, i);

      // Check if current date is within promo range
      let isPromoActive = false;
      if (startPromosyon && endPromosyon) {
        if (currentDate >= startPromosyon && currentDate <= endPromosyon) {
          isPromoActive = true;
        }
      }

      // Random forecast variation
      const baseForecast = 50 + Math.floor(Math.random() * 15);
      const lift = isPromoActive ? 1 + discount / 100 : 1;
      const tahminVal = Math.round(baseForecast * lift);
      const baseline = baseForecast;

      // Secondary metric (Yellow line)
      const ciro_adedi =
        Math.floor(Math.random() * 10) + 5 + (isPromoActive ? 5 : 0);

      // Better mock:
      const dailyDrop = 300; // Aggressive sales
      let simulatedStock = 3800 - i * dailyDrop;
      if (simulatedStock < 0) simulatedStock = 0;

      // Logic for Lost Sales
      // If stock is 0, we lose the sales
      const demand = tahminVal;
      let actualSales = demand;
      let lostSales = 0;

      if (simulatedStock < demand) {
        actualSales = simulatedStock;
        lostSales = demand - actualSales;
      }

      // If lost sales, actual sales is reduced
      const finalTahmin = actualSales;

      const ciro = finalTahmin * baseSatisFiyati;
      const gunluk_kar = finalTahmin * birimKar;

      // Random weather
      // eslint-disable-next-line react-hooks/purity
      const weatherRoll = Math.random();
      const weather =
        weatherRoll > 0.7 ? 'rain' : weatherRoll > 0.4 ? 'cloud' : 'sun';

      data.push({
        tarih: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
        baseline: createSpecificPattern(i, days, baseline),
        tahmin: isPromoActive ? finalTahmin : null,
        unconstrained_demand: isPromoActive ? demand : null, // The potential
        lost_sales: lostSales,
        ciro_adedi: ciro_adedi,
        benim_promom: isPromoActive ? [promosyon] : [],
        benim_promom_yuzde: isPromoActive ? discount : 0,
        ciro: parseFloat(ciro.toFixed(2)),
        stok: simulatedStock,
        satisFiyati: baseSatisFiyati,
        ham_fiyat: baseHamFiyat,
        birim_kar: parseFloat(birimKar.toFixed(2)),
        birim_marj_yuzde: parseFloat(marj.toFixed(2)),
        gunluk_kar: parseFloat(gunluk_kar.toFixed(2)),
        weather: weather,
      });
    }

    setForecastData(data);
    setIsLoading(false);
  };

  const createSpecificPattern = (
    index: number,
    total: number,
    base: number,
  ) => {
    if (index % 7 === 5 || index % 7 === 6) return Math.round(base * 1.2);
    return base;
  };

  const totalForecast =
    forecastData?.reduce((acc, curr) => acc + (curr.tahmin || 0), 0) || 0;

  // Calculate potential forecast (unconstrained)
  const totalPotentialForecast =
    forecastData?.reduce(
      (acc, curr) => acc + (curr.unconstrained_demand || curr.tahmin || 0),
      0,
    ) || 0;

  const totalRevenue =
    forecastData?.reduce((acc, curr) => acc + curr.ciro, 0) || 0;

  // Financial Logic
  const promoCost = budget ? parseFloat(budget) : totalForecast * 0.15 * 87.45; // Fallback mock cost if no budget
  const grossProfit = totalRevenue * 0.22; // Mock margin 22%
  const netProfit = grossProfit - promoCost;
  const calculatedROI = promoCost > 0 ? (netProfit / promoCost) * 100 : 0;

  const lostSalesVolume = totalPotentialForecast - totalForecast;

  return (
    <div className='space-y-2 2xl:space-y-4'>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl 2xl:text-2xl font-bold tracking-tight'>
              Fiyatlandırma ve Promosyon Analizi
            </h2>
            <p className='text-xs 2xl:text-sm text-muted-foreground'>
              Promosyonların talep, ciro ve stok üzerindeki etkisini simüle
              edin.
            </p>
          </div>

          <Button
            variant='outline'
            size='icon'
            onClick={() => setIsExportModalOpen(true)}
            className='h-9 w-9 2xl:h-10 2xl:w-10 border-[#FFB840] bg-[#FFB840]/10 text-[#0D1E3A] hover:bg-[#FFB840] hover:text-[#0D1E3A] transition-all duration-200'
            title='Verileri Dışa Aktar'
          >
            <HardDriveDownload className='h-4 w-4 2xl:h-5 2xl:w-5' />
          </Button>
        </div>
      </div>

      <div className='grid gap-2 2xl:gap-3 lg:grid-cols-12'>
        {/* Left Column: Inputs & Special Days */}
        <div className='lg:col-span-4 space-y-2 2xl:space-y-3'>
          {/* Configuration Card */}
          <Card className='h-fit'>
            <CardHeader className='py-2 2xl:py-3'>
              <CardTitle className='text-base 2xl:text-lg'>
                Konfigürasyon
              </CardTitle>
              <CardDescription className='text-xs 2xl:text-sm'>
                Analiz parametrelerini giriniz
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2 2xl:space-y-3 pb-2 2xl:pb-3'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>Bölge</Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>Analiz edilecek coğrafi bölgeleri seçiniz.</p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <MultiSelect
                  options={REGIONS}
                  selected={bolge}
                  onChange={setBolge}
                  placeholder='Bölge Seçiniz'
                />
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>Mağaza Kodu</Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>Spesifik mağaza performansı için seçim yapınız.</p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <MultiSelect
                  options={STORES}
                  selected={magazaKodu}
                  onChange={setMagazaKodu}
                  placeholder='Mağaza Seçiniz'
                />
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>Reyon</Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>Ürün kategorisine göre filtreleme yapınız.</p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <MultiSelect
                  options={CATEGORIES}
                  selected={reyon}
                  onChange={setReyon}
                  placeholder='Reyon Seçiniz'
                />
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>Ürün Kodu</Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>Tahmin yapılacak spesifik ürünleri (SKU) seçiniz.</p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <MultiSelect
                  options={PRODUCTS}
                  selected={urunKodu}
                  onChange={setUrunKodu}
                  placeholder='Ürün Seçiniz'
                />
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>
                    Tahminleme Tarih Aralığı
                  </Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>
                        Talep tahmininin görüntüleneceği aralığı belirleyiniz.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    placeholder='Başlangıç'
                    className='h-7 2xl:h-9 text-xs'
                  />
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    placeholder='Bitiş'
                    className='h-7 2xl:h-9 text-xs'
                  />
                </div>
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>
                    Promosyon Tarih Aralığı
                  </Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>Promosyonun uygulanacağı aktif günleri seçiniz.</p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <DatePicker
                    date={startPromosyon}
                    setDate={setStartPromosyon}
                    placeholder='Başlangıç'
                    className='h-7 2xl:h-9 text-xs'
                  />
                  <DatePicker
                    date={endPromosyon}
                    setDate={setEndPromosyon}
                    placeholder='Bitiş'
                    className='h-7 2xl:h-9 text-xs'
                  />
                </div>
              </div>

              <div className='bg-muted/30 p-2 rounded-lg border space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1'>
                    <Label className='text-[10px] 2xl:text-xs font-semibold'>
                      Fiyatlandırma Stratejisi
                    </Label>
                    <UITooltip>
                      <UITooltipTrigger>
                        <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                      </UITooltipTrigger>
                      <UITooltipContent>
                        <p>
                          Promosyonun indirim oranı veya hedef satış fiyatı
                          üzerinden kurgulanması.
                        </p>
                      </UITooltipContent>
                    </UITooltip>
                  </div>
                  <span className='text-[10px] text-muted-foreground'>
                    Ref Fiyat: 87.45 TL
                  </span>
                </div>

                <Tabs
                  value={pricingMode}
                  onValueChange={(v) =>
                    setPricingMode(v as 'discount' | 'price')
                  }
                  className='w-full'
                >
                  <TabsList className='grid w-full grid-cols-2 h-7'>
                    <TabsTrigger value='discount' className='text-[10px] h-5'>
                      İndirim Oranı
                    </TabsTrigger>
                    <TabsTrigger value='price' className='text-[10px] h-5'>
                      Hedef Fiyat
                    </TabsTrigger>
                  </TabsList>

                  <div className='mt-2 grid grid-cols-2 gap-2'>
                    <div className='space-y-0.5'>
                      <Label className='text-[10px] 2xl:text-xs text-muted-foreground'>
                        Promosyon Tipi
                      </Label>
                      <Select value={promosyon} onValueChange={setPromosyon}>
                        <SelectTrigger className='h-7 2xl:h-8 text-[10px]'>
                          <SelectValue placeholder='Promo Seç' />
                        </SelectTrigger>
                        <SelectContent>
                          {PROMOTIONS.map((promo) => (
                            <SelectItem
                              key={promo.value}
                              value={promo.value}
                              className='text-[10px]'
                            >
                              {promo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <TabsContent value='discount' className='mt-0 space-y-0.5'>
                      <Label className='text-[10px] 2xl:text-xs text-muted-foreground'>
                        İndirim (%)
                      </Label>
                      <div className='relative'>
                        <Input
                          type='number'
                          className='h-7 2xl:h-8 text-xs pr-6'
                          value={promosyonIndirimOrani}
                          onChange={(e) => {
                            setPromosyonIndirimOrani(e.target.value);
                            // Auto-calc target price for reference
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const price = 87.45 * (1 - val / 100);
                              setTargetPrice(price.toFixed(2));
                            }
                          }}
                        />
                        <span className='absolute right-2 top-1.5 text-[10px] text-muted-foreground'>
                          %
                        </span>
                      </div>
                    </TabsContent>

                    <TabsContent value='price' className='mt-0 space-y-0.5'>
                      <Label className='text-[10px] 2xl:text-xs text-muted-foreground'>
                        Hedef Fiyat (TL)
                      </Label>
                      <Input
                        type='number'
                        className='h-7 2xl:h-8 text-xs'
                        value={targetPrice}
                        onChange={(e) => {
                          setTargetPrice(e.target.value);
                          // Auto-calc discount % for reference
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const disc = ((87.45 - val) / 87.45) * 100;
                            setPromosyonIndirimOrani(disc.toFixed(1));
                          }
                        }}
                      />
                    </TabsContent>
                  </div>
                </Tabs>

                {/* Info Display for the other value */}
                <div className='text-[10px] text-muted-foreground text-center bg-background/50 py-0.5 rounded border'>
                  {pricingMode === 'discount' ? (
                    <>
                      Satış Fiyatı:{' '}
                      <span className='font-medium text-foreground'>
                        {targetPrice || '...'} TL
                      </span>
                    </>
                  ) : (
                    <>
                      İndirim Oranı:{' '}
                      <span className='font-medium text-foreground'>
                        % {promosyonIndirimOrani || '...'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className='space-y-0.5'>
                <div className='flex items-center gap-1'>
                  <Label className='text-[10px] 2xl:text-xs'>
                    Planlanan Bütçe (Opsiyonel)
                  </Label>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>
                        Maksimum kampanya bütçesi. ROI hesabında kullanılır.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <Input
                  type='number'
                  placeholder='Örn: 50000'
                  className='h-7 2xl:h-9 text-xs'
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <p className='text-[10px] text-muted-foreground'>
                  ROI hesaplaması için kullanılır.
                </p>
              </div>

              <Button
                className='w-full mt-2 h-8 2xl:h-10 2xl:text-sm text-xs'
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-3 w-3 animate-spin' />
                    Analiz Ediliyor...
                  </>
                ) : (
                  'Analiz Et'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Similar Campaigns Module */}
          <Card className='h-fit border-indigo-100 bg-indigo-50/20'>
            <CardHeader className='py-2 pb-1 2xl:py-3'>
              <div className='flex items-center gap-2'>
                <div className='bg-indigo-100 p-1 rounded-md text-indigo-600'>
                  <Copy className='h-3 w-3' />
                </div>
                <CardTitle className='text-sm 2xl:text-base'>
                  Benzer Kampanyalar
                </CardTitle>
                <UITooltip>
                  <UITooltipTrigger>
                    <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                  </UITooltipTrigger>
                  <UITooltipContent>
                    <p>
                      Geçmişte benzer özellikler gösteren kampanyaların
                      performans analizi.
                    </p>
                  </UITooltipContent>
                </UITooltip>
              </div>
              <CardDescription className='text-[10px]'>
                Geçmiş öneriler
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2 p-3'>
              {filteredCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className='bg-white border rounded-lg p-2 hover:shadow-sm transition-shadow'
                >
                  <div className='flex justify-between items-start mb-1'>
                    <div>
                      <div className='font-semibold text-xs text-indigo-950'>
                        {camp.name}
                      </div>
                      <div className='text-[10px] text-muted-foreground'>
                        {camp.date} • {camp.type}
                      </div>
                    </div>
                    <div className='text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded'>
                      %{camp.similarityScore}
                    </div>
                  </div>

                  <div className='grid grid-cols-3 gap-1 text-[10px] text-muted-foreground mb-2'>
                    <div className='flex flex-col'>
                      <span className='font-medium text-emerald-600'>
                        %{camp.lift}
                      </span>
                      <span>Lift</span>
                    </div>
                    <div className='flex flex-col'>
                      <span className='font-medium text-blue-600'>
                        %{camp.roi}
                      </span>
                      <span>ROI</span>
                    </div>
                    <div className='flex flex-col'>
                      <span
                        className={`font-medium ${camp.stockOutDays > 0 ? 'text-red-500' : 'text-gray-600'}`}
                      >
                        {camp.stockOutDays} G
                      </span>
                      <span>OOS</span>
                    </div>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 h-6 text-[10px] gap-1'
                      onClick={() => {
                        setSelectedCampaign(camp);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className='h-3 w-3' /> Gör
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 h-6 text-[10px] gap-1 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                      onClick={() => {
                        setPromosyon(camp.type as string);
                        setPromosyonIndirimOrani('15');
                      }}
                    >
                      <CheckCircle2 className='h-3 w-3' /> Uygula
                    </Button>
                  </div>
                </div>
              ))}

              {filteredCampaigns.length === 0 && (
                <div className='text-center text-xs text-muted-foreground py-4'>
                  Bu kriterlere uygun benzer kampanya bulunamadı.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Special Days (Moved to Left Column) */}
          <Card className='h-fit'>
            <CardHeader className='py-3 pb-2 2xl:py-4'>
              <div className='flex items-center gap-1'>
                <CardTitle className='text-base 2xl:text-lg'>
                  Yaklaşan Özel Günler (Fırsatlar)
                </CardTitle>
                <UITooltip>
                  <UITooltipTrigger>
                    <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                  </UITooltipTrigger>
                  <UITooltipContent>
                    <p>
                      Promosyon planlamasında değerlendirilebilecek önemli
                      günler.
                    </p>
                  </UITooltipContent>
                </UITooltip>
              </div>
              <CardDescription className='text-xs 2xl:text-sm'>
                Önümüzdeki dönemde değerlendirilebilecek fırsatlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {[
                  {
                    name: 'Ramazan Bayramı',
                    date: '20 Mart 2026',
                    type: 'Bayram',
                    impact: 'Yüksek',
                  },
                  {
                    name: '23 Nisan Ulusal Egemenlik',
                    date: '23 Nisan 2026',
                    type: 'Resmi Tatil',
                    impact: 'Orta',
                  },
                  {
                    name: 'Anneler Günü',
                    date: '10 Mayıs 2026',
                    type: 'Özel Gün',
                    impact: 'Yüksek',
                  },
                  {
                    name: '19 Mayıs Gençlik Spor',
                    date: '19 Mayıs 2026',
                    type: 'Resmi Tatil',
                    impact: 'Düşük',
                  },
                  {
                    name: 'Kurban Bayramı',
                    date: '27 Mayıs 2026',
                    type: 'Bayram',
                    impact: 'Çok Yüksek',
                  },
                ].map((event, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-default group'
                  >
                    <div className='grid gap-1'>
                      <span className='font-semibold text-sm 2xl:text-base group-hover:text-primary transition-colors'>
                        {event.name}
                      </span>
                      <div className='flex items-center gap-2 text-xs 2xl:text-sm text-muted-foreground'>
                        <span>{event.date}</span>
                        <span className='w-1 h-1 rounded-full bg-muted-foreground/40' />
                        <span>{event.type}</span>
                      </div>
                    </div>
                    <div
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        event.impact === 'Çok Yüksek'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : event.impact === 'Yüksek'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {event.impact} Etki
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Charts & KPIs */}
        <div className='lg:col-span-8 space-y-2 2xl:space-y-3'>
          {/* 1. Top KPIs */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 2xl:gap-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-2 2xl:py-3'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Toplam Tahmin
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground hover:text-indigo-600 transition-colors' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p className='max-w-xs'>
                        Promosyon süresince satılması öngörülen toplam ürün
                        adedi.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <Package className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent className='pb-2 2xl:pb-3'>
                <div className='text-lg 2xl:text-xl font-bold'>
                  {isLoading ? '-' : totalForecast.toLocaleString()}
                </div>
                <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                  ADET (Simüle)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-2 2xl:py-3'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Beklenen Ciro
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground hover:text-indigo-600 transition-colors' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p className='max-w-xs'>
                        İndirimli fiyat üzerinden hesaplanan tahmini toplam
                        satış geliri.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <TurkishLira className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent className='pb-2 2xl:pb-3'>
                <div className='text-lg 2xl:text-xl font-bold'>
                  {isLoading ? '-' : `₺${(totalRevenue / 1000).toFixed(1)}k`}
                </div>
                <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                  TL (Simüle)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-2 2xl:py-3'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Tahmini ROI
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground hover:text-indigo-600 transition-colors' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p className='max-w-xs'>
                        Yatırım Getirisi: (Net Kar / Promosyon Maliyeti) x 100.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <TrendingUp className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent className='pb-2 2xl:pb-3'>
                <div
                  className={`text-lg 2xl:text-xl font-bold ${calculatedROI >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  %{calculatedROI.toFixed(1)}
                </div>
                <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                  Harcanan: ₺{(promoCost / 1000).toFixed(1)}k
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-2 2xl:py-3'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Stok Durumu
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground hover:text-indigo-600 transition-colors' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p className='max-w-xs'>
                        Mevcut stokun tahmin edilen talebi karşılama durumu.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <Info className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent className='pb-2 2xl:pb-3'>
                <div
                  className={`text-lg 2xl:text-xl font-bold ${lostSalesVolume > 0 ? 'text-red-600' : 'text-emerald-600'}`}
                >
                  {lostSalesVolume > 0 ? 'Riskli' : 'Güvenli'}
                </div>
                <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                  {lostSalesVolume > 0
                    ? `-${lostSalesVolume} OOS`
                    : 'Yeterli Stok'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart or Calendar */}
          <div className='flex items-center justify-end mb-2 gap-2'>
            <div className='flex items-center bg-muted/50 p-1 rounded-lg border'>
              <Button
                variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs gap-2'
                onClick={() => setViewMode('chart')}
              >
                <LayoutGrid className='h-3.5 w-3.5' /> Grafik
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs gap-2'
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className='h-3.5 w-3.5' /> Takvim
              </Button>
            </div>
          </div>

          <div className='bg-white rounded-lg border shadow-sm p-1 min-h-[400px]'>
            {viewMode === 'chart' ? (
              <div className='relative'>
                <div className='flex items-center justify-between px-3 py-2 border-b'>
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-1'>
                      <h3 className='text-sm 2xl:text-base font-semibold'>
                        Tahmin vs Temel Satış
                      </h3>
                      <UITooltip>
                        <UITooltipTrigger>
                          <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                        </UITooltipTrigger>
                        <UITooltipContent>
                          <p>
                            Promosyonlu satış (yeşil) ile normal satış
                            beklentisinin (siyah) karşılaştırması.
                          </p>
                        </UITooltipContent>
                      </UITooltip>
                    </div>
                    <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                      Temel satışlara kıyasla promosyon etkisi.
                    </p>
                  </div>
                  {/* Legend Inline */}
                  <div className='flex items-center gap-3 text-[10px]'>
                    <div className='flex items-center gap-1.5'>
                      <span className='w-2 h-2 rounded-full bg-[#0D1E3A]' />
                      <span className='text-muted-foreground font-medium'>
                        Temel
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span className='w-2 h-2 rounded-full bg-[#22c55e]' />
                      <span className='text-muted-foreground font-medium'>
                        Simüle
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className='w-2 h-2 rounded-full bg-red-400 opacity-80'
                        style={{ borderStyle: 'dashed', borderWidth: 1 }}
                      />
                      <span className='text-muted-foreground font-medium'>
                        Kaçan
                      </span>
                    </div>
                  </div>
                </div>

                <div className='pl-0 pb-2 px-2 pt-2 2xl:pb-4'>
                  <div className='w-full overflow-x-auto pb-1'>
                    <div
                      style={{
                        width: '100%',
                        minWidth: `${Math.max(100, (forecastData?.length || 0) * 40)}px`,
                        height: 320,
                      }}
                    >
                      <ResponsiveContainer width='100%' height='100%'>
                        <ComposedChart
                          data={forecastData || []}
                          margin={{ bottom: 40, top: 10, right: 10, left: -20 }}
                        >
                          <defs>
                            <linearGradient
                              id='glowGreen'
                              x1='0'
                              y1='0'
                              x2='0'
                              y2='1'
                            >
                              <stop
                                offset='5%'
                                stopColor='#22c55e'
                                stopOpacity={0.2}
                              />
                              <stop
                                offset='95%'
                                stopColor='#22c55e'
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray='3 3'
                            vertical={false}
                            stroke='var(--border)'
                            opacity={0.5}
                          />

                          {/* Highlight Promo Period */}
                          {startPromosyon && endPromosyon && (
                            <ReferenceArea
                              x1={format(
                                startPromosyon,
                                "yyyy-MM-dd'T'00:00:00",
                              )}
                              x2={format(endPromosyon, "yyyy-MM-dd'T'00:00:00")}
                              fill='#22c55e'
                              fillOpacity={0.1}
                              ifOverflow='extendDomain'
                            />
                          )}

                          <XAxis
                            dataKey='tarih'
                            stroke='var(--muted-foreground)'
                            fontSize={is2xl ? 11 : 9}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={
                              <CustomizedAxisTick
                                data={forecastData}
                                fontSize={is2xl ? 11 : 9}
                              />
                            }
                            height={is2xl ? 70 : 60}
                          />
                          <YAxis
                            stroke='var(--muted-foreground)'
                            strokeWidth={0}
                            fontSize={is2xl ? 11 : 9}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: 'var(--border)',
                              color: '#0D1E3A',
                              borderRadius: 'var(--radius)',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            labelFormatter={(value) =>
                              format(new Date(value), 'PPP')
                            }
                            formatter={(value: number, name: string) => {
                              if (name === 'tahmin')
                                return [value, 'Promosyon Tahmini (Adet)'];
                              if (name === 'baseline')
                                return [value, 'Temel Satış (Adet)'];
                              if (name === 'ciro_adedi')
                                return [value, 'Ciro Adedi'];
                              if (name === 'unconstrained_demand')
                                return [value, 'Potansiyel Talep (Stok olsa)'];
                              if (name === 'lost_sales' && value > 0)
                                return [value, 'Kaçırılan Satış'];
                              return [value, name];
                            }}
                            label={
                              PRODUCTS.find((p) =>
                                urunKodu.includes(p.value),
                              )?.label.split(' - ')[1] || 'Seçili Ürün'
                            }
                          />

                          {/* Lines */}
                          <Line
                            type='monotone'
                            dataKey='baseline'
                            stroke='#0D1E3A'
                            strokeWidth={2}
                            dot={false}
                            name='Baseline Forecast'
                          />
                          <Line
                            type='monotone'
                            dataKey='tahmin'
                            stroke='#22c55e'
                            strokeWidth={4}
                            dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                            name='Realized Sales'
                            connectNulls={false}
                          />
                          <Line
                            type='monotone'
                            dataKey='unconstrained_demand'
                            stroke='#ef4444'
                            strokeWidth={2}
                            strokeDasharray='5 5'
                            dot={false}
                            activeDot={{ r: 4, fill: '#ef4444' }}
                            name='Lost Demand'
                          />
                          <Line
                            type='monotone'
                            dataKey='ciro_adedi'
                            stroke='#FFB840'
                            strokeWidth={2}
                            dot={false}
                            name='Revenue Count'
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='h-[380px]'>
                <PromotionCalendar />
              </div>
            )}
          </div>

          {/* Advanced Analytics Module (Decision Support) */}
          <div className='flex flex-col gap-2 2xl:gap-3'>
            {/* 1. Strategic Summary Cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-2 2xl:gap-3'>
              {/* Best Performing Promo Card */}
              <Card className='bg-emerald-50/50 border-emerald-100'>
                <CardContent className='p-3 2xl:p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <div className='flex items-center gap-2'>
                      <span className='bg-emerald-100 text-emerald-700 p-1 rounded-full'>
                        <TrendingUp className='h-3 w-3' />
                      </span>
                      <span className='text-[10px] 2xl:text-xs font-semibold text-emerald-800 uppercase tracking-tight'>
                        En İyi Performans
                      </span>
                      <UITooltip>
                        <UITooltipTrigger>
                          <Info className='h-3 w-3 text-emerald-600/50 hover:text-emerald-800 cursor-help' />
                        </UITooltipTrigger>
                        <UITooltipContent>
                          <p>
                            Seçilen dönemde en yüksek ROI getiren kampanya tipi.
                          </p>
                        </UITooltipContent>
                      </UITooltip>
                    </div>
                    <span className='text-[10px] text-muted-foreground bg-white px-1.5 py-0.5 rounded-full border shadow-sm'>
                      Son 6 Ay
                    </span>
                  </div>
                  <div className='space-y-0.5'>
                    <div className='text-sm 2xl:text-base font-bold text-gray-900'>
                      İnternet İndirimi (Mayıs)
                    </div>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-xl 2xl:text-2xl font-black text-emerald-600 tracking-tighter'>
                        142%
                      </span>
                      <span className='text-[10px] 2xl:text-xs text-muted-foreground font-medium'>
                        ROI
                      </span>
                    </div>
                    <p className='text-emerald-700 text-[10px] 2xl:text-xs mt-0.5 leading-tight'>
                      12.4k TL net kar artışı sağladı.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Risk Alert Card */}
              <Card className='bg-red-50/50 border-red-100'>
                <CardContent className='p-3 2xl:p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <div className='flex items-center gap-2'>
                      <span className='bg-red-100 text-red-700 p-1 rounded-full'>
                        <Package className='h-3 w-3' />
                      </span>
                      <span className='text-[10px] 2xl:text-xs font-semibold text-red-800 uppercase tracking-tight'>
                        Stok Riski Uyarısı
                      </span>
                      <UITooltip>
                        <UITooltipTrigger>
                          <Info className='h-3 w-3 text-red-600/50 hover:text-red-800 cursor-help' />
                        </UITooltipTrigger>
                        <UITooltipContent>
                          <p>
                            Stok yetersizliği nedeniyle kaçırılacak satış riski.
                          </p>
                        </UITooltipContent>
                      </UITooltip>
                    </div>
                  </div>
                  <div className='space-y-0.5'>
                    <div className='text-sm 2xl:text-base font-bold text-gray-900'>
                      500 TL+ (Haziran)
                    </div>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-xl 2xl:text-2xl font-black text-red-600 tracking-tighter'>
                        {lostSalesVolume > 0
                          ? `${lostSalesVolume} Adet`
                          : '0 Adet'}
                      </span>
                      <span className='text-[10px] 2xl:text-xs text-muted-foreground font-medium'>
                        Stock-Out
                      </span>
                    </div>
                    <p className='text-red-700 text-[10px] 2xl:text-xs mt-0.5 leading-tight'>
                      {lostSalesVolume > 0
                        ? `Tahmini ₺${((lostSalesVolume * 87.45) / 1000).toFixed(1)}k ciro kaybı.`
                        : 'Stok riski bulunmuyor.'}
                    </p>
                    {/* Financial Warning */}
                    <div className='mt-1 text-[10px] bg-red-100/50 p-1 rounded text-red-800 font-medium'>
                      Stok Maliyeti: ₺{(lostSalesVolume * 15).toFixed(0)}
                      <span className='block font-normal opacity-80'>
                        (Acil sipariş farkı)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benchmarking Card */}
              <Card className='bg-blue-50/50 border-blue-100'>
                <CardContent className='p-3 2xl:p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <div className='flex items-center gap-2'>
                      <span className='bg-blue-100 text-blue-700 p-1 rounded-full'>
                        <BarChart3 className='h-3 w-3' />
                      </span>
                      <span className='text-[10px] 2xl:text-xs font-semibold text-blue-800 uppercase tracking-tight'>
                        Kategori Kıyaslaması
                      </span>
                      <UITooltip>
                        <UITooltipTrigger>
                          <Info className='h-3 w-3 text-blue-600/50 hover:text-blue-800 cursor-help' />
                        </UITooltipTrigger>
                        <UITooltipContent>
                          <p>
                            Bu kampanyanın benzer ürünlerin ortalamasına göre
                            performansı.
                          </p>
                        </UITooltipContent>
                      </UITooltip>
                    </div>
                  </div>
                  <div className='space-y-0.5'>
                    <div className='text-sm 2xl:text-base font-bold text-green-600 mt-0.5'>
                      {urunKodu.length > 0 && parseInt(urunKodu[0]) % 2 === 0
                        ? '%14.2'
                        : '%21.5'}
                    </div>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-xl 2xl:text-2xl font-black text-blue-600 tracking-tighter'>
                        +15%
                      </span>
                      <span className='text-[10px] 2xl:text-xs text-muted-foreground font-medium'>
                        Daha İyi
                      </span>
                    </div>
                    <p className='text-blue-700 text-[10px] 2xl:text-xs mt-0.5 leading-tight'>
                      Benzer ürünlerin ortalama promosyon lifti %22 iken sizinki
                      %37.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 2. Middle Section: Performance Visualization */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 2xl:gap-3'>
            {/* Promo Effectiveness Chart */}
            <Card className='h-full'>
              <CardHeader className='py-2 pb-1 2xl:py-3'>
                <div className='flex items-center gap-1'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Promosyon Tipi Karşılaştırması
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>
                        Farklı promosyon kurgularının karlılık (ROI) ve ciro
                        artışı (Lift) karşılaştırması.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <CardDescription className='text-[10px] 2xl:text-xs'>
                  Hangi yöntem daha karlı? (ROI vs Ciro Artışı)
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-1 pb-2'>
                {/* Simplified Visualization using simple bars for now */}
                <div className='space-y-2'>
                  {[
                    {
                      type: 'INTERNET_INDIRIMI',
                      roi: 95,
                      lift: 80,
                      color: 'bg-emerald-500',
                    },
                    {
                      type: 'ALISVERIS_INDIRIMI_500',
                      roi: 45,
                      lift: 60,
                      color: 'bg-blue-500',
                    },
                    {
                      type: 'COKLU_ALIM',
                      roi: 60,
                      lift: 40,
                      color: 'bg-indigo-500',
                    },
                    {
                      type: 'OZEL_GUN_INDIRIMI',
                      roi: 75,
                      lift: 70,
                      color: 'bg-amber-500',
                    },
                  ].map((item, i) => (
                    <div key={i} className='space-y-0.5'>
                      <div className='flex justify-between text-[10px] 2xl:text-xs font-medium'>
                        <span>{item.type}</span>
                        <span className='text-muted-foreground'>
                          ROI: %{item.roi} | Lift: %{item.lift}
                        </span>
                      </div>
                      <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden flex'>
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.roi}%` }}
                          title='ROI'
                        />
                        <div
                          className='h-full bg-gray-300'
                          style={{ width: `${item.lift * 0.5}%` }}
                          title='Lift (Scaled)'
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seasonality / Smart Insights List */}
            <Card className='h-full'>
              <CardHeader className='py-2 pb-1 2xl:py-3'>
                <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                  Akıllı İçgörüler & Sezonsallık
                </CardTitle>
                <CardDescription className='text-[10px] 2xl:text-xs'>
                  Geçmiş verilerden çıkarımlar
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-1 pb-2'>
                <div className='grid gap-1.5'>
                  {[
                    {
                      title: 'Yaz Dönemi Fırsatı',
                      desc: 'Bu ürün Haziran-Ağustos döneminde %20 daha fazla talep görüyor.',
                      type: 'success',
                    },
                    {
                      title: 'Marj Erezyonu',
                      desc: 'Gazete ilanları yüksek ciro getiriyor ancak karlılığı %5 puan düşürüyor.',
                      type: 'warning',
                    },
                    {
                      title: 'Stok Yönetimi Başarısı',
                      desc: 'Son 3 promosyonda stok planlaması %98 doğrulukla gerçekleşti.',
                      type: 'info',
                    },
                  ].map((insight, i) => (
                    <div
                      key={i}
                      className={`p-2 2xl:p-2.5 rounded-lg border text-[10px] 2xl:text-xs ${
                        insight.type === 'success'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : insight.type === 'warning'
                            ? 'bg-amber-50 border-amber-100 text-amber-800'
                            : 'bg-blue-50 border-blue-100 text-blue-800'
                      }`}
                    >
                      <span className='font-bold block mb-0.5'>
                        {insight.title}
                      </span>
                      {insight.desc}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. Detailed History Table with Advanced Metrics */}
          <Card>
            <CardHeader className='py-2 pb-1 2xl:py-3 flex flex-row items-center justify-between'>
              <div className='space-y-0.5'>
                <CardTitle className='text-sm 2xl:text-base font-semibold'>
                  Detaylı Promosyon Geçmişi
                </CardTitle>
                <CardDescription className='text-[10px] 2xl:text-xs'>
                  Finansal ve operasyonel metrikler
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className='p-0 2xl:p-1'>
              <div className='border-t'>
                <table className='w-full text-[10px] 2xl:text-xs text-left'>
                  <thead className='bg-muted/50 text-muted-foreground font-medium uppercase'>
                    <tr>
                      <th className='p-2 2xl:p-3 w-[100px]'>Tarih</th>
                      <th className='p-2 2xl:p-3'>Kampanya / Tip</th>
                      <th className='p-2 2xl:p-3 text-right'>
                        Ciro Artışı (Lift)
                      </th>
                      <th className='p-2 2xl:p-3 text-right'>Net Kar Etkisi</th>
                      <th className='p-2 2xl:p-3 text-right'>ROI %</th>
                      <th className='p-2 2xl:p-3 text-center'>Stok Durumu</th>
                      <th className='p-2 2xl:p-3 text-right'>
                        Tahmin Doğruluğu
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {PROMOTION_HISTORY_DATA.map((row, i) => (
                      <tr
                        key={i}
                        className='group hover:bg-muted/30 transition-colors cursor-pointer'
                      >
                        <td className='p-2 2xl:p-3 font-medium text-gray-700'>
                          {row.date}
                        </td>
                        <td className='p-2 2xl:p-3'>
                          <div className='font-semibold text-gray-900'>
                            {row.name}
                          </div>
                          <div className='text-[10px] text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded'>
                            {row.type}
                          </div>
                        </td>
                        <td className='p-2 2xl:p-3 text-right'>
                          <div className='font-bold text-gray-900'>
                            {row.uplift}
                          </div>
                          <div className='text-[10px] text-muted-foreground'>
                            {row.upliftVal}
                          </div>
                        </td>
                        <td className='p-2 2xl:p-3 text-right font-medium'>
                          <span
                            className={
                              row.profit.startsWith('-')
                                ? 'text-red-600'
                                : 'text-emerald-600'
                            }
                          >
                            {row.profit}
                          </span>
                        </td>
                        <td className='p-2 2xl:p-3 text-right'>
                          <div
                            className={`font-bold inline-block px-1.5 py-0.5 rounded ${
                              row.roi > 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : row.roi > 0
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-red-50 text-red-700'
                            }`}
                          >
                            %{row.roi}
                          </div>
                        </td>
                        <td className='p-2 2xl:p-3 text-center'>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              row.stock === 'OK'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : row.stock === 'OOS'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            {row.stock === 'OK'
                              ? 'YETERLİ'
                              : row.stock === 'OOS'
                                ? 'TÜKENDİ'
                                : 'AŞIRI STOK'}
                          </span>
                        </td>
                        <td className='p-2 2xl:p-3 text-right text-gray-600'>
                          {row.forecast}
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
      <ExportPromotionModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        initialData={PROMOTION_HISTORY_DATA}
      />

      <CampaignDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        campaign={selectedCampaign}
        onApply={(camp) => {
          setPromosyon(camp.type as string);
          setPromosyonIndirimOrani('15'); // Mock apply logic: set discount
          setIsDetailModalOpen(false);
        }}
      />
    </div>
  );
}
