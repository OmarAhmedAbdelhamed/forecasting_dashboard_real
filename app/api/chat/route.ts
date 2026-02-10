import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getInventoryKPIs,
  generateInventoryAlerts,
  generateInventoryItems,
  PROMOTION_HISTORY_DATA,
} from '@/data/mock-data';
import { InventoryAlert } from '@/types/inventory';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'OPENAI_API_KEY tanimli degil. Vercel/ortam degiskenlerinden ekleyin.',
        },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const { message, context, history } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    // Generate Global Intelligence
    const globalKPIs = getInventoryKPIs([], [], []);
    const globalAlerts = generateInventoryAlerts([], []);
    const highSeverityAlerts = globalAlerts.filter(
      (a: InventoryAlert) => a.severity === 'high',
    );
    // Generate Full Product Catalog (concise format)
    const allInventoryItems = generateInventoryItems([], [], [], []);
    const productCatalog = allInventoryItems
      .map(
        (i) =>
          `SKU: ${i.sku} | Ürün: ${i.productName} | Stok: ${i.stockLevel} | Tahmin: ${i.forecastedDemand} | Fiyat: ${i.price}TL | Durum: ${i.status}`,
      )
      .join('\n');

    // Build system prompt with both specific context and global intelligence
    const systemPrompt = `Sen Bee2 Forecasting Dashboard için bir AI asistanısın. Kullanıcılara envanter, satış tahminleri ve stok yönetimi konularında yardımcı oluyorsun.

Mevcut Sayfa Durumu (Kullanıcının Baktığı Ekran):
${context || 'Henüz veri yüklenmedi'}

Tüm Dashboard Özeti (Genel Büyük Resim):
- Toplam Stok Değeri: ${(globalKPIs.totalStockValue / 1000000).toFixed(1)}M TL
- Stok Kapsam Süresi: ${globalKPIs.stockCoverageDays.toFixed(1)} Gün
- Kritik Stok Riski (OOS): ${globalKPIs.stockOutRiskItems} Ürün
- Fazla Stok (Overstock): ${globalKPIs.excessInventoryItems} Ürün
- Aktif Alarm Sayısı: ${globalAlerts.length} (Bunların ${highSeverityAlerts.length} tanesi Yüksek Öncelikli)

Tüm Ürün Veritabanı (Detaylı Liste):
${productCatalog}

Görevin:
- Kullanıcı sorularını Türkçe olarak yanıtla.
- Kullanıcı belirli bir ürün, SKU veya genel stok durumu hakkında sorarsa "Tüm Ürün Veritabanı"nı kullan.
- Veri odaklı, net ve kısa cevaplar ver.
- Sayıları Türkçe formatında göster (örn: 1.234,56).
- Profesyonel ama samimi bir ton kullan.

Önemli: Artık şirketteki TÜM ürünlerin verisine sahipsin. Kullanıcı "X ürününden ne kadar var?" veya "Hangi ürünler stok dışı?" diye sorduğunda aşağıdaki listeden kontrol edip net cevap ver.`;

    // Build messages array
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history (last 3 exchanges)
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response =
      completion.choices[0]?.message?.content ||
      'Üzgünüm, yanıt oluşturamadım. Lütfen tekrar deneyin.';

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'API anahtarı geçersiz' },
        { status: 401 },
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}
