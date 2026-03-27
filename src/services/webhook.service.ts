import { prisma } from "@/lib/prisma";
import { extractOrderFromPayload } from "@/lib/itemsatis-parser";
import { upsertOrderAndItems } from "./order.service";

function inferEventType(payload: any): string {
  const direct = String(
    payload?.event ||
      payload?.event_type ||
      payload?.type ||
      payload?.action ||
      payload?.details?.event ||
      ""
  )
    .trim()
    .toLowerCase();

  if (direct) {
    if (direct === "advert_sold") return "sale";
    return direct;
  }

  const text = `${payload?.title || ""} ${payload?.content || ""}`.toLowerCase();

  if (text.includes("satıldı") || text.includes("satış")) return "sale";
  if (text.includes("iade")) return "refund";
  if (text.includes("değerlendirme") || text.includes("yorum")) return "new_review";
  if (text.includes("iptal")) return "cancelled";

  return "unknown";
}

/**
 * waitUntil() tarafından arka planda (Background) çalıştırılan webhook işleme fonksiyonu
 */
export async function processWebhookPayload(eventId: string) {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    const payload = event.payloadJson as any;

    // Basit doğrulama: Gelen veri geçerli bir obje değilse FAILED yap
    if (!payload || typeof payload !== "object") {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: "FAILED",
          errorMessage: "Payload JSON formatında değil veya boş.",
          processedAt: new Date(),
        },
      });
      return;
    }

    // Esnek Event Tipi Belirleme (details.event + title/content fallback)
    const eventType = inferEventType(payload);
    
    // Geçici "UNMAPPED" akışı: Bilinen eventler listesinde yoksa güvenle logla, hata fırlatma
    const knownEvents = [
      "order.created",
      "order.approved",
      "order.cancelled",
      "product.out_of_stock",
      "sale",
      "refund",
      "new_review",
      "cancelled",
    ];
    
    if (!knownEvents.includes(eventType)) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: "UNMAPPED", // İstek başarıyla loglandı, ancak sistem şimdilik bu event tipini işlemiyor.
          errorMessage: "Webhook alındı ancak olay tipi sınıflandırılamadı.",
          processedAt: new Date(),
        },
      });
      return;
    }

    // itemsatis bildirim eventleri sipariş şemasında olmayabilir; logu işlenmiş sayıp çık.
    if (eventType === "sale" || eventType === "new_review") {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: "PROCESSED",
          errorMessage: null,
          processedAt: new Date(),
        },
      });
      return;
    }

    if (eventType === "refund" || eventType === "cancelled") {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: "CANCELLED",
          errorMessage: null,
          processedAt: new Date(),
        },
      });
      return;
    }

    // Parser ile ham Payload JSON dizilimini güvenli ve parse edilmiş formata çeker
    const parsedOrderData = extractOrderFromPayload(payload);

    // Siparişi ve içerdiği ürünleri idempotent olarak Upsert yapar
    await upsertOrderAndItems(parsedOrderData);

    // İşlem tamamen başarılıysa PROCESSED olarak işaretle
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        eventType,
        status: "PROCESSED",
        errorMessage: null,
        processedAt: new Date(),
      },
    });

  } catch (error: any) {
    console.error(`Webhook işleme hatası (ID: ${eventId}):`, error);
    
    // İşlem sırasında uygulama/veritabanı çatlarsa logunu FAILED yap
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: "FAILED",
        errorMessage: error.message || "Bilinmeyen asenkron işlem hatası",
        processedAt: new Date(),
      },
    });
  }
}
