import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import { processWebhookPayload } from "@/services/webhook.service";

// Node.js runtime'da çalışmasını açıkça belirtiyoruz. (Edge değil)
export const dynamic = "force-dynamic";

// Vercel build crawler'ı bazen API rotalarını kontrol etmek için GET atabilir.
// "Failed to collect page data" hatasını önlemek için boş bir GET ekliyoruz.
export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is active. Only POST requests are accepted." });
}

export async function POST(req: NextRequest) {
  try {
    // 1. İtemSatış'a özel 2 mağaza ayrımı için URL Query Parametresi Okuma 
    // Örnek kullanım: /api/webhooks/itemsatis?store=MAGAZA_1
    const storeCode = req.nextUrl.searchParams.get("store");

    // 2. İstek gelir gelmez ham veriyi string/text olarak al
    const payloadRaw = await req.text();
    let payloadJson: any = null;

    // Sadece json olarak kaydedebilmek için güvenli parse denemesi. 
    try {
      payloadJson = JSON.parse(payloadRaw);
      // Hangi mağazadan geldiğini arka planda işleyebilmek için payload içine sızdırıyoruz
      if (payloadJson && typeof payloadJson === "object" && storeCode) {
        payloadJson._injected_store_code = storeCode;
      }
    } catch (e) {
      // JSON parse edilemese bile webhook kaybolmasın diye devam et
    }

    // 3. Hiçbir işlem yapmadan doğrudan PENDING olarak veritabanına logla
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: storeCode ? `ITEMSatis-${storeCode}` : "ITEMSatis",
        payloadRaw,
        payloadJson: payloadJson ?? {},
        status: "PENDING",
      },
    });

    // 3. Vercel waitUntil ile asenkron işlem başlat (HTTP yanıt süresini bloke etmez)
    // Bu sayede webhook processing işlemi Vercel arkasında (Background) devam eder.
    waitUntil(processWebhookPayload(webhookEvent.id));

    // 4. İtemSatış'a anında 200 OK dön. (Timeout veya gereksiz retries önlenir)
    return NextResponse.json({ success: true, eventId: webhookEvent.id }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook karşılama hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
