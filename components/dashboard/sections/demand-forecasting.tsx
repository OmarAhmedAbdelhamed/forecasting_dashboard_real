"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, Target, Calendar, RefreshCcw,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  Cell
} from "recharts";
import { format, addWeeks, subWeeks, addDays, subDays, addMonths, subMonths, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useEffect } from "react";

// Mock Data for filters
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

// Mock Data Generators
const generateForecastData = (granularity: string, horizon: string) => {
  const data = [];
  const today = new Date();
  
  // Parse horizon to get approximate weeks
  const horizonWeeks = parseInt(horizon.split('_')[0]) || 12;
  
  let pointsHistory = 0;
  let pointsFuture = 0;
  let addFn: any = addWeeks;
  let subFn: any = subWeeks;
  let dateFormat = "d MMM";

  // Configuration based on granularity
  if (granularity === 'daily') {
    pointsHistory = horizonWeeks * 7;
    pointsFuture = horizonWeeks * 7;
    addFn = addDays;
    subFn = subDays;
    dateFormat = "d MMM";
  } else if (granularity === 'monthly') {
    pointsHistory = Math.ceil(horizonWeeks / 4) + 2; 
    pointsFuture = Math.ceil(horizonWeeks / 4) + 2;
    addFn = addMonths;
    subFn = subMonths;
    dateFormat = "MMM yy";
  } else { // weekly
    pointsHistory = horizonWeeks;
    pointsFuture = horizonWeeks;
    addFn = addWeeks;
    subFn = subWeeks;
    dateFormat = "d MMM";
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
      ...(i === pointsHistory - 1 ? { forecast: Math.round(baseVal + Math.random() * 100) } : {}), 
      confLow: isFuture ? Math.round(baseVal * 0.9) : null,
      confHigh: isFuture ? Math.round(baseVal * 1.1) : null,
    });
  }
  return data;
};

const driversData = [
  { name: "Organik Trend", value: 1540, fill: "#0f172a" },
  { name: "Mevsimsellik", value: 850, fill: "#3b82f6" },
  { name: "Promosyon Etkisi", value: 420, fill: "#eab308" },
  { name: "Fiyat Değişimi", value: -120, fill: "#ef4444" },
  { name: "Rakip Hareketi", value: -80, fill: "#f97316" },
];

const skuData = [
  { id: "SKU-001", name: "Yudum Ayçiçek Yağı 5L", forecast: 1250, trend: "+5%", acc: "96%" },
  { id: "SKU-002", name: "Çaykur Rize Turist 1kg", forecast: 980, trend: "+2%", acc: "94%" },
  { id: "SKU-003", name: "Erikli Su 5L", forecast: 850, trend: "-1%", acc: "98%" },
  { id: "SKU-004", name: "Beypazarı Soda 6'lı", forecast: 720, trend: "+12%", acc: "91%" },
  { id: "SKU-005", name: "Solo Tuvalet Kağıdı 32'li", forecast: 640, trend: "0%", acc: "95%" },
];

export function DemandForecastingSection() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0].value);
  const [selectedStore, setSelectedStore] = useState(STORES[0].value);
  const [timeHorizon, setTimeHorizon] = useState("12_weeks");
  const [granularity, setGranularity] = useState("weekly");
  const [data, setData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update data when parameters change
  useEffect(() => {
    setData(generateForecastData(granularity, timeHorizon));
  }, [granularity, timeHorizon, selectedProduct, selectedStore]);

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
    <div className="space-y-6">
      {/* 1. Header & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Talep Tahminleme</h2>
          <p className="text-muted-foreground">
            Gelecek dönem talep beklentileri ve geçmiş performans analizi.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            {/* Granularity Switch */}
            <Tabs value={granularity} onValueChange={setGranularity} className="mr-2">
                <TabsList>
                    <TabsTrigger value="daily">Günlük</TabsTrigger>
                    <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                    <TabsTrigger value="monthly">Aylık</TabsTrigger>
                </TabsList>
            </Tabs>

            <Button variant="outline" size="icon" onClick={handleRefresh} className={cn(isRefreshing && "animate-spin")}>
                <RefreshCcw className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Mağaza Kodu</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                        <SelectValue placeholder="Mağaza Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                        {STORES.map((store) => (
                            <SelectItem key={store.value} value={store.value}>{store.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Ürün Kodu</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                        <SelectValue placeholder="Ürün Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                        {PRODUCTS.map((prod) => (
                            <SelectItem key={prod.value} value={prod.value}>{prod.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Tahmin Ufku</label>
                <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                    <SelectTrigger>
                        <SelectValue placeholder="Dönem Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="4_weeks">Gelecek 4 Hafta</SelectItem>
                        <SelectItem value="8_weeks">Gelecek 8 Hafta</SelectItem>
                        <SelectItem value="12_weeks">Gelecek 12 Hafta</SelectItem>
                        <SelectItem value="26_weeks">Gelecek 6 Ay</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-end">
                <Button className="w-full" onClick={handleRefresh}>Uygula</Button>
            </div>
        </div>
      </Card>

      {/* 2. KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI_Card 
            title="Toplam Tahmin" 
            value="1.2M" 
            unit="Adet" 
            trend="+5.2%" 
            trendUp={true} 
            icon={TrendingUp} 
        />
        <KPI_Card 
            title="Doğruluk Oranı (Accuracy)" 
            value="94.8%" 
            unit="Geçen Ay" 
            trend="+1.2%" 
            trendUp={true} 
            icon={Target} 
        />
         <KPI_Card 
            title="Yıllık Büyüme (YoY)" 
            value="12.4%" 
            unit="Geçen Yıl" 
            trend="-2.1%" 
            trendUp={false} 
            icon={Calendar} 
        />
         <KPI_Card 
            title="Bias (Sapma)" 
            value="+2.3%" 
            unit="Over-forecast" 
            trend="Stabil" 
            trendUp={true} 
            icon={RefreshCcw} 
        />
      </div>

      {/* 3. Main Chart Placeholder */}
        <div className="grid gap-4 md:grid-cols-3">
        {/* Main Chart */}
        <Card className="md:col-span-2 min-h-[450px]">
            <CardHeader>
                <CardTitle>Talep Trendi ve Tahmin (12 Hafta)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="date" 
                            stroke="#6b7280" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#6b7280" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                            labelStyle={{ fontWeight: "bold", marginBottom: "4px", color: "#111827" }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        
                        {/* Confidence Interval (Area) */}
                        <Area 
                            type="monotone" 
                            dataKey="confLow" 
                            stroke="none" 
                            fill="#93c5fd" 
                            fillOpacity={0.2} 
                            name="Güven Aralığı (Alt)" 
                            legendType="none" // Hide from legend to keep clean
                        />
                        <Area 
                            type="monotone" 
                            dataKey="confHigh" 
                            stroke="none" 
                            fill="#93c5fd" 
                            fillOpacity={0.2} 
                            name="Güven Aralığı (Üst)" 
                            legendType="none" // Hide from legend to keep clean
                        />

                        {/* History Line */}
                        <Line 
                            type="monotone" 
                            dataKey="history" 
                            stroke="#64748b" 
                            strokeWidth={2} 
                            dot={{ r: 3, fill: "#64748b" }} 
                            activeDot={{ r: 5 }} 
                            name="Geçmiş Satışlar"
                        />
                        
                        {/* Forecast Line */}
                        <Line 
                            type="monotone" 
                            dataKey="forecast" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            dot={{ r: 3, fill: "#3b82f6" }} 
                            activeDot={{ r: 6 }} 
                            name="Yapay Zeka Tahmini"
                            strokeDasharray="5 5" // Dashed for forecast usually implies prediction
                        />
                        
                        <ReferenceLine x="May 10" stroke="red" label="Bugün" />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* 4. Drivers Analysis */}
        <Card className="min-h-[450px]">
            <CardHeader>
                <CardTitle>Etki Analizi (Drivers)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={driversData} margin={{ top: 20, right: 30, left: 40, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 11, fill: "#6b7280" }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            cursor={{ fill: "transparent" }}
                            contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Legend />
                        <Bar dataKey="value" name="Etki (Adet)" radius={[0, 4, 4, 0]} barSize={32}>
                            {driversData.map((entry, index) => (
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
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detaylı Ürün Bazlı Tahmin (Top 5)</CardTitle>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Tümünü Gör <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">SKU Kodu</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Ürün Adı</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Gelecek 4 Hafta</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Trend</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Model Doğruluğu</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {skuData.map((sku) => (
                                <tr key={sku.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{sku.id}</td>
                                    <td className="p-4 align-middle">{sku.name}</td>
                                    <td className="p-4 align-middle font-bold">{sku.forecast}</td>
                                    <td className={cn("p-4 align-middle", sku.trend.startsWith("+") ? "text-green-600" : (sku.trend === "0%" ? "text-muted-foreground" : "text-red-500"))}>
                                        {sku.trend}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: sku.acc }} />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{sku.acc}</span>
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

// Simple Helper Component for KPIs
function KPI_Card({ title, value, unit, trend, trendUp, icon: Icon }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span className={cn("flex items-center mr-1", trendUp ? "text-green-600" : "text-red-500")}>
                        {trendUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {trend}
                    </span>
                    {unit}
                </div>
            </CardContent>
        </Card>
    )
}
