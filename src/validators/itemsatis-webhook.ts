import { z } from "zod";

/**
 * İtemSatış'tan gelen webhook verilerinin resmi ve statik bir dökümantasyonu 
 * (veya değişmez bir şeması) olmadığını varsayarak "defensive" (savunmacı) 
 * bir Zod şeması tanımlıyoruz.
 * 
 * Amaç: Eksik, farklı formatta veya beklenmeyen bir tip geldiğinde çökmeyi engellemek.
 */
export const WebhookPayloadSchema = z.object({
  // Event Tipini bulmak için muhtemel alanlar
  event_type: z.string().optional(),
  type: z.string().optional(),
  action: z.string().optional(),
  status: z.string().optional(),

  // order_id number da gelebilir string de, string olarak dönüştürüyoruz
  order_id: z.union([z.string(), z.number()])
    .transform((val) => String(val))
    .optional(),

  // store / mağaza tanımlayıcısı, genelde "seller_id" falan olabilir
  store_id: z.union([z.string(), z.number()])
    .transform((val) => String(val))
    .optional(),

  // Tutar float, int veya string gelebilir, number'a çevirmeye çalış yoksa 0 ata
  amount: z.union([z.number(), z.string()])
    .transform((val) => Number(val))
    .catch(0)
    .optional(),

  // Sipariş içeriğindeki ürünlerin listesi
  products: z.array(z.any()).optional().catch([]),

  // "data" adında nested bir object içine de koymuş olabilirler
  data: z.any().optional(),

  // Bizim 2 mağaza için özel eklediğimiz injection (Parametre)
  _injected_store_code: z.string().optional(),

}).passthrough(); // Tanımlamadığımız diğer tüm key'lerin geçmesine izin ver

export type ValidatedWebhookPayload = z.infer<typeof WebhookPayloadSchema>;
