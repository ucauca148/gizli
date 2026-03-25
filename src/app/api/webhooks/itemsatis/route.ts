import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import { processWebhookPayload } from "@/services/webhook.service";

// Node.js runtime'da çalışmasını açıkça belirtiyoruz. (Edge değil)
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is active. Only POST requests are accepted." });
}

export async function POST(req: NextRequest) {
  try {
    // 1. İtemSatış'a özel 2 mağaza ayrımı için URL Query Parametresi Okuma 
    const storeCode = req.nextUrl.searchParams.get("store");

    const payloadRaw = await req.text();
    let payloadJson: any = null;

    try {
      payloadJson = JSON.parse(payloadRaw);
      if (payloadJson && typeof payloadJson === "object" && storeCode) {
        payloadJson._injected_store_code = storeCode;
      }
    } catch (e) {
      // JSON parse edilemese bile webhook kaybolmasın diye devam et
    }

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: storeCode ? `ITEMSatis-${storeCode}` : "ITEMSatis",
        payloadRaw,
        payloadJson: payloadJson ?? {},
        status: "PENDING",
      },
    });

    // Vercel waitUntil ile asenkron işlem başlat (HTTP yanıt süresini bloke etmez)
    waitUntil(processWebhookPayload(webhookEvent.id));

    return NextResponse.json({ success: true, eventId: webhookEvent.id }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook karşılama hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
