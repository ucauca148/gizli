import { prisma } from "@/lib/prisma";
import { ParsedOrderData } from "@/types/itemsatis";
import { upsertProduct } from "./product.service";

/**
 * Webhook üzerinden gelen siparişi ve içindeki ürünleri 
 * idempotent şekilde (duplicate yaratmadan) veritabanına işler.
 */
export async function upsertOrderAndItems(orderData: ParsedOrderData) {
  // Gelen verideki eksik alanlara karşı defensive yaklaşım
  if (!orderData.itemsatisOrderId) {
    throw new Error("Sipariş ID (itemsatisOrderId) bulunamadı. Sipariş kaydedilemez.");
  }

  // 2 Mağaza için Webhook URL'sine eklenen ?store=XXXX parametresini okuyoruz
  let targetStore: any;
  
  if (orderData.storeCode) {
    // Parametre ile gelen koda sahip mağazayı bul
    targetStore = await prisma.store.findUnique({
       where: { storeCode: orderData.storeCode }
    });
    
    // Eğer o mağaza henüz sistemde (veritabanında) yoksa anında oluştur!
    if (!targetStore) {
      targetStore = await prisma.store.create({
         data: { name: `İtemSatış Mağazası (${orderData.storeCode})`, storeCode: orderData.storeCode }
      });
    }
  } else {
    // Hatalı/Eksik bir URL ile gelinmişse (store parametresi unutulmuşsa) ilk mağazaya atar
    targetStore = await prisma.store.findFirst();
    if (!targetStore) {
      targetStore = await prisma.store.create({
        data: { name: "Varsayılan Ana Mağaza", storeCode: "DEFAULT_STORE" }
      });
    }
  }

  const targetStoreId = targetStore.id;

  // 1. Önce order (Sipariş) gövdesini oluştur veya güncelle (Upsert - Idempotent pattern)
  const order = await prisma.order.upsert({
    where: { itemsatisOrderId: orderData.itemsatisOrderId },
    update: {
      // Sadece durumu ve tutarı güncelle, createdAt sabit kalır.
      status: orderData.status,
      totalAmount: orderData.totalAmount || 0,
    },
    create: {
      storeId: targetStoreId,
      itemsatisOrderId: orderData.itemsatisOrderId,
      status: orderData.status,
      totalAmount: orderData.totalAmount || 0,
      ...(orderData.occurredAt ? { createdAt: orderData.occurredAt } : {}),
    },
  });

  // 2. Siparişin içindeki ürünleri döngü ile kaydet/güncelle ve siparişe bağla
  if (Array.isArray(orderData.products)) {
    for (const prodItem of orderData.products) {
      if (!prodItem.itemsatisProductId) continue; // Ürün id yoksa atla
      
      // Ürünü veritabanına ekle veya fiyatını vb. güncelle
      const product = await upsertProduct(targetStoreId, prodItem);

      // OrderItem (Sipariş Detayı) için Duplicate kaydı önlemek adına findFirst yapıyoruz
      const existingOrderItem = await prisma.orderItem.findFirst({
        where: {
          orderId: order.id,
          productId: product.id,
        }
      });

      if (existingOrderItem) {
        // Zaten eklenmişse miktar veya birim fiyatını güncelleyebiliriz
        await prisma.orderItem.update({
          where: { id: existingOrderItem.id },
          data: {
            quantity: prodItem.quantity || 1,
            unitPrice: prodItem.price || 0,
          }
        });
      } else {
        // Yeni ekliyorsak bağla
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: prodItem.quantity || 1,
            unitPrice: prodItem.price || 0,
          }
        });
      }
    }
  }

  return order;
}
