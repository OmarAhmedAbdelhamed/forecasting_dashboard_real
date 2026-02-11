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

interface ChatRequestBody {
  message?: string;
  context?: string;
  history?: ChatMessage[];
  filters?: DashboardFilters;
}

interface InventoryKpisResponse {
  totalStockValue?: number;
  stockCoverageDays?: number;
  stockOutRiskItems?: number;
  excessInventoryItems?: number;
}

interface InventoryItemResponse {
  sku?: string;
  productName?: string;
  stockLevel?: number;
  forecastedDemand?: number;
  price?: number;
  status?: string;
  category?: string;
}

interface InventoryItemsResponse {
  items?: InventoryItemResponse[];
}

interface InventoryAlertResponse {
  severity?: string;
}

interface InventoryAlertsResponse {
  alerts?: InventoryAlertResponse[];
}

function appendArrayParam(url: URL, key: string, values?: string[]) {
  if (!Array.isArray(values)) {
    return;
  }

  values
    .map((value) => value.trim())
    .filter(Boolean)
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

    const openai = new OpenAI({ apiKey });

    const body = (await req.json()) as ChatRequestBody;
    const message = (body.message ?? '').trim();
    const context = body.context ?? '';
    const history = Array.isArray(body.history) ? body.history : [];
    const filters = body.filters;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    const [globalKPIs, globalItemsResponse, globalAlertsResponse] =
      await Promise.all([
        safeFetchJson<InventoryKpisResponse>(
          buildApiUrl('/api/inventory/kpis', filters, { days: 30 }),
        ),
        safeFetchJson<InventoryItemsResponse>(
          buildApiUrl('/api/inventory/items', filters, {
            days: 30,
            page: 1,
            limit: 120,
            sortBy: 'stockValue',
            sortOrder: 'desc',
          }),
        ),
        safeFetchJson<InventoryAlertsResponse>(
          buildApiUrl('/api/alerts/inventory', filters, {
            days: 30,
            limit: 200,
          }),
        ),
      ]);

    const globalAlerts = globalAlertsResponse?.alerts ?? [];
    const highSeverityAlerts = globalAlerts.filter((alert) => {
      const severity = (alert.severity ?? '').toLowerCase();
      return severity === 'high' || severity === 'critical';
    });

    const allInventoryItems = globalItemsResponse?.items ?? [];
    const productCatalog =
      allInventoryItems.length > 0
        ? allInventoryItems
            .map((item) => {
              const sku = item.sku ?? '-';
              const productName = item.productName ?? '-';
              const category = item.category ?? '-';
              const stockLevel = item.stockLevel ?? 0;
              const forecastedDemand = item.forecastedDemand ?? 0;
              const price = item.price ?? 0;
              const status = item.status ?? '-';
              return `SKU: ${sku} | Urun: ${productName} | Kategori: ${category} | Stok: ${String(stockLevel)} | Tahmin: ${String(forecastedDemand)} | Fiyat: ${String(price)} TL | Durum: ${status}`;
            })
            .join('\n')
        : 'Urun verisi alinamadi.';

    const totalStockValue = globalKPIs?.totalStockValue ?? 0;
    const stockCoverageDays = globalKPIs?.stockCoverageDays ?? 0;
    const stockOutRiskItems = globalKPIs?.stockOutRiskItems ?? 0;
    const excessInventoryItems = globalKPIs?.excessInventoryItems ?? 0;

    const systemPrompt = `Sen Bee2 Forecasting Dashboard icin bir AI asistansın. Kullanicilara envanter, satis tahminleri ve stok yonetimi konularinda yardimci oluyorsun.

Mevcut Sayfa Durumu (Kullanicinin Baktigi Ekran):
${context !== '' ? context : 'Henuz veri yuklenmedi'}

Tum Dashboard Ozeti (Genel Buyuk Resim):
- Toplam Stok Degeri: ${(totalStockValue / 1000000).toFixed(1)}M TL
- Stok Kapsam Suresi: ${stockCoverageDays.toFixed(1)} Gun
- Kritik Stok Riski (OOS): ${String(stockOutRiskItems)} Urun
- Fazla Stok (Overstock): ${String(excessInventoryItems)} Urun
- Aktif Alarm Sayisi: ${String(globalAlerts.length)} (Bunlarin ${String(highSeverityAlerts.length)} tanesi yuksek oncelikli)

Tum Urun Veritabani (Detayli Liste):
${productCatalog}

Gorevin:
- Kullanicinin sorularini Turkce olarak yanitla.
- Kullanici belirli bir urun, SKU veya genel stok durumu hakkinda sorarsa "Tum Urun Veritabani"ni kullan.
- Veri odakli, net ve kisa cevaplar ver.
- Sayilari Turkce formatinda goster (orn: 1.234,56).
- Profesyonel ama samimi bir ton kullan.

Onemli:
- Sadece yukaridaki API verisini kullanarak yanit ver.
- Veri bulunamayan durumda bunu acikca belirt.`;

    const messages: {
      role: 'system' | ChatRole;
      content: string;
    }[] = [{ role: 'system', content: systemPrompt }];

    history.slice(-6).forEach((msg) => {
      if (typeof msg.content !== 'string' || !msg.content.trim()) {
        return;
      }

      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response =
      completion.choices[0]?.message?.content ??
      'Uzgunum, yanit olusturamadim. Lutfen tekrar deneyin.';

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    const errorWithStatus = error as { status?: number };
    const status = errorWithStatus.status;

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
