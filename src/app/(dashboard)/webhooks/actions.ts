"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { extractSaleOrderFromPayload } from "@/lib/itemsatis-parser";
import { prisma } from "@/lib/prisma";

export async function cancelSaleFromWebhookAction(webhookEventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, message: "Oturum gerekli." };
  }

  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
  });
  if (!event?.payloadJson || typeof event.payloadJson !== "object") {
    return { ok: false as const, message: "Webhook kaydı bulunamadı." };
  }

  const payload = event.payloadJson as Record<string, unknown>;
  const details = (payload.details || {}) as { event?: string };
  const rawEv = String(details.event || "").toLowerCase();
  const dbEv = String(event.eventType || "").toLowerCase();
  const title =
    typeof payload.title === "string" ? payload.title.toLowerCase() : "";

  const isSale =
    dbEv === "sale" ||
    rawEv === "advert_sold" ||
    rawEv === "sale" ||
    title.includes("satıldı");

  if (!isSale) {
    return { ok: false as const, message: "Sadece satış bildirimleri iptal edilebilir." };
  }

  const saleOrder = extractSaleOrderFromPayload(payload, event.id);
  if (!saleOrder) {
    return {
      ok: false as const,
      message:
        "Bu kayıttan sipariş üretilemedi (test satışı veya eksik ilan bilgisi olabilir).",
    };
  }

  const order = await prisma.order.findUnique({
    where: { itemsatisOrderId: saleOrder.itemsatisOrderId },
  });

  if (!order) {
    return {
      ok: false as const,
      message:
        "Veritabanında bu satışa ait sipariş yok. Kayıt, sipariş kaydı gelmeden önceyse özet yansımaz.",
    };
  }

  if (order.status === "CANCELLED") {
    return { ok: false as const, message: "Bu satış zaten iptal olarak işaretli." };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    }),
    prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: "CANCELLED",
        errorMessage: "Panelden manuel iptal (sipariş CANCELLED).",
      },
    }),
  ]);

  revalidatePath("/webhooks");
  revalidatePath("/");
  revalidatePath("/products");

  return { ok: true as const, message: "Sipariş manuel iptal edildi; özet güncellendi." };
}
