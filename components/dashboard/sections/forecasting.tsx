"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "recharts";
import { Loader2, TrendingUp, DollarSign, Package, BarChart3, Sun, Cloud, CloudRain } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

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
  weather: "sun" | "cloud" | "rain";
}

// Dummy Data for Dropdowns
const STORES = [
  { value: "1001", label: "1001 - Akasya AVM" },
  { value: "1002", label: "1002 - Beylerbeyi Merkez" },
  { value: "1003", label: "1003 - Güngören Köy İçi" },
  { value: "1004", label: "1004 - Kadıköy Rıhtım" },
  { value: "1005", label: "1005 - Üsküdar Meydan" },
];

const PRODUCTS = [
  { value: "30000332", label: "30000332 - Yudum Ayçiçek Yağı 5L" },
  { value: "30045925", label: "30045925 - Lipton Yellow Label 1kg" },
  { value: "30431002", label: "30431002 - Solo Tuvalet Kağıdı 32li" },
  { value: "30008788", label: "30008788 - Pınar Süt 1L" },
  { value: "30047778", label: "30047778 - Nutella 750g" },
];

const PROMOTIONS = [
  { value: "KATALOG", label: "KATALOG (Genel İndirim)" },
  { value: "ZKAE", label: "ZKAE (Kasa Arkası)" },
  { value: "VKA0", label: "VKA0 (Çoklu Alım)" },
  { value: "GAZETE", label: "GAZETE İLANI" },
  { value: "50TL_OP", label: "50 TL üzeri Operasyon" },
];

// Custom X-Axis Tick Component for Weather
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  const dateStr = payload.value;
  const dayData = data.find((d: any) => d.tarih === dateStr);
  const weather = dayData?.weather;

  const Icon = weather === "rain" ? CloudRain : weather === "cloud" ? Cloud : Sun;
  const color = weather === "rain" ? "#60a5fa" : weather === "cloud" ? "#94a3b8" : "#fbbf24";

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Weather Icon - Centered close to axis */}
      <foreignObject x={-8} y={10} width={16} height={16}>
        <div className="flex items-center justify-center">
          <Icon size={14} color={color} />
        </div>
      </foreignObject>
      
      {/* Date Text - Rotated Diagonally */}
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="end" 
        fill="#666" 
        fontSize={10} 
        transform="rotate(-45) translate(-10, 20)"
      >
        {format(new Date(dateStr), "dd MMM")}
      </text>
    </g>
  );
};

export function ForecastingSection() {
  // Inputs
  const [magazaKodu, setMagazaKodu] = useState("1001");
  const [urunKodu, setUrunKodu] = useState("30000332");
  
  const [startDate, setStartDate] = useState<Date | undefined>(new Date("2026-01-06"));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date("2026-01-14"));
  
  const [startPromosyon, setStartPromosyon] = useState<Date | undefined>(new Date("2026-01-08"));
  const [endPromosyon, setEndPromosyon] = useState<Date | undefined>(new Date("2026-01-11"));
  
  const [promosyon, setPromosyon] = useState("KATALOG");
  const [promosyonIndirimOrani, setPromosyonIndirimOrani] = useState("9");

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);

  const handleAnalyze = async () => {
    if (!startDate || !endDate) return;
    
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

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
      const lift = isPromoActive ? (1 + discount / 100) : 1; 
      const tahminVal = Math.round(baseForecast * lift);
      const baseline = baseForecast;
      
      // Secondary metric (Yellow line)
      const ciro_adedi = Math.floor(Math.random() * 10) + 5 + (isPromoActive ? 5 : 0);

      const ciro = tahminVal * baseSatisFiyati;
      const stok = 3800 - (i * 55); 
      const gunluk_kar = tahminVal * birimKar;

      // Random weather
      const weatherRoll = Math.random();
      const weather = weatherRoll > 0.7 ? "rain" : weatherRoll > 0.4 ? "cloud" : "sun";

      data.push({
        tarih: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
        baseline: createSpecificPattern(i, days, baseline),
        tahmin: isPromoActive ? createSpecificPattern(i, days, tahminVal) : null, // Only show if promo active
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
        weather: weather
      });
    }

    setForecastData(data);
    setIsLoading(false);
  };

  const createSpecificPattern = (index: number, total: number, base: number) => {
    if (index % 7 === 5 || index % 7 === 6) return Math.round(base * 1.2); 
    return base;
  };

  const totalForecast = forecastData?.reduce((acc, curr) => acc + (curr.tahmin || 0), 0) || 0;
  const totalRevenue = forecastData?.reduce((acc, curr) => acc + curr.ciro, 0) || 0;
  const avgLift = 12.5;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Fiyatlandırma ve Promosyon Analizi</h2>
        <p className="text-sm text-muted-foreground">
          Promosyonların talep, ciro ve stok üzerindeki etkisini simüle edin.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Left Column: Inputs */}
        <Card className="lg:col-span-4 h-fit">
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Konfigürasyon</CardTitle>
            <CardDescription>Analiz parametrelerini giriniz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pb-3">
            
            <div className="space-y-1">
              <Label className="text-xs">Mağaza Kodu</Label>
              <Select value={magazaKodu} onValueChange={setMagazaKodu}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Mağaza Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((store) => (
                    <SelectItem key={store.value} value={store.value}>
                      {store.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ürün Kodu</Label>
              <Select value={urunKodu} onValueChange={setUrunKodu}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Ürün Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tahminleme Tarih Aralığı</Label>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker date={startDate} setDate={setStartDate} placeholder="Başlangıç" className="h-8 text-sm" />
                <DatePicker date={endDate} setDate={setEndDate} placeholder="Bitiş" className="h-8 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Promosyon Tarih Aralığı</Label>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker date={startPromosyon} setDate={setStartPromosyon} placeholder="Başlangıç" className="h-8 text-sm" />
                <DatePicker date={endPromosyon} setDate={setEndPromosyon} placeholder="Bitiş" className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Promosyon Seçimi</Label>
                <Select value={promosyon} onValueChange={setPromosyon}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Promo Seç" />
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
              <div className="space-y-1">
                <Label className="text-xs">İndirim Oranı (%)</Label>
                <Input type="number" className="h-8 text-sm" value={promosyonIndirimOrani} onChange={(e) => setPromosyonIndirimOrani(e.target.value)} />
              </div>
            </div>

            <Button 
              className="w-full mt-2 h-9" 
              onClick={handleAnalyze} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                "Analiz Et"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-8 space-y-2">
          {forecastData ? (
            <>
              {/* Summary Stats */}
              <div className="grid gap-2 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 py-3">
                    <CardTitle className="text-sm font-medium">Toplam Hacim</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">{totalForecast.toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground">Tahmini Satış Adedi</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 py-3">
                    <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">₺{(totalRevenue / 1000).toFixed(1)}k</div>
                    <p className="text-[10px] text-muted-foreground">Tahmini Gelir</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 py-3">
                    <CardTitle className="text-sm font-medium">Promosyon Artışı</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">+{avgLift}%</div>
                    <p className="text-[10px] text-muted-foreground">Temel Satışa Göre</p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Chart */}
              <Card className="relative">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 py-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">Tahmin vs Temel Satış</CardTitle>
                    <CardDescription className="text-xs">
                      Temel satışlara kıyasla promosyon etkisi.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pl-0 pb-4 px-4 pt-2">
                  
                  {/* Custom Legend Box - Moved Inside Content */}
                  <div className="absolute top-2 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-md border border-border/50 shadow-sm z-10 text-[10px] space-y-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#FFB840] font-bold">Sarı:</span>
                      <span className="text-muted-foreground font-medium">Ciro Adedi</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#0D1E3A] font-bold">Lacivert:</span>
                      <span className="text-muted-foreground font-medium">Temel Tahmini Ciro</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#22c55e] font-bold">Yeşil:</span>
                      <span className="text-muted-foreground font-medium">Promosyon Dönemi Ciro</span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={380} className="w-full">
                    <ComposedChart data={forecastData} margin={{ bottom: 60, top: 10, right: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="glowGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      
                      {/* Highlight Promo Period */}
                       {startPromosyon && endPromosyon && (
                        <ReferenceArea 
                          x1={format(startPromosyon, "yyyy-MM-dd'T'00:00:00")} 
                          x2={format(endPromosyon, "yyyy-MM-dd'T'00:00:00")} 
                          fill="#22c55e" 
                          fillOpacity={0.1}
                          ifOverflow="extendDomain"
                        />
                      )}

                      <XAxis 
                        dataKey="tarih" 
                        stroke="var(--muted-foreground)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        interval={0}
                        tick={<CustomizedAxisTick data={forecastData} />}
                        height={80}
                      />
                      <YAxis 
                        stroke="var(--muted-foreground)" 
                        strokeWidth={0}
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`} 
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#FFFFFF", 
                          borderColor: "var(--border)",
                          color: "#0D1E3A",
                          borderRadius: "var(--radius)",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                        labelFormatter={(value) => format(new Date(value), "PPP")}
                        formatter={(value: number, name: string) => {
                          if (name === "tahmin") return [value, "Promosyon Tahmini (Adet)"];
                          if (name === "baseline") return [value, "Temel Satış (Adet)"];
                          if (name === "ciro_adedi") return [value, "Ciro Adedi"];
                          return [value, name];
                        }}
                      />
                      
                      {/* Lines */}
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke="#0D1E3A"
                        strokeWidth={2}
                        dot={false}
                        name="Baseline Forecast"
                      />
                      <Line
                        type="monotone"
                        dataKey="tahmin"
                        stroke="#22c55e"
                        strokeWidth={4}
                        dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        name="Promo Forecast"
                        connectNulls={false}
                      />
                       <Line
                        type="monotone"
                        dataKey="ciro_adedi"
                        stroke="#FFB840"
                        strokeWidth={2}
                        dot={false}
                        name="Revenue Count"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-[350px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground p-12 text-center bg-muted/20">
              <div className="space-y-3">
                <BarChart3 className="mx-auto h-12 w-12 opacity-50" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Analize Hazır</h3>
                  <p className="text-sm">Tahmin oluşturmak için soldaki parametreleri ayarlayın ve "Analiz Et" butonuna tıklayın.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
