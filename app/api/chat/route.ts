import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8000';

type ChatRole = 'user' | 'assistant';
type Primitive = string | number | boolean | null;

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface DashboardFilters {
  regions?: string[];
  stores?: string[];
  categories?: string[];
  products?: string[];
}

interface ChatRequestBody {
  message?: string;
  context?: string;
  section?: string;
  filters?: DashboardFilters;
  metrics?: Record<string, Primitive>;
  history?: ChatMessage[];
}

interface DashboardMetricsResponse {
  accuracy?: number;
  forecastValue?: number;
  forecastRevenue?: number;
  ytdValue?: number;
  ytdRevenue?: number;
  gapToSales?: number;
}

interface DemandKpisResponse {
  totalForecast?: {
    value?: number;
    units?: number;
    trend?: number;
  };
  accuracy?: {
    value?: number;
    trend?: number;
  };
  yoyGrowth?: {
    value?: number;
    trend?: number;
  };
  bias?: {
    value?: number;
    type?: string;
    trend?: string;
  };
  lowGrowthCount?: number;
  highGrowthCount?: number;
}

interface InventoryKpisResponse {
  totalStockValue?: number;
  stockCoverageDays?: number;
  stockOutRiskItems?: number;
  excessInventoryItems?: number;
  reorderNeededItems?: number;
}

interface AlertsSummaryResponse {
  totalAlerts?: number;
  summary?: {
    inventory?: {
      count?: number;
      stockout?: number;
      overstock?: number;
      reorder?: number;
    };
    forecastErrors?: {
      count?: number;
      criticalCount?: number;
    };
  };
}

interface InventoryItemResponse {
  sku?: string;
  productName?: string;
  category?: string;
  stockLevel?: number;
  forecastedDemand?: number;
  daysOfCoverage?: number;
  status?: string;
}

interface InventoryItemsResponse {
  items?: InventoryItemResponse[];
}

interface PromotionHistoryItem {
  name?: string;
  date?: string;
  uplift?: number;
  profit?: number;
}

interface PromotionHistoryResponse {
  promotions?: PromotionHistoryItem[];
}

interface GrowthProduct {
  name?: string;
  growth?: number;
  type?: string;
}

interface GrowthProductsResponse {
  products?: GrowthProduct[];
}

interface ForecastErrorProduct {
  name?: string;
  error?: number;
  accuracy?: number;
  severity?: string;
}

interface ForecastErrorsResponse {
  products?: ForecastErrorProduct[];
}

interface InventoryAlertMetrics {
  currentStock?: number;
  threshold?: number;
  forecastedDemand?: number;
}

interface InventoryAlertItem {
  type?: string;
  sku?: string;
  productName?: string;
  storeName?: string;
  severity?: string;
  recommendation?: string;
  metrics?: InventoryAlertMetrics;
}

interface InventoryAlertsResponse {
  alerts?: InventoryAlertItem[];
  totalCount?: number;
}

interface RevenueChartItem {
  week?: string;
  actualCiro?: number;
  plan?: number;
}

interface RevenueChartResponse {
  data?: RevenueChartItem[];
}

interface HistoricalChartItem {
  week?: string;
  [key: string]: string | number | null | undefined;
}

interface HistoricalChartResponse {
  data?: HistoricalChartItem[];
}

interface PromotionCalendarDay {
  date?: string;
  promotions?: {
    id?: string;
    name?: string;
    type?: string;
    discount?: number | null;
  }[];
}

interface PromotionCalendarResponse {
  events?: PromotionCalendarDay[];
}

interface StorePerformanceItem {
  storeName?: string;
  stockLevel?: number;
  sellThroughRate?: number;
  daysOfInventory?: number;
  storeEfficiency?: number;
}

interface StorePerformanceResponse {
  stores?: StorePerformanceItem[];
}

function appendArrayParam(url: URL, key: string, values?: string[]) {
  if (!Array.isArray(values)) {
    return;
  }

  values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .forEach((value) => {
      url.searchParams.append(key, value);
    });
}

function buildApiUrl(
  endpoint: string,
  filters?: DashboardFilters,
  extraParams?: Record<string, string | number>,
) {
  const url = new URL(endpoint, API_BASE_URL);

  appendArrayParam(url, 'regionIds', filters?.regions);
  appendArrayParam(url, 'storeIds', filters?.stores);
  appendArrayParam(url, 'categoryIds', filters?.categories);
  appendArrayParam(url, 'productIds', filters?.products);

  if (extraParams !== undefined) {
    Object.entries(extraParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
}

function compactClientMetrics(metrics?: Record<string, Primitive>): string {
  if (metrics === undefined) {
    return 'Yok';
  }

  const entries = Object.entries(metrics).slice(0, 12);
  if (entries.length === 0) {
    return 'Yok';
  }

  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    've',
    'ile',
    'icin',
    'gibi',
    'olan',
    'hangi',
    'kac',
    'nedir',
    'bana',
    'bir',
    'bu',
    'that',
    'what',
    'where',
    'from',
    'with',
    'about',
    'the',
    'for',
  ]);

  return message
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .slice(0, 8);
}

function selectNeeds(message: string, section: string) {
  const lower = message.toLowerCase();
  const sectionLower = section.toLowerCase();

  return {
    productDetails:
      /sku|urun|product|stok|stock|out of stock|stoksuz|overstock|kategori|category/.test(
        lower,
      ) || sectionLower.includes('envanter'),
    promotionDetails:
      /promosyon|promotion|kampanya|indirim|fiyat|roi|calendar|takvim/.test(
        lower,
      ) || sectionLower.includes('promosyon'),
    demandDetails:
      /growth|buyume|bias|forecast error|hata|sapma|dogruluk|accuracy|yoy|trend/.test(
        lower,
      ) ||
      sectionLower.includes('demand') ||
      sectionLower.includes('forecast'),
    alertDetails:
      /uyari|alert|alarm|risk|kritik|critical|oner|advice|aksiyon|action/.test(
        lower,
      ) ||
      sectionLower.includes('alert') ||
      sectionLower.includes('envanter'),
  };
}

function buildAlertAdviceLines(params: {
  inventoryAlerts: InventoryAlertsResponse | null;
  alertsSummary: AlertsSummaryResponse | null;
  forecastErrors: ForecastErrorsResponse | null;
}): string[] {
  const lines: string[] = [];
  const alertItems = params.inventoryAlerts?.alerts ?? [];

  const stockoutCount = alertItems.filter((a) => a.type === 'stockout').length;
  const reorderCount = alertItems.filter((a) => a.type === 'reorder').length;
  const overstockCount = alertItems.filter((a) => a.type === 'overstock').length;

  if (stockoutCount > 0) {
    lines.push(
      `Stockout icin oncelik: kritik SKU'larda transfer/siparis ac, gunluk takip listesi olustur (${String(stockoutCount)} urun).`,
    );
  }

  if (reorderCount > 0) {
    lines.push(
      `Reorder icin oncelik: 7 gunluk talep esiginin altindaki urunlerde yeniden siparis planla (${String(reorderCount)} urun).`,
    );
  }

  if (overstockCount > 0) {
    lines.push(
      `Overstock icin oncelik: yavas donen SKU'larda promosyon/transfer uygula, max stok politikasini gozden gecir (${String(overstockCount)} urun).`,
    );
  }

  const criticalForecastErrors =
    params.alertsSummary?.summary?.forecastErrors?.criticalCount ?? 0;
  if (criticalForecastErrors > 0) {
    lines.push(
      `Tahmin hatasi icin oncelik: kritik forecast error urunlerinde model/bias kalibrasyonu yap (${formatNumber(criticalForecastErrors)} urun).`,
    );
  }

  const severeForecast = (params.forecastErrors?.products ?? []).filter(
    (p) => (p.severity ?? '').toLowerCase() === 'critical',
  ).length;
  if (severeForecast > 0) {
    lines.push(
      `Critical forecast error urunleri icin manuel demand override ve promosyon etkisi kontrolu yap (${String(severeForecast)} urun).`,
    );
  }

  if (lines.length === 0) {
    lines.push(
      'Aktif kritik alarm gorunmuyor; izleme frekansi haftalikten gunluge sadece pik donemlerde cikarilmali.',
    );
  }

  return lines.slice(0, 5);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey === undefined || apiKey.trim() === '') {
      return NextResponse.json(
        {
          error:
            'OPENAI_API_KEY tanimli degil. Vercel/ortam degiskenlerinden ekleyin.',
        },
        { status: 500 },
      );
    }

    const body = (await req.json()) as ChatRequestBody;
    const message = (body.message ?? '').trim();
    const context = body.context ?? '';
    const section = (body.section ?? '').trim();
    const filters = body.filters;
    const history = Array.isArray(body.history) ? body.history : [];

    if (message === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    const needs = selectNeeds(message, section);

    const [
      overviewMetrics,
      demandKpis,
      inventoryKpis,
      alertsSummary,
      revenueChart,
      historicalChart,
      promotionCalendar,
      storePerformance,
    ] =
      await Promise.all([
        safeFetchJson<DashboardMetricsResponse>(
          buildApiUrl('/api/dashboard/metrics', filters),
        ),
        safeFetchJson<DemandKpisResponse>(
          buildApiUrl('/api/demand/kpis', filters, {
            periodValue: 30,
            periodUnit: 'gun',
          }),
        ),
        safeFetchJson<InventoryKpisResponse>(
          buildApiUrl('/api/inventory/kpis', filters, { days: 30 }),
        ),
        safeFetchJson<AlertsSummaryResponse>(
          buildApiUrl('/api/alerts/summary', filters, {
            periodValue: 30,
            periodUnit: 'gun',
          }),
        ),
        safeFetchJson<RevenueChartResponse>(
          buildApiUrl('/api/dashboard/revenue-chart', filters),
        ),
        safeFetchJson<HistoricalChartResponse>(
          buildApiUrl('/api/chart/historical', filters),
        ),
        safeFetchJson<PromotionCalendarResponse>(
          buildApiUrl('/api/forecast/calendar', filters, {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
          }),
        ),
        safeFetchJson<StorePerformanceResponse>(
          buildApiUrl('/api/inventory/store-performance', filters, { days: 30 }),
        ),
      ]);

    const [
      inventoryItems,
      promotionHistory,
      growthProducts,
      forecastErrors,
      inventoryAlerts,
    ] =
      await Promise.all([
        needs.productDetails
          ? safeFetchJson<InventoryItemsResponse>(
              buildApiUrl('/api/inventory/items', filters, {
                days: 30,
                page: 1,
                limit: 80,
                sortBy: 'stockValue',
                sortOrder: 'desc',
              }),
            )
          : Promise.resolve(null),
        needs.promotionDetails
          ? safeFetchJson<PromotionHistoryResponse>(
              buildApiUrl('/api/forecast/promotion-history', filters, {
                limit: 25,
              }),
            )
          : Promise.resolve(null),
        needs.demandDetails
          ? safeFetchJson<GrowthProductsResponse>(
              buildApiUrl('/api/demand/growth-products', filters, {
                days: 30,
                type: 'all',
              }),
            )
          : Promise.resolve(null),
        needs.demandDetails
          ? safeFetchJson<ForecastErrorsResponse>(
              buildApiUrl('/api/demand/forecast-errors', filters, {
                days: 30,
              }),
            )
          : Promise.resolve(null),
        needs.alertDetails
          ? safeFetchJson<InventoryAlertsResponse>(
              buildApiUrl('/api/alerts/inventory', filters, {
                days: 30,
                limit: 80,
              }),
            )
          : Promise.resolve(null),
      ]);

    const facts: string[] = [];
    facts.push(`Aktif Sayfa: ${section !== '' ? section : 'Bilinmiyor'}`);
    facts.push(`Sayfa Metrikleri: ${compactClientMetrics(body.metrics)}`);

    if (overviewMetrics !== null) {
      facts.push(
        `Overview KPI -> Accuracy: ${formatNumber(overviewMetrics.accuracy)}%, ForecastRevenue: ${formatNumber(overviewMetrics.forecastRevenue)}, YTDRevenue: ${formatNumber(overviewMetrics.ytdRevenue)}, GapToSales: ${formatNumber(overviewMetrics.gapToSales)}%`,
      );
    }

    if (demandKpis !== null) {
      facts.push(
        `Demand KPI -> ForecastValue: ${formatNumber(demandKpis.totalForecast?.value)}, Accuracy: ${formatNumber(demandKpis.accuracy?.value)}%, YoYGrowth: ${formatNumber(demandKpis.yoyGrowth?.value)}%, LowGrowthCount: ${formatNumber(demandKpis.lowGrowthCount)}, HighGrowthCount: ${formatNumber(demandKpis.highGrowthCount)}`,
      );
    }

    if (inventoryKpis !== null) {
      facts.push(
        `Inventory KPI -> StockValue: ${formatNumber(inventoryKpis.totalStockValue)}, CoverageDays: ${formatNumber(inventoryKpis.stockCoverageDays)}, StockOutRiskItems: ${formatNumber(inventoryKpis.stockOutRiskItems)}, ExcessItems: ${formatNumber(inventoryKpis.excessInventoryItems)}, ReorderNeeded: ${formatNumber(inventoryKpis.reorderNeededItems)}`,
      );
    }

    if (alertsSummary !== null) {
      facts.push(
        `Alerts -> Total: ${formatNumber(alertsSummary.totalAlerts)}, Inventory: ${formatNumber(alertsSummary.summary?.inventory?.count)}, ForecastErrors: ${formatNumber(alertsSummary.summary?.forecastErrors?.count)}, CriticalForecastErrors: ${formatNumber(alertsSummary.summary?.forecastErrors?.criticalCount)}`,
      );
    }

    if (revenueChart?.data !== undefined && revenueChart.data.length > 0) {
      const last = revenueChart.data[revenueChart.data.length - 1];
      facts.push(
        `Revenue Trend -> Son Hafta ${last.week ?? '-'}: actual=${formatNumber(last.actualCiro)}, plan=${formatNumber(last.plan)}`,
      );
    }

    if (
      historicalChart?.data !== undefined &&
      historicalChart.data.length > 0
    ) {
      const last = historicalChart.data[historicalChart.data.length - 1];
      const yearKeys = Object.keys(last).filter((k) => k.startsWith('y'));
      const compact = yearKeys
        .slice(0, 3)
        .map((k) => `${k}=${formatNumber(Number(last[k] ?? 0))}`)
        .join(', ');
      facts.push(`Historical Trend -> ${last.week ?? 'Hafta'}: ${compact}`);
    }

    if (promotionCalendar?.events !== undefined) {
      const promoDays = promotionCalendar.events.filter(
        (e) => (e.promotions ?? []).length > 0,
      );
      facts.push(
        `Promosyon Takvimi -> Bu ay promosyonlu gun sayisi: ${String(promoDays.length)}`,
      );
    }

    if (storePerformance?.stores !== undefined && storePerformance.stores.length > 0) {
      const topStore = storePerformance.stores[0];
      facts.push(
        `Store Performance -> En iyi magazalardan biri: ${topStore.storeName ?? '-'} (eff=${formatNumber(topStore.storeEfficiency)}, sellThrough=${formatNumber(topStore.sellThroughRate)}%)`,
      );
    }

    if (inventoryItems?.items !== undefined) {
      const terms = extractKeywords(message);
      const source = inventoryItems.items;
      const matched =
        terms.length > 0
          ? source.filter((item) => {
              const haystack =
                `${item.sku ?? ''} ${item.productName ?? ''} ${item.category ?? ''}`.toLowerCase();
              return terms.some((term) => haystack.includes(term));
            })
          : source;

      const shortlist = (matched.length > 0 ? matched : source).slice(0, 8);
      const line = shortlist
        .map(
          (item) =>
            `${item.sku ?? '-'}:${item.productName ?? '-'}(stok=${formatNumber(item.stockLevel)}, tahmin=${formatNumber(item.forecastedDemand)}, durum=${item.status ?? '-'})`,
        )
        .join(' | ');
      facts.push(`Urun Ozeti -> ${line !== '' ? line : 'Veri yok'}`);
    }

    if (promotionHistory?.promotions !== undefined) {
      const promoLine = promotionHistory.promotions
        .slice(0, 6)
        .map(
          (item) =>
            `${item.name ?? '-'}(${item.date ?? '-'}, uplift=${formatNumber(item.uplift)}, profit=${formatNumber(item.profit)})`,
        )
        .join(' | ');
      facts.push(`Promosyon Ozeti -> ${promoLine !== '' ? promoLine : 'Veri yok'}`);
    }

    if (growthProducts?.products !== undefined) {
      const growthLine = growthProducts.products
        .slice(0, 6)
        .map(
          (item) =>
            `${item.name ?? '-'}(${item.type ?? '-'}:${formatNumber(item.growth)}%)`,
        )
        .join(' | ');
      facts.push(`Buyume Ozeti -> ${growthLine !== '' ? growthLine : 'Veri yok'}`);
    }

    if (forecastErrors?.products !== undefined) {
      const errorsLine = forecastErrors.products
        .slice(0, 6)
        .map(
          (item) =>
            `${item.name ?? '-'}(err=${formatNumber(item.error)}%, acc=${formatNumber(item.accuracy)}%, sev=${item.severity ?? '-'})`,
        )
        .join(' | ');
      facts.push(`Tahmin Hata Ozeti -> ${errorsLine !== '' ? errorsLine : 'Veri yok'}`);
    }

    if (inventoryAlerts?.alerts !== undefined) {
      const alertLine = inventoryAlerts.alerts
        .slice(0, 6)
        .map(
          (a) =>
            `${a.type ?? '-'}:${a.productName ?? '-'}(${a.storeName ?? '-'}, sev=${a.severity ?? '-'})`,
        )
        .join(' | ');
      facts.push(`Alarm Detay Ozeti -> ${alertLine !== '' ? alertLine : 'Veri yok'}`);
    }

    const alertAdvice = buildAlertAdviceLines({
      inventoryAlerts,
      alertsSummary,
      forecastErrors,
    });
    facts.push(`Alarm Aksiyon Onerileri -> ${alertAdvice.join(' | ')}`);

    const systemPrompt = `Sen Bee2 Forecasting Dashboard AI asistansisin.
Kurallar:
- Sadece FACTS blogundaki verileri kullan.
- Veri bulunmayan endpointte, varsa Sayfa Metrikleri ve Context bilgilerini esas al.
- Veri yoksa uydurma yapma.
- Kisa, net, sayisal ve Turkce cevap ver.
- Kullanici alarm/uyari/aksiyon istediginde "Alarm Aksiyon Onerileri" satirlarini temel alarak somut adimlar ver.

CONTEXT:
${context !== '' ? context : 'Yok'}

FACTS:
${facts.join('\n')}`;

    const messages: { role: 'system' | ChatRole; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    history.slice(-6).forEach((msg) => {
      if (typeof msg.content !== 'string' || msg.content.trim() === '') {
        return;
      }
      messages.push({ role: msg.role, content: msg.content });
    });
    messages.push({ role: 'user', content: message });

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 350,
    });

    const response =
      completion.choices[0]?.message?.content ??
      'Uzgunum, su an yanit olusturamadim.';

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    const status = (error as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json(
        { error: 'API anahtari gecersiz' },
        { status: 401 },
      );
    }
    if (status === 429) {
      return NextResponse.json(
        { error: 'Cok fazla istek. Lutfen biraz bekleyin.' },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: 'Bir hata olustu. Lutfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}

