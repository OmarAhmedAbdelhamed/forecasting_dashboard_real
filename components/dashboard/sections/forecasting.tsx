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

// Permissions imports
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import type { UserRole } from '@/types/auth';

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
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  Bar,
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
  Sparkles,
  Calendar as CalendarIcon,
  HardDriveDownload,
  Copy,
  Eye,
  ZoomIn,
  ZoomOut,
  Flag,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
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
  type SimilarCampaign,
} from '@/data/mock-data';
import { ExportPromotionModal } from '@/components/dashboard/modals/export-promotion-modal';
import { CampaignCreationModal } from '@/components/dashboard/modals/campaign-creation-modal';
import { PromotionCalendar } from '@/components/dashboard/visualizations/promotion-calendar';
import { useToast } from '@/components/ui/shared/use-toast';
import {
  usePromotionHistory,
  usePromotionCalendar,
  useSimilarCampaigns,
} from '@/services';
import type {
  SimilarCampaign as ApiSimilarCampaign,
  PromotionHistory as ApiPromotionHistory,
} from '@/services/types/api';

// Custom X-Axis Tick Component for Weather
const CustomizedAxisTick = (props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  data: ForecastData[];
  fontSize?: number;
}) => {
  const { x, y, payload, data, fontSize } = props;
  if (!payload) return null;
  const dateStr = payload.value;
  const dayData = data.find((d) => d.tarih === dateStr);
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
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
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
        {dateStr ? format(new Date(dateStr), 'dd MMM') : ''}
      </text>
    </g>
  );
};

type PromotionHistoryRow = {
  date: string;
  name: string;
  type: string;
  uplift: string;
  upliftVal: string;
  profit: string;
  roi: number;
  stock: 'OK' | 'OOS' | 'Over';
  forecast: string;
  stockCostIncrease: string;
  lostSalesVal: string;
  status: 'draft' | 'pending' | 'approved' | 'completed';
};

const BACKEND_PROMO_TO_UI: Record<string, string> = {
  HYBR: 'INTERNET_INDIRIMI',
  KATALOG: 'ALISVERIS_INDIRIMI_500',
  'GAZETE ILANI': 'OZEL_GUN_INDIRIMI',
  LEAFLET: 'COKLU_ALIM',
};

const formatCurrencyCompact = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '+';
  if (abs >= 1000) {
    return `${sign}₺${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}₺${Math.round(abs)}`;
};

const mapCampaignFromApi = (campaign: ApiSimilarCampaign): SimilarCampaign => {
  const roiBase = Math.max(1, Math.abs(campaign.markdownCost));
  const roi = Math.round(((campaign.actualRevenue - campaign.targetRevenue) / roiBase) * 100);

  return {
    ...campaign,
    roi,
    status: 'completed',
    type: BACKEND_PROMO_TO_UI[campaign.type] || campaign.type,
  };
};

const mapHistoryFromApi = (item: ApiPromotionHistory): PromotionHistoryRow => {
  const stock = item.stock === 'OOS' ? 'OOS' : 'OK';
  const status = item.forecast > 0 ? 'completed' : 'approved';
  const stockCostIncrease = item.stockCostIncrease ?? 0;
  const lostSalesVal = item.lostSalesVal ?? 0;
  const upliftVal = item.upliftVal ?? 0;
  const profit = item.profit ?? 0;

  return {
    date: item.date,
    name: item.name,
    type: BACKEND_PROMO_TO_UI[item.type] || item.type,
    uplift: `${item.uplift >= 0 ? '+' : ''}${item.uplift.toFixed(1)}%`,
    upliftVal: `₺${(upliftVal / 1000).toFixed(1)}k`,
    profit: formatCurrencyCompact(profit),
    roi: stockCostIncrease !== 0 ? Math.round((profit / Math.abs(stockCostIncrease)) * 100) : 0,
    stock,
    forecast: `${item.forecast}%`,
    stockCostIncrease: `₺${Math.round(stockCostIncrease)}`,
    lostSalesVal: `₺${Math.round(lostSalesVal)}`,
    status,
  };
};

const mapFutureRowsFromCalendar = (events: { date: string; promotions: { id: string; name: string; type: string; discount: number | null }[] }[]) => {
  const now = new Date();
  return events
    .filter((event) => new Date(event.date) >= now)
    .flatMap((event) =>
      event.promotions.map((promotion) => ({
        date: format(new Date(event.date), 'dd-MM-yyyy'),
        name: promotion.name,
        type: BACKEND_PROMO_TO_UI[promotion.type] || promotion.type,
        uplift: promotion.discount !== null ? `+%${Math.max(0, promotion.discount)}` : '--',
        upliftVal: '--',
        profit: '--',
        roi: 0,
        stock: 'OK' as const,
        forecast: '--',
        stockCostIncrease: '--',
        lostSalesVal: '--',
        status: 'pending' as const,
      })),
    );
};

export function ForecastingSection() {
  // Permissions hook
  const {
    dataScope,
    roleConfig,
    hasAnyRole,
    hasRole,
    isLoading: permissionsLoading,
  } = usePermissions();

  // Visibility hook for role-based UI control
  const { canSeeKpi, canSeeChart, canSeeTable, canSeeAction } =
    useVisibility('pricing-promotion');

  // Filter options based on permissions
  const filteredRegions = useMemo(() => {
    if (dataScope.regions.length > 0) {
      return REGIONS.filter((r) => dataScope.regions.includes(r.value));
    }
    return REGIONS;
  }, [dataScope.regions]);

  const filteredStores = useMemo(() => {
    if (dataScope.stores.length > 0) {
      return STORES.filter((s) => dataScope.stores.includes(s.value));
    }
    return STORES;
  }, [dataScope.stores]);

  const filteredCategories = useMemo(() => {
    if (dataScope.categories.length > 0) {
      return CATEGORIES.filter((c) => dataScope.categories.includes(c.value));
    }
    return CATEGORIES;
  }, [dataScope.categories]);

  const filteredProducts = useMemo(() => {
    // Products could potentially be filtered by category if we wanted dependency
    return PRODUCTS;
  }, []);

  // Inputs
  const [magazaKodu, setMagazaKodu] = useState<string[]>([]);
  const [bolge, setBolge] = useState<string[]>([]);
  const [reyon, setReyon] = useState<string[]>([]);
  const [urunKodu, setUrunKodu] = useState<string[]>([]);

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

  // Base values (Component Scope)
  const baseSatisFiyati = 87.45;
  const baseHamFiyat = 67.67;
  const birimKar = baseSatisFiyati - baseHamFiyat;
  const marj = (birimKar / baseSatisFiyati) * 100;

  // NEW STATES
  const [pricingMode, setPricingMode] = useState<'discount' | 'price'>(
    'discount',
  );
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [budgetMode, setBudgetMode] = useState<'budget' | 'units'>('budget');
  const [isZoomed, setIsZoomed] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);

  // Screen size detection for responsive charts
  const [is2xl, setIs2xl] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'calendar'>('chart');

  // Similar Campaign Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<SimilarCampaign | null>(null);
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<
    'all' | 'draft' | 'pending' | 'approved' | 'completed'
  >('all');
  const [trackingTypeFilter, setTrackingTypeFilter] = useState('all');

  const { toast } = useToast();

  const numericStoreIds = useMemo(
    () => magazaKodu.filter((value) => /^\d+$/.test(value)),
    [magazaKodu],
  );

  const numericProductIds = useMemo(
    () => urunKodu.filter((value) => /^\d+$/.test(value)),
    [urunKodu],
  );

  const effectiveStoreIds =
    numericStoreIds.length > 0 ? numericStoreIds : ['1054'];
  const effectiveProductIds =
    numericProductIds.length > 0 ? numericProductIds : ['30389579'];

  const historyParams = useMemo(
    () => ({
      productIds: effectiveProductIds,
      storeIds: effectiveStoreIds,
      limit: 40,
      enabled: true,
    }),
    [effectiveProductIds, effectiveStoreIds],
  );

  const similarCampaignParams = useMemo(
    () => ({
      productIds: effectiveProductIds,
      limit: 20,
      enabled: true,
    }),
    [effectiveProductIds],
  );

  const calendarParams = useMemo(
    () => ({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      storeIds: effectiveStoreIds,
      includeFuture: true,
      futureCount: 18,
      enabled: true,
    }),
    [effectiveStoreIds],
  );

  const promotionHistoryQuery = usePromotionHistory(historyParams);
  const similarCampaignsQuery = useSimilarCampaigns(similarCampaignParams);
  const promotionCalendarQuery = usePromotionCalendar(calendarParams);

  const backendSimilarCampaigns = useMemo(
    () =>
      (similarCampaignsQuery.data?.campaigns || []).map((campaign) =>
        mapCampaignFromApi(campaign),
      ),
    [similarCampaignsQuery.data?.campaigns],
  );

  const filteredCampaigns = useMemo(() => {
    const selectedType = promosyon;
    const matches = backendSimilarCampaigns.filter(
      (campaign) => campaign.type === selectedType,
    );
    return matches.length > 0 ? matches : backendSimilarCampaigns;
  }, [backendSimilarCampaigns, promosyon]);

  const historyRows = useMemo(
    () =>
      (promotionHistoryQuery.data?.history || []).map((item) =>
        mapHistoryFromApi(item),
      ),
    [promotionHistoryQuery.data?.history],
  );

  const futureRows = useMemo(
    () => mapFutureRowsFromCalendar(promotionCalendarQuery.data?.events || []),
    [promotionCalendarQuery.data?.events],
  );

  const trackingRows = useMemo(() => {
    const rows = [...futureRows, ...historyRows];
    return rows.sort((a, b) => {
      const statusOrder = {
        pending: 0,
        draft: 1,
        approved: 2,
        completed: 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [futureRows, historyRows]);

  const trackingTypeOptions = useMemo(() => {
    return Array.from(new Set(trackingRows.map((row) => row.type))).sort();
  }, [trackingRows]);

  const filteredTrackingRows = useMemo(() => {
    const query = trackingSearch.trim().toLowerCase();

    return trackingRows.filter((row) => {
      if (trackingStatusFilter !== 'all' && row.status !== trackingStatusFilter) {
        return false;
      }

      if (trackingTypeFilter !== 'all' && row.type !== trackingTypeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${row.name} ${row.type} ${row.date}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [trackingRows, trackingSearch, trackingStatusFilter, trackingTypeFilter]);

  const openCampaignDetail = (row: PromotionHistoryRow) => {
    const upliftMatch = row.uplift.match(/-?\d+(\.\d+)?/);
    const uplift = upliftMatch ? Number(upliftMatch[0]) : 0;
    const targetRevenue = 100000;
    const actualRevenue =
      row.status === 'completed'
        ? Math.round(targetRevenue * (1 + uplift / 100))
        : 0;

    setSelectedCampaign({
      id: `row-${row.name}-${row.date}`,
      name: row.name,
      date: row.date,
      type: row.type,
      similarityScore: row.status === 'completed' ? 85 : 70,
      lift: uplift,
      roi: row.roi,
      targetRevenue,
      actualRevenue,
      plannedStockDays: 14,
      actualStockDays: row.stock === 'OOS' ? 10 : 14,
      stockOutDays: row.stock === 'OOS' ? 2 : 0,
      sellThrough: row.stock === 'OOS' ? 100 : 85,
      markdownCost: Number(row.stockCostIncrease.replace(/[^0-9.-]/g, '')) || 0,
      status: row.status,
    });

    setIsDetailModalOpen(true);
  };

  const modalData = useMemo(() => {
    if (!selectedCampaign) {
      return null;
    }

    const targetRevenue = selectedCampaign.targetRevenue || 0;
    const actualRevenue = selectedCampaign.actualRevenue || 0;
    const achievementPct =
      targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0;
    const isOOS = selectedCampaign.stockOutDays > 0;
    const markdownCost = Math.abs(selectedCampaign.markdownCost || 0);
    const sellThrough = Math.max(0, Math.min(100, selectedCampaign.sellThrough || 0));
    const plannedDays = Math.max(1, selectedCampaign.plannedStockDays || 1);
    const actualDays = Math.max(0, selectedCampaign.actualStockDays || 0);

    const completedChartData = Array.from({ length: 7 }, (_, index) => {
      const day = `Gn ${index + 1}`;
      const base = targetRevenue / 7;
      const actual = actualRevenue / 7;
      const wave = 1 + Math.sin((index / 6) * Math.PI) * 0.18;
      return {
        day,
        baseline: Math.round(base * (0.92 + index * 0.01)),
        actual: Math.round(actual * wave),
      };
    });

    const futureChartData = Array.from({ length: 7 }, (_, index) => {
      const day = `Gn ${index + 1}`;
      const base = targetRevenue / 7;
      const liftRatio = 1 + (selectedCampaign.lift || 0) / 100;
      const forecast = base * liftRatio * (0.94 + index * 0.012);
      const stockBase = (targetRevenue / plannedDays) * (1.28 - index * 0.07);
      return {
        day,
        baseline: Math.round(base * (0.95 + index * 0.01)),
        forecast: Math.round(forecast),
        stock: Math.max(0, Math.round(stockBase)),
      };
    });

    return {
      achievementPct,
      isOOS,
      markdownCost,
      sellThrough,
      plannedDays,
      actualDays,
      completedChartData,
      futureChartData,
      liftValue: Math.max(0, actualRevenue - targetRevenue),
      stockCoveragePct: plannedDays > 0 ? Math.min(100, (actualDays / plannedDays) * 100) : 0,
    };
  }, [selectedCampaign]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIs2xl(window.innerWidth >= 1536); // 2xl breakpoint
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
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
    if (!startDate || !endDate) {
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulation Logic
    const data: ForecastData[] = [];
    const days = differenceInDays(endDate, startDate) + 1;

    // Base values
    // Base values - Moved out for shared access if needed, or kept here but consistent
    // Base values - Moved to component scope

    // Determine discount based on mode
    let discount = 0;
    if (pricingMode === 'price' && targetPrice) {
      discount =
        ((baseSatisFiyati - parseFloat(targetPrice)) / baseSatisFiyati) * 100;
      // Safety check
      if (discount < 0) {
        discount = 0;
      }
    } else {
      discount = parseFloat(promosyonIndirimOrani) || 0;
    }

    // Initialize Stock (Mock) - 4-digit sales (Units)
    let currentStock = 300;

    for (let i = 0; i < days; i++) {
      // Restock every 3 days (simulated delivery)
      if (i > 0 && i % 2 === 0) {
        currentStock += 350;
      }

      const currentDate = addDays(startDate, i);

      // Check if current date is within promo range
      let isPromoActive = false;
      if (startPromosyon && endPromosyon) {
        if (currentDate >= startPromosyon && currentDate <= endPromosyon) {
          isPromoActive = true;
        }
      }

      // 1. Calculate Unconstrained Demand (Potansiyel Talep)
      // Base forecast in UNITS (approx 170 units * 87.45 TL ~= 14,800 TL -> 5 digits)
      const baseForecast = 140 + Math.floor(Math.random() * 40);
      const patternBase = createSpecificPattern(i, days, baseForecast);

      // Values in Revenue (TL) for Chart

      const lift = isPromoActive ? 1 + discount / 100 : 1;
      const dailyDemand = Math.round(patternBase * lift); // This is what customers WANT to buy (Units)

      // 2. Apply Constraints (Stock)
      let actualSales = dailyDemand;
      let lostSales = 0;

      if (currentStock < dailyDemand) {
        actualSales = currentStock; // Sell whatever is left
        lostSales = dailyDemand - actualSales; // The rest is lost
      }

      // 3. Update Stock
      currentStock = Math.max(0, currentStock - actualSales);

      // Secondary metric (Yellow line visual logic)
      const ciro_adedi = 0;

      const finalTahmin = actualSales;
      const ciro = finalTahmin * baseSatisFiyati;
      const gunluk_kar = finalTahmin * birimKar;

      // Random weather
      const weatherRoll = Math.random();
      const weather =
        weatherRoll > 0.7 ? 'rain' : weatherRoll > 0.4 ? 'cloud' : 'sun';

      data.push({
        tarih: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
        baseline: parseFloat(patternBase.toFixed(0)), // Units
        tahmin: isPromoActive ? parseFloat(finalTahmin.toFixed(0)) : null, // Units
        unconstrained_demand:
          lostSales > 0 ? parseFloat(dailyDemand.toFixed(0)) : null, // Units (Potential Sales)
        lost_sales: lostSales,
        ciro_adedi: ciro_adedi,
        benim_promom: isPromoActive ? [promosyon] : [],
        benim_promom_yuzde: isPromoActive ? discount : 0,
        ciro: parseFloat(ciro.toFixed(2)),
        stok: currentStock, // Yellow line (Actual Stock)
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
    if (index % 7 === 5 || index % 7 === 6) {
      return Math.round(base * 1.2);
    }
    return base;
  };

  // FILTER DATA FOR ROI & STOCK CALCULATIONS (Based on Promo Period)
  const promoPeriodData = useMemo(() => {
    if (!forecastData || !startPromosyon || !endPromosyon) return [];
    return forecastData.filter((d) => {
      const date = new Date(d.tarih);
      return date >= startPromosyon && date <= endPromosyon;
    });
  }, [forecastData, startPromosyon, endPromosyon]);

  const totalForecast =
    promoPeriodData?.reduce((acc, curr) => acc + (curr.tahmin || 0), 0) || 0;

  // Calculate potential forecast (unconstrained)

  const totalRevenue =
    promoPeriodData?.reduce((acc, curr) => acc + curr.ciro, 0) || 0;

  // Financial Logic
  // baseHamFiyat and baseSatisFiyati are now in component scope

  // Calculate directly from unit-based lost_sales property (Filtered by Promo Period)
  const totalLostSalesUnits =
    promoPeriodData?.reduce((acc, curr) => acc + (curr.lost_sales || 0), 0) ||
    0;

  // Calculate Revenue Loss
  const estimatedRevenueLoss = totalLostSalesUnits * baseSatisFiyati;

  // Calculate Baseline Revenue (since baseline in chart is now Units)
  // We need to re-calculate it or derive it
  const totalBaselineUnits = forecastData
    ? forecastData.reduce((acc, curr) => acc + (curr.baseline || 0), 0)
    : 0;
  const totalBaselineRevenue = totalBaselineUnits * baseSatisFiyati;

  // 1. Lift Calculation
  const liftAmount = totalRevenue - totalBaselineRevenue;
  const liftPercentage =
    totalBaselineRevenue > 0 ? (liftAmount / totalBaselineRevenue) * 100 : 0;

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

          <div className='flex items-center gap-2'>
            <Button
              disabled={!forecastData}
              className={`h-9 2xl:h-10 text-xs 2xl:text-sm shadow-sm transition-all ${forecastData ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-muted text-muted-foreground'}`}
              onClick={() => setIsPlanningModalOpen(true)}
            >
              <Plus className='w-4 h-4 mr-1.5' />
              Kampanyayı Oluştur
            </Button>

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
                  options={filteredRegions}
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
                  options={filteredStores}
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
                  options={filteredCategories}
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
                  options={filteredProducts}
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
                  onValueChange={(v) => {
                    setPricingMode(v as 'discount' | 'price');
                  }}
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

              <div className='bg-muted/30 p-2 rounded-lg border space-y-2 mt-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1'>
                    <Label className='text-[10px] 2xl:text-xs font-semibold'>
                      Kısıtlar & Bütçe
                    </Label>
                    <UITooltip>
                      <UITooltipTrigger>
                        <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                      </UITooltipTrigger>
                      <UITooltipContent>
                        <p>Kampanya bütçesi veya hedef satış adedi.</p>
                      </UITooltipContent>
                    </UITooltip>
                  </div>
                </div>

                <div className='flex bg-muted rounded-md p-0.5 h-6'>
                  <button
                    onClick={() => setBudgetMode('budget')}
                    className={`flex-1 text-[9px] rounded-sm font-medium transition-all ${
                      budgetMode === 'budget'
                        ? 'bg-white shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Bütçe (TL)
                  </button>
                  <button
                    onClick={() => setBudgetMode('units')}
                    className={`flex-1 text-[9px] rounded-sm font-medium transition-all ${
                      (budgetMode as string) === 'units'
                        ? 'bg-white shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Adet
                  </button>
                </div>

                <Input
                  type='number'
                  placeholder={
                    budgetMode === 'budget' ? 'Örn: 50000 TL' : 'Örn: 1000 Adet'
                  }
                  className='h-7 2xl:h-9 text-xs'
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />

                {budget && parseFloat(budget) > 0 && (
                  <div className='text-[10px] text-muted-foreground px-1'>
                    {budgetMode === 'budget' ? (
                      <span>
                        ~
                        {Math.round(
                          parseFloat(budget) / baseHamFiyat,
                        ).toLocaleString()}{' '}
                        adet ürün (Maliyet: {baseHamFiyat} TL)
                      </span>
                    ) : (
                      <span>
                        ~{(parseFloat(budget) * baseHamFiyat).toLocaleString()}{' '}
                        TL bütçe gereksinimi
                      </span>
                    )}
                  </div>
                )}
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
                  Geçmiş Deneyimler
                </CardTitle>
                <UITooltip>
                  <UITooltipTrigger>
                    <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                  </UITooltipTrigger>
                  <UITooltipContent>
                    <p>
                      Önceki kampanyaların başarı ve başarısızlık analizleri.
                    </p>
                  </UITooltipContent>
                </UITooltip>
              </div>
              <CardDescription className='text-[10px]'>
                Başarı Hikayeleri & Fırsatlar
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2 p-3'>
              <Tabs defaultValue='success' className='w-full'>
                <TabsList className='grid w-full grid-cols-2 mb-2'>
                  <TabsTrigger
                    value='success'
                    className='text-[10px] 2xl:text-xs h-7 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700'
                  >
                    Başarı Hikayeleri
                  </TabsTrigger>
                  <TabsTrigger
                    value='failure'
                    className='text-[10px] 2xl:text-xs h-7 data-[state=active]:bg-red-50 data-[state=active]:text-red-700'
                  >
                    Kayıp Fırsatlar
                  </TabsTrigger>
                </TabsList>

                {['success', 'failure'].map((tab) => (
                  <TabsContent key={tab} value={tab} className='space-y-2 mt-0'>
                    {similarCampaignsQuery.isLoading ? (
                      <div className='text-center text-[10px] text-muted-foreground py-4'>
                        Geçmiş deneyim verisi yükleniyor...
                      </div>
                    ) : (
                      <>
                        {filteredCampaigns
                          .filter((c) => {
                            const isSuccess =
                              c.actualRevenue / c.targetRevenue >= 0.95 &&
                              Math.abs(c.plannedStockDays - c.actualStockDays) <=
                                3;
                            if (tab === 'success') return isSuccess;
                            return !isSuccess;
                          })
                          .map((camp) => {
                            const achievement =
                              (camp.actualRevenue / camp.targetRevenue) * 100;
                            const isStockIssue =
                              camp.stockOutDays > camp.plannedStockDays / 2;

                            return (
                              <div
                                key={camp.id}
                                className={`bg-white border rounded-lg p-2 hover:shadow-sm transition-shadow ${tab === 'success' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'}`}
                              >
                                <div className='flex justify-between items-start mb-1'>
                                  <div>
                                    <div className='font-semibold text-xs text-indigo-950'>
                                      {camp.name}
                                    </div>
                                    <div className='text-[10px] text-muted-foreground'>
                                      {camp.date}
                                    </div>
                                  </div>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-5 w-5'
                                    onClick={() => {
                                      setSelectedCampaign(camp);
                                      setIsDetailModalOpen(true);
                                    }}
                                  >
                                    <Eye className='h-3 w-3 text-muted-foreground' />
                                  </Button>
                                </div>

                                <div className='flex items-center gap-2 mt-2'>
                                  {tab === 'success' ? (
                                    <span className='text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full'>
                                      %{achievement.toFixed(0)} Hedef Tutma
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isStockIssue ? 'text-red-700 bg-red-50' : 'text-orange-700 bg-orange-50'}`}
                                    >
                                      {isStockIssue
                                        ? 'Erken Tükendi (OOS)'
                                        : `%${achievement.toFixed(0)} Hedef Altı`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {filteredCampaigns.filter((c) => {
                          const isSuccess =
                            c.actualRevenue / c.targetRevenue >= 0.95 &&
                            Math.abs(c.plannedStockDays - c.actualStockDays) <=
                              3;
                          if (tab === 'success') return isSuccess;
                          return !isSuccess;
                        }).length === 0 && (
                          <div className='text-center text-[10px] text-muted-foreground py-4'>
                            {tab === 'success'
                              ? 'Kriterlere uygun başarı hikayesi bulunamadı.'
                              : 'Kayıp fırsat bulunamadı.'}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
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
                    className='flex items-center justify-between p-2 rounded-lg border bg-white hover:shadow-sm transition-shadow cursor-default group'
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
            {canSeeKpi('promo-total-forecast') && (
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
            )}

            {canSeeKpi('promo-expected-revenue') && (
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
            )}

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1 py-2 2xl:py-3'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-xs 2xl:text-sm font-semibold'>
                    Ciro Artışı (Lift)
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground hover:text-indigo-600 transition-colors' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p className='max-w-xs'>
                        Promosyonun sağladığı ekstra ciro. (Beklenen - Temel)
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <TrendingUp className='h-3 w-3 2xl:h-4 2xl:w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent className='pb-2 2xl:pb-3'>
                <div className='text-lg 2xl:text-xl font-bold'>
                  {isLoading ? '-' : `₺${(liftAmount / 1000).toFixed(1)}k`}
                </div>
                <div className='flex items-center gap-2 mt-0.5 text-[10px] 2xl:text-xs'>
                  <span
                    className={`font-medium ${liftPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {liftPercentage > 0 ? '+' : ''}%{liftPercentage.toFixed(1)}
                  </span>
                  <span className='text-muted-foreground'>
                    Temel Satışa Göre
                  </span>
                </div>
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
                  className={`text-lg 2xl:text-xl font-bold ${totalLostSalesUnits > 0 ? 'text-red-600' : 'text-emerald-600'}`}
                >
                  {totalLostSalesUnits > 0 ? 'Riskli' : 'Güvenli'}
                </div>
                <p className='text-[10px] 2xl:text-xs text-muted-foreground'>
                  {totalLostSalesUnits > 0
                    ? `-${totalLostSalesUnits} OOS`
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
                onClick={() => {
                  setViewMode('chart');
                }}
              >
                <LayoutGrid className='h-3.5 w-3.5' /> Grafik
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs gap-2'
                onClick={() => {
                  setViewMode('calendar');
                }}
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
                    <div className='flex items-center gap-1.5'>
                      <span className='w-2 h-2 rounded-full bg-[#FFB840]' />
                      <span className='text-muted-foreground font-medium'>
                        Stok Adedi
                      </span>
                    </div>

                    {/* Zoom Controls */}
                    <div className='flex items-center gap-1 ml-2 border-l pl-3'>
                      <span className='text-[10px] text-muted-foreground mr-1'>
                        Zoom:
                      </span>
                      <Button
                        variant='outline'
                        size='icon'
                        className={`h-6 w-6 ${isZoomed ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}`}
                        onClick={() => setIsZoomed(true)}
                        title='Yaklaş (Scroll)'
                      >
                        <ZoomIn className='h-3 w-3' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        className={`h-6 w-6 ${!isZoomed ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}`}
                        onClick={() => setIsZoomed(false)}
                        title='Sığdır'
                      >
                        <ZoomOut className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='pl-0 pb-2 px-2 pt-2 2xl:pb-4'>
                  <div className='w-full overflow-x-auto pb-1'>
                    <div
                      className={`transition-all duration-300 ease-in-out ${isZoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{
                        width: isZoomed ? '200%' : '100%',
                        minWidth: isZoomed ? '1200px' : '100%',
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
                                data={forecastData || []}
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
                              if (name === 'tahmin') {
                                return [value, 'Promosyon Tahmini (Adet)'];
                              }
                              if (name === 'baseline')
                                return [value, 'Temel Satış (Adet)'];
                              if (name === 'stok' || name === 'Stok Adedi')
                                return [value, 'Stok Adedi'];
                              if (name === 'unconstrained_demand')
                                return [value, 'Potansiyel Talep (Adet)'];
                              if (name === 'lost_sales' && value > 0) {
                                return [value, 'Kaçırılan Satış'];
                              }
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
                            name='Temel Tahmin'
                          />
                          <Line
                            type='monotone'
                            dataKey='tahmin'
                            stroke='#22c55e'
                            strokeWidth={4}
                            dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                            name='Gerçekleşen Satış'
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
                          <Bar
                            dataKey='stok'
                            fill='#FFB840'
                            opacity={0.5}
                            name='Stok Adedi'
                            barSize={30}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='h-[380px]'>
                <PromotionCalendar
                  events={promotionCalendarQuery.data?.events || []}
                  isLoading={promotionCalendarQuery.isLoading}
                />
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
                        +
                        {totalBaselineRevenue > 0
                          ? (
                              ((totalRevenue - totalBaselineRevenue) /
                                totalBaselineRevenue) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </span>
                      <span className='text-[10px] 2xl:text-xs text-muted-foreground font-medium'>
                        Lift
                      </span>
                    </div>
                    <p className='text-emerald-700 text-[10px] 2xl:text-xs mt-0.5 leading-tight'>
                      ₺
                      {(
                        totalRevenue - totalBaselineRevenue || 0
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{' '}
                      net ciro artışı sağladı.
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
                        {totalLostSalesUnits > 0
                          ? `${totalLostSalesUnits.toLocaleString()} Adet`
                          : '0 Adet'}
                      </span>
                      <span className='text-[10px] 2xl:text-xs text-muted-foreground font-medium'>
                        Stock-Out
                      </span>
                    </div>
                    <p className='text-red-700 text-[10px] 2xl:text-xs mt-0.5 leading-tight'>
                      {totalLostSalesUnits > 0
                        ? `Tahmini ₺${(estimatedRevenueLoss / 1000).toFixed(1)}k ciro kaybı.`
                        : 'Stok riski bulunmuyor.'}
                    </p>
                    {/* Financial Warning */}
                    <div className='mt-1 text-[10px] bg-red-100/50 p-1 rounded text-red-800 font-medium'>
                      Stok Maliyeti: ₺
                      {(totalLostSalesUnits * 15).toLocaleString()}
                      <span className='block font-normal opacity-80'>
                        (Acil sipariş farkı)
                      </span>
                    </div>

                    <div className='mt-2 pt-2 border-t border-red-200'>
                      <div className='text-[10px] text-red-700 font-medium mb-1.5'>
                        Uyarı: Promosyonun en optimal şekilde gerçekleşmesi için
                        günlük stoğun min <span className='font-bold'>750</span>{' '}
                        olması gerekiyor.
                      </div>
                      <Button
                        size='sm'
                        variant='destructive'
                        className='w-full h-6 text-[10px] bg-red-100 text-red-700 hover:bg-red-200 border-none shadow-none'
                        onClick={() =>
                          (window.location.href =
                            '/dashboard?section=inventory_planning')
                        }
                      >
                        Envanter Planlamaya Git
                      </Button>
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
                    Promosyon Ciro Payı
                  </CardTitle>
                  <UITooltip>
                    <UITooltipTrigger>
                      <Info className='h-3 w-3 text-muted-foreground/60 hover:text-indigo-600 cursor-help' />
                    </UITooltipTrigger>
                    <UITooltipContent>
                      <p>
                        Farklı promosyon kurgularının toplam ciro içindeki payı.
                      </p>
                    </UITooltipContent>
                  </UITooltip>
                </div>
                <CardDescription className='text-[10px] 2xl:text-xs'>
                  Hangi kampanya ne kadar ciro getiriyor? (Share)
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-1 pb-2'>
                {/* Simplified Visualization using simple bars for now */}
                <div className='space-y-2'>
                  {/* Revenue Share Visualization - Pie Chart Logic represented as Bars for now per request style */}
                  {[
                    {
                      type: 'INTERNET_INDIRIMI',
                      share: 45,
                      value: '180k',
                      color: 'bg-emerald-500',
                    },
                    {
                      type: 'ALISVERIS_INDIRIMI_500',
                      share: 25,
                      value: '100k',
                      color: 'bg-blue-500',
                    },
                    {
                      type: 'COKLU_ALIM',
                      share: 20,
                      value: '80k',
                      color: 'bg-indigo-500',
                    },
                    {
                      type: 'OZEL_GUN_INDIRIMI',
                      share: 10,
                      value: '40k',
                      color: 'bg-amber-500',
                    },
                  ].map((item, i) => (
                    <div key={i} className='space-y-0.5'>
                      <div className='flex justify-between text-[10px] 2xl:text-xs font-medium'>
                        <span>{item.type}</span>
                        <span className='text-muted-foreground'>
                          %{item.share} ({item.value})
                        </span>
                      </div>
                      <div className='h-2 w-full bg-muted rounded-full overflow-hidden'>
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.share}%` }}
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
          {/* 3. Detailed History Table with Advanced Metrics */}
          <Card>
            <CardHeader className='py-2 pb-1 2xl:py-3 flex flex-row items-center justify-between'>
              <div className='space-y-0.5'>
                <CardTitle className='text-sm 2xl:text-base font-semibold'>
                  Promosyon Planla ve Takip Listesi
                </CardTitle>
                <CardDescription className='text-[10px] 2xl:text-xs'>
                  Geçmiş performanslar ve gelecek planlamaları
                </CardDescription>
              </div>
              <div className='flex items-center gap-2 flex-wrap justify-end'>
                <Input
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  placeholder='Ara: kampanya, tip, tarih'
                  className='h-8 w-[190px] text-xs'
                />
                <Select
                  value={trackingStatusFilter}
                  onValueChange={(value) =>
                    setTrackingStatusFilter(
                      value as 'all' | 'draft' | 'pending' | 'approved' | 'completed',
                    )
                  }
                >
                  <SelectTrigger className='h-8 w-[130px] text-xs'>
                    <SelectValue placeholder='Durum' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tüm Durumlar</SelectItem>
                    <SelectItem value='pending'>Onay Bekliyor</SelectItem>
                    <SelectItem value='draft'>Taslak</SelectItem>
                    <SelectItem value='approved'>Onaylandı</SelectItem>
                    <SelectItem value='completed'>Tamamlandı</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={trackingTypeFilter}
                  onValueChange={setTrackingTypeFilter}
                >
                  <SelectTrigger className='h-8 w-[140px] text-xs'>
                    <SelectValue placeholder='Tip' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tüm Tipler</SelectItem>
                    {trackingTypeOptions.map((typeOption) => (
                      <SelectItem key={typeOption} value={typeOption}>
                        {typeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 text-xs'
                  onClick={() => {
                    setTrackingSearch('');
                    setTrackingStatusFilter('all');
                    setTrackingTypeFilter('all');
                  }}
                >
                  Temizle
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-0 2xl:p-1'>
              <div className='border-t'>
                <table className='w-full text-[10px] 2xl:text-xs text-left'>
                  <thead className='bg-muted/50 text-muted-foreground font-medium uppercase'>
                    <tr>
                      <th className='p-2 2xl:p-3 w-[100px]'>Tarih</th>
                      <th className='p-2 2xl:p-3'>Kampanya / Tip</th>
                      <th className='p-2 2xl:p-3 w-[100px] text-center'>
                        Durum
                      </th>
                      <th className='p-2 2xl:p-3 text-right'>
                        Ciro Artışı (Lift)
                      </th>
                      <th className='p-2 2xl:p-3 text-right'>
                        Brüt Kar Etkisi
                      </th>
                      <th className='p-2 2xl:p-3 text-center'>Stok Durumu</th>
                      <th className='p-2 2xl:p-3 text-right'>
                        Tahmin Doğruluğu
                      </th>
                      <th className='p-2 2xl:p-3 text-right'>Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {filteredTrackingRows.map((row, i) => (
                        <tr
                          key={`${row.name}-${row.date}-${i}`}
                          className='group hover:bg-muted/30 transition-colors cursor-pointer'
                          onClick={() => {
                            openCampaignDetail(row);
                          }}
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
                          <td className='p-2 2xl:p-3 text-center'>
                            {/* Status Badge */}
                            {(() => {
                              switch (row.status) {
                                case 'draft':
                                  return (
                                    <span className='bg-[#e0e0e0] text-[#333] px-1.5 py-0.5 rounded font-semibold text-[9px] border border-gray-300'>
                                      TASLAK
                                    </span>
                                  );
                                case 'pending':
                                  return (
                                    <span className='bg-[#fff3cd] text-[#856404] px-1.5 py-0.5 rounded font-semibold text-[9px] border border-yellow-200'>
                                      ONAY BEKLİYOR
                                    </span>
                                  );
                                case 'approved':
                                  return (
                                    <span className='bg-[#d4edda] text-[#155724] px-1.5 py-0.5 rounded font-semibold text-[9px] border border-green-200'>
                                      ONAYLANDI
                                    </span>
                                  );
                                case 'completed':
                                  return (
                                    <span className='bg-[#d1ecf1] text-[#0c5460] px-1.5 py-0.5 rounded font-semibold text-[9px] border border-cyan-200'>
                                      TAMAMLANDI
                                    </span>
                                  );
                                default:
                                  return (
                                    <span className='bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px]'>
                                      BİLİNMİYOR
                                    </span>
                                  );
                              }
                            })()}
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
                                ? row.status === 'completed'
                                  ? 'YETERLİ'
                                  : 'GÜVENLİ'
                                : row.stock === 'OOS'
                                  ? row.status === 'completed'
                                    ? 'TÜKENDİ'
                                    : 'RİSKLİ'
                                  : 'AŞIRI STOK'}
                            </span>
                          </td>
                          <td className='p-2 2xl:p-3 text-right text-gray-600'>
                            {row.status === 'completed' ? row.forecast : '--'}
                          </td>
                          <td className='p-2 2xl:p-3 text-right'>
                            {row.status === 'completed' ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-6 text-[10px] hover:bg-indigo-50 hover:text-indigo-600'
                              >
                                <BarChart3 className='w-3 h-3 mr-1' /> Rapor
                              </Button>
                            ) : (
                              <div className='flex justify-end gap-1'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCampaignDetail(row);
                                  }}
                                >
                                  <Eye className='w-3 h-3' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Copy logic would go here
                                    toast({
                                      title: 'Kopyalandı',
                                      description:
                                        'Kampanya detayları panoya kopyalandı.',
                                    });
                                  }}
                                >
                                  <Copy className='w-3 h-3' />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {filteredTrackingRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className='p-4 text-center text-xs text-muted-foreground'
                        >
                          Filtrelere uygun promosyon kaydı bulunamadı.
                        </td>
                      </tr>
                    )}
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
        initialData={trackingRows}
      />

      <CampaignCreationModal
        open={isPlanningModalOpen}
        onOpenChange={setIsPlanningModalOpen}
        simulationMetrics={{
          targetRevenue: forecastData
            ? `₺${((forecastData.reduce((acc, curr) => acc + (curr.tahmin || 0), 0) * baseSatisFiyati) / 1000).toFixed(1)}k`
            : '-',
          lift: forecastData
            ? '+' +
              (
                ((forecastData.reduce((acc, curr) => acc + curr.ciro, 0) -
                  forecastData.reduce(
                    (acc, curr) => acc + (curr.baseline || 0),
                    0,
                  ) *
                    baseSatisFiyati) /
                  (forecastData.reduce(
                    (acc, curr) => acc + (curr.baseline || 0),
                    0,
                  ) *
                    baseSatisFiyati)) *
                100
              ).toFixed(0) +
              '%'
            : '-',
          stockStatus: 'Optimal', // Mocked for now
        }}
        campaignContext={{
          regions: bolge,
          stores: magazaKodu,
          products: urunKodu,
          startDate: startPromosyon,
          endDate: endPromosyon,
          duration:
            startPromosyon && endPromosyon
              ? differenceInDays(endPromosyon, startPromosyon) + 1
              : 0,
        }}
        onSave={(data) => {
          toast({
            title: 'Kampanya Başarıyla Oluşturuldu',
            description: `${data.name} isimli kampanya ${data.status === 'active' ? 'yayına alındı' : 'taslak olarak kaydedildi'}.`,
            className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          });
        }}
      />

      {/* Modal - Conditional Render: Scorecard vs Approval Form */}
      {selectedCampaign && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
            {/* 
                  =============================================================================
                  VIEW A: COMPLETED CAMPAIGNS (SCORECARD)
                  =============================================================================
                */}
            {(selectedCampaign as SimilarCampaign).status === 'completed' ? (
              <>
                <DialogHeader>
                  <div className='flex items-center gap-3 mb-2'>
                    <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r pr-3 mr-1'>
                      {selectedCampaign.date}
                    </span>
                    {/* Stamp Logic */}
                    {(() => {
                      const achievement = (modalData?.achievementPct || 0) / 100;
                      const isOOS = modalData?.isOOS || false;

                      if (achievement >= 0.95 && !isOOS)
                        return (
                          <span className='bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200'>
                            BAŞARILI (%{(achievement * 100).toFixed(0)})
                          </span>
                        );
                      if (isOOS)
                        return (
                          <span className='bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200'>
                            STOK SORUNU
                          </span>
                        );
                      return (
                        <span className='bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200'>
                          TAMAMLANDI
                        </span>
                      );
                    })()}
                  </div>
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-xl'>
                      {selectedCampaign.name}
                    </DialogTitle>
                  </div>
                  <DialogDescription>
                    Kampanya Performans Karnesi ve Sonuç Analizi
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-2'>
                  {/* KPI Cards */}
                  <div className='grid grid-cols-3 gap-3'>
                    <div className='bg-muted/30 p-3 rounded-lg border'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        Gerçekleşen Ciro
                      </div>
                      <div className='text-2xl font-bold text-gray-900'>
                        ₺{((selectedCampaign.actualRevenue || 0) / 1000).toFixed(1)}k
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden'>
                        <div
                          className='bg-emerald-500 h-1.5 rounded-full'
                          style={{
                            width: `${Math.max(
                              8,
                              Math.min(100, modalData?.achievementPct || 0),
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                      <div className='text-[10px] font-medium text-emerald-600 mt-1'>
                        Hedefin %{(modalData?.achievementPct || 0).toFixed(0)}&apos;si
                      </div>
                    </div>
                    <div className='bg-muted/30 p-3 rounded-lg border'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        Satılan Adet
                      </div>
                      <div className='text-2xl font-bold text-gray-900'>
                        {Math.round((selectedCampaign.actualRevenue || 0) / baseSatisFiyati).toLocaleString('tr-TR')}{' '}
                        <span className='text-sm font-normal text-muted-foreground'>
                          Adet
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden'>
                        <div
                          className={`${(modalData?.sellThrough || 0) > 90 ? 'bg-red-500' : 'bg-emerald-500'} h-1.5 rounded-full`}
                          style={{
                            width: `${Math.max(
                              8,
                              Math.min(100, modalData?.sellThrough || 0),
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                      <div className='text-[10px] font-medium text-red-600 mt-1'>
                        Stokların %{(modalData?.sellThrough || 0).toFixed(0)}&apos;i tükendi (Sell-Through)
                      </div>
                    </div>
                    <div className='bg-muted/30 p-3 rounded-lg border'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        İndirim Maliyeti (Markdown)
                      </div>
                      <div className='text-2xl font-bold text-gray-900'>
                        ₺{((modalData?.markdownCost || 0) / 1000).toFixed(1)}k
                      </div>
                      <div className='h-1.5 mt-2'></div>
                      <div className='text-[10px] text-muted-foreground mt-1'>
                        Birim başı ₺
                        {(
                          (modalData?.markdownCost || 0) /
                          Math.max(
                            1,
                            Math.round(
                              (selectedCampaign.actualRevenue || 0) / baseSatisFiyati,
                            ),
                          )
                        ).toFixed(2)}{' '}
                        maliyet
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className='h-56 w-full bg-white p-3 rounded-lg border shadow-sm'>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='text-sm font-semibold text-gray-700'>
                        Satış Performansı: Normal vs Promosyonlu
                      </h4>
                      <div className='flex gap-4 text-[10px]'>
                        <div className='flex items-center gap-1'>
                          <div className='w-2 h-2 rounded-full bg-gray-400'></div>
                          Normal Satış (Tahmin)
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='w-2 h-2 rounded-full bg-emerald-600'></div>
                          Gerçekleşen
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart
                        data={modalData?.completedChartData || []}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          vertical={false}
                          stroke='#e5e7eb'
                        />
                        <XAxis
                          dataKey='day'
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          tickFormatter={(value) => `₺${value / 1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          cursor={{
                            stroke: '#9ca3af',
                            strokeWidth: 1,
                            strokeDasharray: '4 4',
                          }}
                        />
                        <Line
                          type='monotone'
                          dataKey='baseline'
                          stroke='#9ca3af'
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray='5 5'
                        />
                        <Line
                          type='monotone'
                          dataKey='actual'
                          stroke='#059669'
                          strokeWidth={3}
                          dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Analysis */}
                  <div className='bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex gap-3'>
                    <div className='shrink-0 mt-0.5'>
                      <div className='h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center'>
                        <Sparkles className='h-4 w-4 text-indigo-600' />
                      </div>
                    </div>
                    <div>
                      <h4 className='text-sm font-bold text-indigo-900 mb-1'>
                        Sonuç Analizi
                      </h4>
                      <p className='text-xs leading-relaxed text-indigo-800'>
                        Kampanya hedefe göre{' '}
                        <span className='font-bold'>
                          %{(modalData?.achievementPct || 0).toFixed(0)}
                        </span>{' '}
                        gerçekleşti.{' '}
                        {modalData?.isOOS ? (
                          <>
                            <span className='font-bold border-b border-indigo-300'>
                              Stok kesintisi gözlendi
                            </span>{' '}
                            ve {selectedCampaign.stockOutDays} gün stok-out oluştu.
                          </>
                        ) : (
                          <>Stok planı kampanya boyunca stabil kaldı.</>
                        )}
                        <br />
                        <br />
                        <span className='font-bold'>Öneri:</span>{' '}
                        {modalData?.isOOS
                          ? 'Benzer kampanyada planlanan stok gününü artırın ve mağaza içi transfer tamponu ekleyin.'
                          : 'Mevcut fiyatlama kurgusu korunarak benzer dönemde tekrar uygulanabilir.'}
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className='gap-2 sm:gap-0 mt-2'>
                  <Button
                    variant='outline'
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    Kapat
                  </Button>
                  <Button
                    variant='destructive'
                    className='bg-red-600 hover:bg-red-700'
                    onClick={() =>
                      (window.location.href =
                        '/alert-center?report=campaign_issue')
                    }
                  >
                    <Flag className='w-4 h-4 mr-2' />
                    Sorun Bildir / Raporla
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                {/* 
                  =============================================================================
                  VIEW B: FUTURE CAMPAIGNS (APPROVAL & PREVIEW)
                  =============================================================================
                */}
                <DialogHeader>
                  <div className='flex items-center gap-3 mb-2'>
                    <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r pr-3 mr-1'>
                      {selectedCampaign.date}
                    </span>
                    {/* Status Badge */}
                    {(() => {
                      const s = (selectedCampaign as SimilarCampaign).status;
                      if (s === 'pending')
                        return (
                          <span className='bg-[#fff3cd] text-[#856404] px-2 py-0.5 rounded border border-yellow-200 text-[10px] font-bold'>
                            ONAY BEKLİYOR
                          </span>
                        );
                      if (s === 'draft')
                        return (
                          <span className='bg-[#e0e0e0] text-[#333] px-2 py-0.5 rounded border border-gray-300 text-[10px] font-bold'>
                            TASLAK
                          </span>
                        );
                      if (s === 'approved')
                        return (
                          <span className='bg-[#d4edda] text-[#155724] px-2 py-0.5 rounded border border-green-200 text-[10px] font-bold'>
                            ONAYLANDI
                          </span>
                        );
                      return null;
                    })()}
                  </div>
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-xl'>
                      {selectedCampaign.name}
                    </DialogTitle>
                  </div>
                  <DialogDescription>
                    Fizibilite Raporu ve Onay Formu
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-2'>
                  {/* KPI Cards (Expectations) */}
                  <div className='grid grid-cols-3 gap-3'>
                    <div className='bg-white p-3 rounded-lg border shadow-sm'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        Beklenen Ciro & Lift
                      </div>
                      <div className='text-2xl font-bold text-indigo-900'>
                        ₺{((selectedCampaign.targetRevenue || 0) / 1000).toFixed(1)}k
                      </div>
                      <div className='text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1'>
                        <TrendingUp className='w-3 h-3' />
                        +₺{((modalData?.liftValue || 0) / 1000).toFixed(1)}k Lift Beklentisi
                      </div>
                    </div>
                    <div className='bg-white p-3 rounded-lg border shadow-sm'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        Yatırım Maliyeti
                      </div>
                      <div className='text-2xl font-bold text-gray-900'>
                        ₺{((modalData?.markdownCost || 0) / 1000).toFixed(1)}k
                      </div>
                      <div className='text-[10px] font-medium text-muted-foreground mt-1'>
                        %{Math.max(0, selectedCampaign.lift).toFixed(0)} lift varsayımı ile
                      </div>
                    </div>
                    <div className='bg-white p-3 rounded-lg border shadow-sm'>
                      <div className='text-[10px] text-muted-foreground uppercase font-semibold mb-1'>
                        Stok Yeterliliği
                      </div>
                      <div className='text-2xl font-bold text-emerald-600'>
                        %{(modalData?.stockCoveragePct || 0).toFixed(0)}
                      </div>
                      <div className='text-[10px] font-medium text-muted-foreground mt-1'>
                        Gerekli: {modalData?.plannedDays || 0} gün / Mevcut: {modalData?.actualDays || 0} gün
                      </div>
                    </div>
                  </div>

                  {/* Simulation Chart */}
                  <div className='h-56 w-full bg-slate-50 p-3 rounded-lg border border-slate-200'>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='text-sm font-semibold text-slate-700'>
                        Simülasyon: Satış & Stok Riski
                      </h4>
                      <div className='flex gap-4 text-[10px]'>
                        <div className='flex items-center gap-1'>
                          <div className='w-2 h-2 rounded-full bg-gray-400'></div>
                          Baseline
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='w-2 h-2 rounded-full bg-emerald-600'></div>
                          Forecast (Kampanyalı)
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='w-2 h-2 rounded-full bg-yellow-400'></div>
                          Stok Limiti
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width='100%' height='100%'>
                      <ComposedChart
                        data={modalData?.futureChartData || []}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          vertical={false}
                          stroke='#e2e8f0'
                        />
                        <XAxis
                          dataKey='day'
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickFormatter={(value) => `₺${value / 1000}k`}
                        />
                        <Tooltip />
                        <Bar
                          dataKey='stock'
                          fill='#fde68a'
                          fillOpacity={0.3}
                          barSize={999}
                        />{' '}
                        {/* Background area hack or use ReferenceArea */}
                        <Line
                          type='monotone'
                          dataKey='baseline'
                          stroke='#94a3b8'
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray='5 5'
                        />
                        <Line
                          type='monotone'
                          dataKey='forecast'
                          stroke='#059669'
                          strokeWidth={3}
                          dot={{ r: 3, fill: '#059669' }}
                          strokeDasharray='5 5'
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Risk Analysis */}
                  <div className='flex items-start gap-3 bg-emerald-50 p-4 rounded-lg border border-emerald-100'>
                    <div className='shrink-0 pt-1'>
                      <div className='h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse'></div>
                    </div>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <h4 className='text-sm font-bold text-emerald-900'>
                          {selectedCampaign.stockOutDays > 0 ? 'ORTA RİSK' : 'DÜŞÜK RİSK'}
                        </h4>
                        <span className='text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded'>
                          AI Güven Skoru: {Math.max(55, 100 - selectedCampaign.stockOutDays * 10)}/100
                        </span>
                      </div>
                      <p className='text-xs text-emerald-800 leading-relaxed'>
                        Bu kampanya planı benzer kampanya performansına göre
                        değerlendirildi. Tahmini ciro{' '}
                        <span className='font-semibold'>
                          ₺{((selectedCampaign.targetRevenue || 0) / 1000).toFixed(1)}k
                        </span>{' '}
                        seviyesinde.{' '}
                        {selectedCampaign.stockOutDays > 0
                          ? `Stok kesinti riski ${selectedCampaign.stockOutDays} gün olarak görünüyor.`
                          : 'Stok yeterliliği planlanan gün sayısını karşılıyor.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className='gap-2 sm:gap-0 mt-4 border-t pt-4'>
                  {/* Dynamic Buttons based on status */}
                  {(() => {
                    const s = (selectedCampaign as SimilarCampaign).status;
                    if (s === 'draft')
                      return (
                        <>
                          <Button
                            variant='ghost'
                            onClick={() => setIsDetailModalOpen(false)}
                          >
                            Vazgeç
                          </Button>
                          <div className='flex gap-2 w-full sm:w-auto'>
                            <Button
                              variant='outline'
                              className='flex-1 sm:flex-none'
                            >
                              Düzenle
                            </Button>
                            <Button className='flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700'>
                              Onaya Gönder
                            </Button>
                          </div>
                        </>
                      );
                    if (s === 'pending')
                      return (
                        <>
                          <Button
                            variant='outline'
                            className='text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200'
                          >
                            Reddet / Revize İste
                          </Button>
                          <Button className='bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto'>
                            <CalendarIcon className='w-3.5 h-3.5 mr-2' />
                            Onayla ve Takvime İşle
                          </Button>
                        </>
                      );
                    if (s === 'approved')
                      return (
                        <>
                          <Button
                            variant='outline'
                            className='text-red-600 border-red-200'
                          >
                            İptal Et
                          </Button>
                          <div className='flex gap-2 w-full sm:w-auto'>
                            <Button variant='outline'>Düzenle</Button>
                            <Button
                              variant='secondary'
                              onClick={() => setIsDetailModalOpen(false)}
                            >
                              Kapat
                            </Button>
                          </div>
                        </>
                      );
                    return (
                      <Button onClick={() => setIsDetailModalOpen(false)}>
                        Kapat
                      </Button>
                    );
                  })()}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
