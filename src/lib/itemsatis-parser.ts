import { WebhookPayloadSchema } from "@/validators/itemsatis-webhook";
import { ParsedOrderData, ParsedProductData } from "@/types/itemsatis";

function unixSecondsToDate(seconds: unknown): Date | undefined {
  if (seconds == null) return undefined;
  const n = typeof seconds === "string" ? Number(seconds) : Number(seconds);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

/**
 * `advert_sold` / "İlanınız Satıldı" tipi bildirimlerden Order tablosu için kayıt üretir.
 * Dashboard metrikleri `orders` tablosunu kullandığından bu akış zorunlu.
 */
export function extractSaleOrderFromPayload(
  payloadJson: any,
  eventId?: string
): ParsedOrderData | null {
  const details = payloadJson?.details;
  if (details?.test === true) return null;

  const eventName = String(details?.event || "").toLowerCase();
  const title = String(payloadJson?.title || "").toLowerCase();
  const looksLikeSale =
    eventName === "advert_sold" ||
    eventName === "sale" ||
    title.includes("satıldı");

  if (!looksLikeSale) return null;

  const advert = details?.advert;
  if (!advert?.id) return null;

  const advertId = String(advert.id);
  const timePart =
    details?.time != null
      ? String(details.time)
      : eventId
        ? eventId.replace(/-/g, "").slice(0, 12)
        : String(Date.now());
  const customerId =
    details?.customer?.id != null ? String(details.customer.id) : "0";

  const itemsatisOrderId = `IS-SALE-${advertId}-${timePart}-${customerId}`;
  const price = Number(advert.price ?? payloadJson?.amount ?? 0);
  const storeCode =
    payloadJson?._injected_store_code ||
    details?.seller?.name ||
    details?.seller?.username;

  const occurredAt = unixSecondsToDate(details?.time);

  const product: ParsedProductData = {
    itemsatisProductId: advertId,
    title: String(advert.title || "İlan"),
    price: Number.isFinite(price) ? price : 0,
    quantity: 1,
  };

  return {
    itemsatisOrderId,
    storeCode: storeCode ? String(storeCode) : undefined,
    totalAmount: product.price,
    status: "APPROVED",
    products: [product],
    occurredAt,
  };
}

/**
 * Gelen ham JSON payload'ını alır, eksik alanları tolere ederek (defensive)
 * standart bir formata (ParsedOrderData) dönüştürür.
 * 
 * @param payloadJson WebhookEvent tablosundan veya Request'ten gelen ham json
 */
export function extractOrderFromPayload(payloadJson: any): ParsedOrderData {
  // Zod ile güvenle parse et, olmayan alanlar undefined kalacak
  const safeData = WebhookPayloadSchema.parse(payloadJson || {});

  // Sipariş ID'si: data objesinde olabilir, root'ta olabilir
  const orderId = safeData.order_id || safeData.data?.order_id || `UNK-${Date.now()}`;
  
  // Tutar hesabı
  const amount = safeData.amount || safeData.data?.amount || 0;
  
  // Olay Tipi (Event Type) - Status belirlemek için önemli
  const eventType = (safeData.event_type || safeData.type || safeData.action || safeData.status || "created").toLowerCase();
  
  // Status Mapping
  let mappedStatus: "PENDING" | "APPROVED" | "CANCELLED" = "PENDING";
  if (eventType.includes("approve") || eventType.includes("success") || eventType.includes("completed")) {
    mappedStatus = "APPROVED";
  } else if (eventType.includes("cancel") || eventType.includes("fail") || eventType.includes("reject")) {
    mappedStatus = "CANCELLED";
  }

  // Ürünleri Çözümleme (Products array)
  const rawProducts = safeData.products && safeData.products.length > 0 
    ? safeData.products 
    : (safeData.data?.products || []);

  const parsedProducts: ParsedProductData[] = rawProducts.map((p: any) => ({
    itemsatisProductId: String(p.id || p.product_id || p.itemsatis_id || `PID-${Date.now()}`),
    title: String(p.title || p.name || "Bilinmeyen Ürün"),
    price: Number(p.price || p.amount || 0),
    quantity: Number(p.quantity || 1),
  }));

  // Eğer products array boşsa ama genel total bilgileri varsa "Bilinmeyen Ürün" olarak 1 adet mock ürün ekleyebiliriz (İsteğe bağlı)
  if (parsedProducts.length === 0 && amount > 0) {
    parsedProducts.push({
      itemsatisProductId: `PID-AUTO-${orderId}`,
      title: "Tanımsız Sepet Ürünü",
      price: amount,
      quantity: 1,
    });
  }

  // URL'den inject ettiğimiz `?store=XX` var mı? Yoksa payload içinden al
  const storeCode = safeData._injected_store_code || safeData.data?._injected_store_code || safeData.store_id || safeData.data?.store_id;

  return {
    itemsatisOrderId: orderId,
    storeCode: storeCode, // 2 mağaza ayrımı için
    totalAmount: amount,
    status: mappedStatus,
    products: parsedProducts,
  };
}
