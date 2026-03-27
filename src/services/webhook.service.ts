import { prisma } from "@/lib/prisma";
import { extractOrderFromPayload } from "@/lib/itemsatis-parser";
import { upsertOrderAndItems } from "./order.service";

type EventResolution = {
  status:
    | "PROCESSED"
    | "CANCELLED"
    | "UNMAPPED"
    | "ACTION_REQUIRED"
    | "INFO";
  errorMessage?: string | null;
};

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

function compactReviewScore(payload: any): string {
  const rating = payload?.details?.review?.rating || {};
  const i = rating.iletisim ?? "-";
  const t = rating.teslimat ?? "-";
  const m = rating.memnuniyet ?? "-";
  const g = rating.guvenilirlik ?? "-";
  return `İ:${i} T:${t} M:${m} G:${g}`;
}

function resolveEventOutcome(eventType: string, payload: any): EventResolution {
  if (eventType === "sale" || eventType === "order.created" || eventType === "order.approved") {
    return { status: "PROCESSED", errorMessage: null };
  }

  if (eventType === "refund" || eventType === "cancelled" || eventType === "order.cancelled") {
    return { status: "CANCELLED", errorMessage: "İşlem iade/iptal olarak bildirildi." };
  }

  if (eventType === "question_asked") {
    const question = payload?.details?.question?.message || payload?.content || "Yeni soru alındı.";
    return { status: "ACTION_REQUIRED", errorMessage: question };
  }

  if (eventType === "sms_sent") {
    const message = payload?.details?.message || payload?.content || "SMS bildirimi alındı.";
    return { status: "INFO", errorMessage: message };
  }

  if (eventType === "stock_finished" || eventType === "product.out_of_stock") {
    const advert = payload?.details?.advert || {};
    const advertId = advert?.id ? String(advert.id) : null;
    const advertTitle = advert?.title ? String(advert.title) : "İlan";
    const link = advertId ? `https://www.itemsatis.com/search?keyword=${encodeURIComponent(advertId)}` : "";
    return {
      status: "ACTION_REQUIRED",
      errorMessage: link
        ? `${advertTitle} stoğu tükendi. İlan ID: ${advertId}. Kontrol: ${link}`
        : `${advertTitle} stoğu tükendi.`,
    };
  }

  if (eventType === "review_received" || eventType === "new_review") {
    return { status: "PROCESSED", errorMessage: compactReviewScore(payload) };
  }

  if (eventType === "withdrawal_approved") {
    const detailsRaw = payload?.details?.data?.details;
    let amount = payload?.details?.data?.amount;
    let withdrawalId = payload?.details?.data?.withdrawal_id;
    let bankName = payload?.details?.data?.bank_name;

    if (typeof detailsRaw === "string") {
      try {
        const parsed = JSON.parse(detailsRaw);
        amount = amount ?? parsed?.amount;
        withdrawalId = withdrawalId ?? parsed?.withdrawal_id;
        bankName = bankName ?? parsed?.bank_name;
      } catch {
        // ignore parse failure
      }
    }

    const amountText = amount != null ? `${Number(amount).toFixed(2)} TL` : "Tutar bilinmiyor";
    const idText = withdrawalId ? `ID:${withdrawalId}` : "ID:bilinmiyor";
    const bankText = bankName ? `Banka:${bankName}` : "";
    return { status: "PROCESSED", errorMessage: `${idText} ${amountText} ${bankText}`.trim() };
  }

  if (eventType === "doping_expired") {
    const doping = payload?.details?.doping_name || payload?.details?.doping_type || "Doping";
    const advertTitle = payload?.details?.advert?.title || "İlan";
    return { status: "ACTION_REQUIRED", errorMessage: `${advertTitle} için ${doping} süresi doldu.` };
  }

  return { status: "UNMAPPED", errorMessage: "Webhook alındı ancak olay tipi sınıflandırılamadı." };
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
      "question_asked",
      "sms_sent",
      "stock_finished",
      "review_received",
      "withdrawal_approved",
      "doping_expired",
    ];
    
    if (!knownEvents.includes(eventType)) {
      const unresolved = resolveEventOutcome("unknown", payload);
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: unresolved.status,
          errorMessage: unresolved.errorMessage,
          processedAt: new Date(),
        },
      });
      return;
    }

    // Sipariş akışına bağlı olmayan eventleri sonuçlandır.
    if (
      eventType === "sale" ||
      eventType === "new_review" ||
      eventType === "question_asked" ||
      eventType === "sms_sent" ||
      eventType === "stock_finished" ||
      eventType === "review_received" ||
      eventType === "withdrawal_approved" ||
      eventType === "doping_expired"
    ) {
      const outcome = resolveEventOutcome(eventType, payload);
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          eventType,
          status: outcome.status,
          errorMessage: outcome.errorMessage ?? null,
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
        errorMessage: resolveEventOutcome(eventType, payload).errorMessage ?? null,
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
