import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8000';

type ChatRole = 'user' | 'assistant';

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

type MetricValue = string | number | boolean | null;

interface ChatRequestBody {
  message?: string;
  context?: string;
  history?: ChatMessage[];
  filters?: DashboardFilters;
  section?: string;
  metrics?: Record<string, MetricValue>;
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
  totalForecast?: { value?: number; units?: number; trend?: number };
  accuracy?: { value?: number; trend?: number };
  yoyGrowth?: { value?: number; trend?: number };
  bias?: { value?: number; type?: string };
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

function formatValue(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
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

  const asksProduct =
    /sku|urun|product|stok|stock|out of stock|stoksuz|overstock|kategori|category/.test(
      lower,
    );
  const asksPromotion =
    /promosyon|promotion|kampanya|indirim|fiyat|roi|calendar|takvim/.test(
      lower,
    );
  const asksDemandDetails =
    /growth|buyume|bias|forecast error|hata|sapma|dogruluk/.test(lower);

  return {
    productDetails: asksProduct || section.toLowerCase().includes('envanter'),
    promotionDetails:
      asksPromotion || section.toLowerCase().includes('promosyon'),
    demandDetails:
      asksDemandDetails ||
      section.toLowerCase().includes('demand') ||
      section.toLowerCase().includes('forecast'),
  };
}

function compactClientMetrics(metrics?: Record<string, MetricValue>): string {
  if (metrics === undefined) {
    return 'Yok';
  }

  const entries = Object.entries(metrics).slice(0, 12);
  if (entries.length === 0) {
    return 'Yok';
  }

  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ');
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
    const history = Array.isArray(body.history) ? body.history : [];
    const filters = body.filters;

    if (message === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    const needs = selectNeeds(message, section);
    const [overviewMetrics, demandKpis, inventoryKpis, alertsSummary] =
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
      ]);

    const [inventoryItems, promotionHistory, growthProducts, forecastErrors] =
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
      ]);

    const facts: string[] = [];
    facts.push(`Aktif Sayfa: ${section !== '' ? section : 'Bilinmiyor'}`);
    facts.push(`Sayfa Metrikleri: ${compactClientMetrics(body.metrics)}`);

    if (overviewMetrics !== null) {
      facts.push(
        `Overview KPI -> Accuracy: ${formatValue(overviewMetrics.accuracy)}%, ForecastRevenue: ${formatValue(overviewMetrics.forecastRevenue)}, YTDRevenue: ${formatValue(overviewMetrics.ytdRevenue)}, GapToSales: ${formatValue(overviewMetrics.gapToSales)}%`,
      );
    }

    if (demandKpis !== null) {
      facts.push(
        `Demand KPI -> ForecastValue: ${formatValue(demandKpis.totalForecast?.value)}, Accuracy: ${formatValue(demandKpis.accuracy?.value)}%, YoYGrowth: ${formatValue(demandKpis.yoyGrowth?.value)}%, LowGrowthCount: ${formatValue(demandKpis.lowGrowthCount)}, HighGrowthCount: ${formatValue(demandKpis.highGrowthCount)}`,
      );
    }

    if (inventoryKpis !== null) {
      facts.push(
        `Inventory KPI -> StockValue: ${formatValue(inventoryKpis.totalStockValue)}, CoverageDays: ${formatValue(inventoryKpis.stockCoverageDays)}, StockOutRiskItems: ${formatValue(inventoryKpis.stockOutRiskItems)}, ExcessItems: ${formatValue(inventoryKpis.excessInventoryItems)}, ReorderNeeded: ${formatValue(inventoryKpis.reorderNeededItems)}`,
      );
    }

    if (alertsSummary !== null) {
      facts.push(
        `Alerts -> Total: ${formatValue(alertsSummary.totalAlerts)}, Inventory: ${formatValue(alertsSummary.summary?.inventory?.count)}, ForecastErrors: ${formatValue(alertsSummary.summary?.forecastErrors?.count)}, CriticalForecastErrors: ${formatValue(alertsSummary.summary?.forecastErrors?.criticalCount)}`,
      );
    }

    if (inventoryItems?.items !== undefined) {
      const terms = extractKeywords(message);
      const candidates = inventoryItems.items;
      const matched =
        terms.length > 0
          ? candidates.filter((item) => {
              const haystack =
                `${item.sku ?? ''} ${item.productName ?? ''} ${item.category ?? ''}`.toLowerCase();
              return terms.some((term) => haystack.includes(term));
            })
          : candidates;

      const shortlist = (matched.length > 0 ? matched : candidates).slice(0, 8);
      const line = shortlist
        .map((item) => {
          return `${item.sku ?? '-'}:${item.productName ?? '-'}(stok=${formatValue(item.stockLevel)}, tahmin=${formatValue(item.forecastedDemand)}, durum=${item.status ?? '-'})`;
        })
        .join(' | ');
      facts.push(`Urun Ozeti -> ${line !== '' ? line : 'Veri yok'}`);
    }

    if (promotionHistory?.promotions !== undefined) {
      const promoLine = promotionHistory.promotions
        .slice(0, 6)
        .map((promo) => {
          return `${promo.name ?? '-'}(${promo.date ?? '-'}, uplift=${formatValue(promo.uplift)}, profit=${formatValue(promo.profit)})`;
        })
        .join(' | ');
      facts.push(`Promosyon Ozeti -> ${promoLine !== '' ? promoLine : 'Veri yok'}`);
    }

    if (growthProducts?.products !== undefined) {
      const growthLine = growthProducts.products
        .slice(0, 6)
        .map((p) => `${p.name ?? '-'}(${p.type ?? '-'}:${formatValue(p.growth)}%)`)
        .join(' | ');
      facts.push(`Buyume Ozeti -> ${growthLine !== '' ? growthLine : 'Veri yok'}`);
    }

    if (forecastErrors?.products !== undefined) {
      const errorLine = forecastErrors.products
        .slice(0, 6)
        .map(
          (p) =>
            `${p.name ?? '-'}(err=${formatValue(p.error)}%, acc=${formatValue(p.accuracy)}%, sev=${p.severity ?? '-'})`,
        )
        .join(' | ');
      facts.push(`Tahmin Hata Ozeti -> ${errorLine !== '' ? errorLine : 'Veri yok'}`);
    }

    const systemPrompt = `Sen Bee2 Forecasting Dashboard AI asistansisin.
Kurallar:
- Sadece saglanan FACTS blogundaki verileri kullan.
- Veri yoksa uydurma yapma; "bu veri su an mevcut degil" de.
- Cevaplari kisa, sayisal ve Turkce ver.
- Gerekirse maddeli ve aksiyon onerili cevap yaz.

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
