import { prisma } from "@/lib/prisma";
import { ParsedProductData } from "@/types/itemsatis";

/**
 * Ürünü veritabanına ekler veya günceller (Upsert).
 * Her siparişte ürün bilgisi güncel gelir varsayımıyla price ve title güncellenir.
 * 
 * @param storeId Hangi mağazaya ait olduğu
 * @param productData Parsed edilmiş ürün datası
 */
export async function upsertProduct(storeId: string, productData: ParsedProductData) {
  return await prisma.product.upsert({
    where: { 
      itemsatisProductId: productData.itemsatisProductId 
    },
    update: {
      title: productData.title || "Bilinmeyen Ürün", // İsim değişmiş olabilir
      price: productData.price || 0,                 // Fiyat güncellenmiş olabilir
      lastSaleDate: new Date(),                      // Son satılma tarihini güncelle
    },
    create: {
      storeId,
      itemsatisProductId: productData.itemsatisProductId,
      title: productData.title || "Bilinmeyen Ürün",
      price: productData.price || 0,
      status: "ACTIVE",
      lastSaleDate: new Date(),
    },
  });
}
