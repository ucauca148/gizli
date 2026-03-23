import { WebhookPayloadSchema } from "@/validators/itemsatis-webhook";
import { ParsedOrderData, ParsedProductData } from "@/types/itemsatis";

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
