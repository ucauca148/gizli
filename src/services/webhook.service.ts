import { prisma } from "@/lib/prisma";
import { extractOrderFromPayload } from "@/lib/itemsatis-parser";
import { upsertOrderAndItems } from "./order.service";

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

    // Esnek Event Tipi Belirleme (İtemSatış şeması belirsiz olduğu için varsayımlar)
    const eventType = payload.event_type || payload.type || payload.action || "UNKNOWN";
    
    // Geçici "UNMAPPED" akışı: Bilinen eventler listesinde yoksa güvenle logla, hata fırlatma
    const knownEvents = ["order.created", "order.approved", "order.cancelled"];
    
    if (!knownEvents.includes(eventType)) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: "UNMAPPED", // İstek başarıyla loglandı, ancak sistem şimdilik bu event tipini işlemiyor.
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
