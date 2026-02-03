import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, context, history } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    // Build system prompt with dashboard context
    const systemPrompt = `Sen Bee2 Forecasting Dashboard için bir AI asistanısın. Kullanıcılara envanter, satış tahminleri ve stok yönetimi konularında yardımcı oluyorsun.

Mevcut Dashboard Durumu:
${context || 'Henüz veri yüklenmedi'}

Görevin:
- Kullanıcı sorularını Türkçe olarak yanıtla
- Dashboard verilerini kullanarak spesifik, veri odaklı içgörüler sun
- Kısa ve öz cevaplar ver (maksimum 3-4 cümle)
- Sayıları Türkçe formatında göster (örn: 1.234,56)
- Eğer veri yoksa, genel tavsiyeler ver
- Profesyonel ama samimi bir ton kullan

Önemli: Sadece envanter, satış, tahmin ve stok yönetimi konularında yardımcı ol. Diğer konularda "Bu konuda yardımcı olamam, sadece dashboard verileriniz hakkında sorular yanıtlayabilirim" de.`;

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
