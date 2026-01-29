'use client';

import { useState } from 'react';
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
  Area,
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
  DollarSign,
  Package,
  BarChart3,
  Sun,
  Cloud,
  CloudRain,
} from 'lucide-react';
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
}

// Dummy Data for Dropdowns
import {
  STORES,
  PRODUCTS,
  PROMOTIONS,
  REGIONS,
  CATEGORIES,
} from '@/lib/constants';



// Custom X-Axis Tick Component for Weather
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
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
          <Icon size={14} color={color} />
        </div>
      </foreignObject>

      {/* Date Text - Rotated Diagonally */}
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor='end'
        fill='#666'
        fontSize={10}
        transform='rotate(-45) translate(-10, 20)'
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

  const [promosyon, setPromosyon] = useState('KATALOG');
  const [promosyonIndirimOrani, setPromosyonIndirimOrani] = useState('9');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);

  const handleAnalyze = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulation Logic
    const data: ForecastData[] = [];
    const days = differenceInDays(endDate, startDate) + 1;

    // Base values
    const baseSatisFiyati = 87.45;
    const baseHamFiyat = 67.67;
    const birimKar = baseSatisFiyati - baseHamFiyat;
    const marj = (birimKar / baseSatisFiyati) * 100;
    const discount = parseFloat(promosyonIndirimOrani) || 0;

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

      const ciro = tahminVal * baseSatisFiyati;
      const stok = 3800 - i * 55;
      const gunluk_kar = tahminVal * birimKar;

      // Random weather
      const weatherRoll = Math.random();
      const weather =
        weatherRoll > 0.7 ? 'rain' : weatherRoll > 0.4 ? 'cloud' : 'sun';

      data.push({
        tarih: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
        baseline: createSpecificPattern(i, days, baseline),
        tahmin: isPromoActive
          ? createSpecificPattern(i, days, tahminVal)
          : null, // Only show if promo active
        ciro_adedi: ciro_adedi,
        benim_promom: isPromoActive ? [promosyon] : [],
        benim_promom_yuzde: isPromoActive ? discount : 0,
        ciro: parseFloat(ciro.toFixed(2)),
        stok: stok > 0 ? stok : 0,
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
  const totalRevenue =
    forecastData?.reduce((acc, curr) => acc + curr.ciro, 0) || 0;
  const avgLift = 12.5;

  return (
    <div className='space-y-2'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-2xl font-bold tracking-tight'>
          Fiyatlandırma ve Promosyon Analizi
        </h2>
        <p className='text-sm text-muted-foreground'>
          Promosyonların talep, ciro ve stok üzerindeki etkisini simüle edin.
        </p>
      </div>

      <div className='grid gap-3 lg:grid-cols-12'>
        {/* Left Column: Inputs & Special Days */}
        <div className='lg:col-span-4 space-y-3'>
          {/* Configuration Card */}
          <Card className='h-fit'>
            <CardHeader className='py-3'>
              <CardTitle className='text-lg'>Konfigürasyon</CardTitle>
              <CardDescription>Analiz parametrelerini giriniz</CardDescription>
            </CardHeader>
            <CardContent className='space-y-2.5 pb-3'>
              <div className='space-y-1'>
                <Label className='text-xs'>Bölge</Label>
                <MultiSelect
                  options={REGIONS}
                  selected={bolge}
                  onChange={setBolge}
                  placeholder='Bölge Seçiniz'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Mağaza Kodu</Label>
                <MultiSelect
                  options={STORES}
                  selected={magazaKodu}
                  onChange={setMagazaKodu}
                  placeholder='Mağaza Seçiniz'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Reyon</Label>
                <MultiSelect
                  options={CATEGORIES}
                  selected={reyon}
                  onChange={setReyon}
                  placeholder='Reyon Seçiniz'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Ürün Kodu</Label>
                <MultiSelect
                  options={PRODUCTS}
                  selected={urunKodu}
                  onChange={setUrunKodu}
                  placeholder='Ürün Seçiniz'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Tahminleme Tarih Aralığı</Label>
                <div className='grid grid-cols-2 gap-2'>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    placeholder='Başlangıç'
                    className='h-8 text-sm'
                  />
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    placeholder='Bitiş'
                    className='h-8 text-sm'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Promosyon Tarih Aralığı</Label>
                <div className='grid grid-cols-2 gap-2'>
                  <DatePicker
                    date={startPromosyon}
                    setDate={setStartPromosyon}
                    placeholder='Başlangıç'
                    className='h-8 text-sm'
                  />
                  <DatePicker
                    date={endPromosyon}
                    setDate={setEndPromosyon}
                    placeholder='Bitiş'
                    className='h-8 text-sm'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <Label className='text-xs'>Promosyon Seçimi</Label>
                  <Select value={promosyon} onValueChange={setPromosyon}>
                    <SelectTrigger className='h-8 text-sm'>
                      <SelectValue placeholder='Promo Seç' />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTIONS.map((promo) => (
                        <SelectItem key={promo.value} value={promo.value}>
                          {promo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs'>İndirim Oranı (%)</Label>
                  <Input
                    type='number'
                    className='h-8 text-sm'
                    value={promosyonIndirimOrani}
                    onChange={(e) => setPromosyonIndirimOrani(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className='w-full mt-2 h-9'
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

          {/* Upcoming Special Days (Moved to Left Column) */}
          <Card className='h-fit'>
            <CardHeader className='py-3 pb-2'>
              <CardTitle className='text-base'>
                Yaklaşan Özel Günler (Fırsatlar)
              </CardTitle>
              <CardDescription className='text-xs'>
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
                      <span className='font-semibold text-sm group-hover:text-primary transition-colors'>
                        {event.name}
                      </span>
                      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
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

        {/* Right Column: Visualization & Stats */}
        <div className='lg:col-span-8 space-y-3'>
          {forecastData ? (
            <>
              {/* Summary Stats */}
              <div className='grid gap-2 md:grid-cols-3'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-3'>
                    <CardTitle className='text-sm font-medium'>
                      Toplam Hacim
                    </CardTitle>
                    <Package className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent className='pb-3'>
                    <div className='text-xl font-bold'>
                      {totalForecast.toLocaleString()}
                    </div>
                    <p className='text-[10px] text-muted-foreground'>
                      Tahmini Satış Adedi
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-3'>
                    <CardTitle className='text-sm font-medium'>
                      Toplam Ciro
                    </CardTitle>
                    <DollarSign className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent className='pb-3'>
                    <div className='text-xl font-bold'>
                      ₺{(totalRevenue / 1000).toFixed(1)}k
                    </div>
                    <p className='text-[10px] text-muted-foreground'>
                      Tahmini Gelir
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-3'>
                    <CardTitle className='text-sm font-medium'>
                      Promosyon Artışı
                    </CardTitle>
                    <TrendingUp className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent className='pb-3'>
                    <div className='text-xl font-bold'>+{avgLift}%</div>
                    <p className='text-[10px] text-muted-foreground'>
                      Temel Satışa Göre
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Chart */}
              <Card className='relative'>
                <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2 py-3'>
                  <div className='space-y-0.5'>
                    <CardTitle className='text-base'>
                      Tahmin vs Temel Satış
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Temel satışlara kıyasla promosyon etkisi.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className='pl-0 pb-4 px-4 pt-2'>
                  {/* Custom Legend Box - Moved Inside Content */}
                  <div className='absolute top-2 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-md border border-border/50 shadow-sm z-10 text-[10px] space-y-1 min-w-[160px]'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-[#FFB840] font-bold'>Sarı:</span>
                      <span className='text-muted-foreground font-medium'>
                        Ciro Adedi
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-[#0D1E3A] font-bold'>
                        Lacivert:
                      </span>
                      <span className='text-muted-foreground font-medium'>
                        Temel Tahmini Ciro
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-[#22c55e] font-bold'>Yeşil:</span>
                      <span className='text-muted-foreground font-medium'>
                        Promosyon Dönemi Ciro
                      </span>
                    </div>
                  </div>

                  <div className='w-full overflow-x-auto pb-2'>
                    <div
                      style={{
                        width: '100%',
                        minWidth: `${Math.max(100, (forecastData?.length || 0) * 50)}px`,
                        height: 380,
                      }}
                    >
                      <ResponsiveContainer width='100%' height='100%'>
                        <ComposedChart
                          data={forecastData}
                          margin={{ bottom: 60, top: 10, right: 10, left: 0 }}
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
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={<CustomizedAxisTick data={forecastData} />}
                            height={80}
                          />
                          <YAxis
                            stroke='var(--muted-foreground)'
                            strokeWidth={0}
                            fontSize={10}
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
                            name='Promo Forecast'
                            connectNulls={false}
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
                </CardContent>
              </Card>
            </>
          ) : (
            <div className='h-[350px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground p-12 text-center bg-muted/20'>
              <div className='space-y-3'>
                <BarChart3 className='mx-auto h-12 w-12 opacity-50' />
                <div className='space-y-1'>
                  <h3 className='text-lg font-semibold'>Analize Hazır</h3>
                  <p className='text-sm'>
                    Tahmin oluşturmak için soldaki parametreleri ayarlayın ve
                    "Analiz Et" butonuna tıklayın.
                  </p>
                </div>
              </div>
            </div>
          )}

            {/* NEW: Advanced Analytics Module (Decision Support) */}
            <div className='flex flex-col gap-4'>
              {/* 1. Strategic Summary Cards */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {/* Best Performing Promo Card */}
                <Card className='bg-emerald-50/50 border-emerald-100'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <span className='bg-emerald-100 text-emerald-700 p-1.5 rounded-full'>
                          <TrendingUp className='h-4 w-4' />
                        </span>
                        <span className='text-xs font-semibold text-emerald-800 uppercase tracking-tight'>
                          En İyi Performans
                        </span>
                      </div>
                      <span className='text-[10px] text-muted-foreground bg-white px-2 py-0.5 rounded-full border shadow-sm'>
                        Son 6 Ay
                      </span>
                    </div>
                    <div className='space-y-1'>
                      <div className='text-lg font-bold text-gray-900'>
                        KATALOG (Mayıs)
                      </div>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-2xl font-black text-emerald-600 tracking-tighter'>
                          142%
                        </span>
                        <span className='text-xs text-muted-foreground font-medium'>
                          ROI
                        </span>
                      </div>
                      <p className='text-emerald-700 text-xs mt-1 leading-tight'>
                        12.4k TL net kar artışı sağladı.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Risk Alert Card */}
                <Card className='bg-red-50/50 border-red-100'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <span className='bg-red-100 text-red-700 p-1.5 rounded-full'>
                          <Package className='h-4 w-4' />
                        </span>
                        <span className='text-xs font-semibold text-red-800 uppercase tracking-tight'>
                          Stok Riski Uyarısı
                        </span>
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <div className='text-lg font-bold text-gray-900'>
                        ZKAE (Haziran)
                      </div>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-2xl font-black text-red-600 tracking-tighter'>
                          3 Gün
                        </span>
                        <span className='text-xs text-muted-foreground font-medium'>
                          Stock-Out (OOS)
                        </span>
                      </div>
                      <p className='text-red-700 text-xs mt-1 leading-tight'>
                        Tahmini 4.5k TL ciro kaybı yaşandı.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmarking Card */}
                <Card className='bg-blue-50/50 border-blue-100'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <span className='bg-blue-100 text-blue-700 p-1.5 rounded-full'>
                          <BarChart3 className='h-4 w-4' />
                        </span>
                        <span className='text-xs font-semibold text-blue-800 uppercase tracking-tight'>
                          Kategori Kıyaslaması
                        </span>
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <div className='text-sm font-bold text-green-600 mt-0.5'>
                        {urunKodu.length > 0 &&
                        parseInt(urunKodu[0]) % 2 === 0
                          ? '%14.2'
                          : '%21.5'}
                      </div>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-2xl font-black text-blue-600 tracking-tighter'>
                          +15%
                        </span>
                        <span className='text-xs text-muted-foreground font-medium'>
                          Daha İyi
                        </span>
                      </div>
                      <p className='text-blue-700 text-xs mt-1 leading-tight'>
                        Benzer ürünlerin ortalama promosyon lifti %22 iken sizinki
                        %37.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 2. Middle Section: Performance Visualization */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {/* Promo Effectiveness Chart */}
                <Card className='h-full'>
                  <CardHeader className='py-3 pb-2'>
                    <CardTitle className='text-sm font-semibold'>
                      Promosyon Tipi Karşılaştırması
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Hangi yöntem daha karlı? (ROI vs Ciro Artışı)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pt-2'>
                    {/* Simplified Visualization using simple bars for now */}
                    <div className='space-y-3'>
                      {[
                        { type: 'KATALOG', roi: 95, lift: 80, color: 'bg-emerald-500' },
                        { type: 'ZKAE', roi: 45, lift: 60, color: 'bg-blue-500' },
                        { type: 'VKA0', roi: 60, lift: 40, color: 'bg-indigo-500' },
                        { type: 'GAZETE', roi: 75, lift: 70, color: 'bg-amber-500' },
                      ].map((item, i) => (
                        <div key={i} className='space-y-1'>
                          <div className='flex justify-between text-xs font-medium'>
                            <span>{item.type}</span>
                            <span className='text-muted-foreground'>
                              ROI: %{item.roi} | Lift: %{item.lift}
                            </span>
                          </div>
                          <div className='h-2 w-full bg-muted rounded-full overflow-hidden flex'>
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
                  <CardHeader className='py-3 pb-2'>
                    <CardTitle className='text-sm font-semibold'>
                      Akıllı İçgörüler & Sezonsallık
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Geçmiş verilerden çıkarımlar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pt-2'>
                    <div className='grid gap-2'>
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
                          className={`p-2.5 rounded-lg border text-xs ${
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
                <CardHeader className='py-3 pb-2 flex flex-row items-center justify-between'>
                  <div className='space-y-0.5'>
                    <CardTitle className='text-base'>
                      Detaylı Promosyon Geçmişi
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Finansal ve operasyonel metrikler
                    </CardDescription>
                  </div>
                  <div className='flex gap-2'>
                    <Button variant='outline' size='sm' className='h-7 text-xs'>
                      Filtrele
                    </Button>
                    <Button variant='outline' size='sm' className='h-7 text-xs'>
                      Dışa Aktar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='border-t'>
                    <table className='w-full text-xs text-left'>
                      <thead className='bg-muted/50 text-muted-foreground font-medium uppercase'>
                        <tr>
                          <th className='p-3 w-[120px]'>Tarih</th>
                          <th className='p-3'>Kampanya / Tip</th>
                          <th className='p-3 text-right'>Ciro Artışı (Lift)</th>
                          <th className='p-3 text-right'>Net Kar Etkisi</th>
                          <th className='p-3 text-right'>ROI %</th>
                          <th className='p-3 text-center'>Stok Durumu</th>
                          <th className='p-3 text-right'>Tahmin Doğruluğu</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {[
                          {
                            date: '12-19 Mayıs 2025',
                            name: 'Bahar Temizliği',
                            type: 'KATALOG',
                            uplift: '+42%',
                            upliftVal: '₺12.4k',
                            profit: '+₺3.2k',
                            roi: 142,
                            stock: 'OK',
                            forecast: '92%',
                          },
                          {
                            date: '05-12 Nisan 2025',
                            name: 'Ramazan Paketi',
                            type: 'ZKAE',
                            uplift: '+55%',
                            upliftVal: '₺18.1k',
                            profit: '-₺1.2k',
                            roi: -15,
                            stock: 'OOS',
                            forecast: '65%',
                          },
                          {
                            date: '10-14 Şubat 2025',
                            name: 'Sevgililer Günü',
                            type: 'VKA0',
                            uplift: '+18%',
                            upliftVal: '₺4.5k',
                            profit: '+₺0.8k',
                            roi: 45,
                            stock: 'Over',
                            forecast: '88%',
                          },
                          {
                            date: '15-20 Ocak 2025',
                            name: 'Kış İndirimi',
                            type: 'GAZETE',
                            uplift: '+30%',
                            upliftVal: '₺9.2k',
                            profit: '+₺1.5k',
                            roi: 85,
                            stock: 'OK',
                            forecast: '95%',
                          },
                        ].map((row, i) => (
                          <tr
                            key={i}
                            className='group hover:bg-muted/30 transition-colors cursor-pointer'
                          >
                            <td className='p-3 font-medium text-gray-700'>
                              {row.date}
                            </td>
                            <td className='p-3'>
                              <div className='font-semibold text-gray-900'>
                                {row.name}
                              </div>
                              <div className='text-[10px] text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded'>
                                {row.type}
                              </div>
                            </td>
                            <td className='p-3 text-right'>
                              <div className='font-bold text-gray-900'>
                                {row.uplift}
                              </div>
                              <div className='text-[10px] text-muted-foreground'>
                                {row.upliftVal}
                              </div>
                            </td>
                            <td className='p-3 text-right font-medium'>
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
                            <td className='p-3 text-right'>
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
                            <td className='p-3 text-center'>
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
                            <td className='p-3 text-right text-gray-600'>
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
      </div>
    </div>
  );
}
