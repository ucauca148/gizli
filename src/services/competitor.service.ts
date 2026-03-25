import { prisma } from "@/lib/prisma";
import { parseTurkishDate } from "@/lib/date-utils";

export async function addCompetitor(name: string, url: string, platform: string = "itemsatis") {
  return await prisma.competitor.create({
    data: { name, url, platform }
  });
}

export async function getCompetitors() {
  return await prisma.competitor.findMany({
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Rakip mağazanın son X günlük satışlarını (orumlarını) sayfalama ile tarar.
 */
export async function scrapeCompetitor(competitorId: string, days: number = 30) {
  const competitor = await prisma.competitor.findUnique({ 
    where: { id: competitorId } 
  });
  
  if (!competitor) throw new Error("Rakip bulunamadı");

  // URL'den userId çek (İtemSatış: https://www.itemsatis.com/profil/123456/username.html)
  const match = competitor.url.match(/\/profil\/(\d+)\//);
  const userId = match ? match[1] : null;

  if (!userId) throw new Error("Mağaza ID'si (UserId) URL'den okunamadı. İtemSatış profil linki olduğundan emin olun.");

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let page = 1;
  let hasMore = true;
  let totalSalesInPeriod = 0;
  
  // Ürün bazlı detaylı dağılım (Her ürünün linkini ve satış sayısını saklar)
  const productData: Record<string, { title: string, link: string, count: number }> = {};

  while (hasMore) {
    // API'den bir sayfadaki yorumları çek
    const response = await fetch(`https://www.itemsatis.com/api/getProfileComments?userId=${userId}&PageNumber=${page}&sekme=degerlendirmeler`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) break;

    const resJson = await response.json();
    const comments = resJson.data || [];

    if (comments.length === 0) break;

    for (const comment of comments) {
      // "23 Mart 2026 , 18:53" ( virgüllü veya virgulsüz formatı destekler)
      const dateStr = comment.Datetime ? comment.Datetime.replace(/ , /g, " ") : ""; 
      const commentDate = parseTurkishDate(dateStr);

      if (commentDate < cutoffDate) {
        hasMore = false;
        break;
      }

      totalSalesInPeriod++;
      const advertId = comment.advertID || comment.AdvertId;
      const title = comment.SeoTitle || "Bilinmeyen Ürün";
      const category = comment.SeoCategoryName || "urun";
      
      const productKey = `${advertId}`;
      if (!productData[productKey]) {
        productData[productKey] = {
          title: title.replace(/-/g, " "),
          link: `https://www.itemsatis.com/${category}/${title}-${advertId}.html`,
          count: 0
        };
      }
      productData[productKey].count++;
    }

    page++;
    // Güvenlik sınırı (Çok fazla sayfa olmasını önler)
    if (page > 20) break; 
  }

  // Analiz sonucunu kaydet
  return await prisma.competitorAnalysis.create({
    data: {
      competitorId,
      totalReviews: totalSalesInPeriod,
      resultJson: productData as any,
    }
  });
}
