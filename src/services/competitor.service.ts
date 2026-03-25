import { prisma } from "@/lib/prisma";
import { parseTurkishDate } from "@/lib/date-utils";

/**
 * URL'den veya HTML kaynağından sayısal UserId'yi bulur.
 */
async function resolveUserId(url: string): Promise<string | null> {
  // 1. Önce URL'den bulmaya çalış (Eski tip linkler: /profil/12345/isim)
  const urlMatch = url.match(/\/profil\/(\d+)\//);
  if (urlMatch) return urlMatch[1];

  // 2. Eğer /p/KullaniciAdi şeklindeyse sayfayı çekip içinden bul
  try {
    const response = await fetch(url.split("?")[0], { // Query parametrelerini temizle
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html"
      }
    });
    const html = await response.text();

    // Farklı patternları tek tek dene
    const patterns = [
      /UserId\s*[:=]\s*(\d+)/i,                 // JS değişkeni veya JSON
      /data-user-id\s*=\s*["'](\d+)["']/i,      // HTML attribute
      /profileUserId\s*=\s*(\d+)/i,             // Başka bir JS değişkeni
      /getProfileComments\?UserId=(\d+)/i,      // API çağrısı içindeki ID
      /reportProfile\((\d+)\)/i                 // Fonksiyon çağrısı içindeki ID
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
  } catch (e) {
    console.error("UserId çözümlenirken hata oluştu:", e);
  }

  return null;
}

export async function addCompetitor(name: string, url: string, platform: string = "itemsatis") {
  return await prisma.competitor.create({
    data: { name, url, platform }
  });
}

export async function deleteCompetitor(id: string) {
  return await prisma.competitor.delete({
    where: { id }
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
 * Rakip mağazanın son X günlük satışlarını (yorumlarını) sayfalama ile tarar.
 */
export async function scrapeCompetitor(competitorId: string, days: number = 30) {
  const competitor = await prisma.competitor.findUnique({ 
    where: { id: competitorId } 
  });
  
  if (!competitor) throw new Error("Rakip bulunamadı");

  // Sayısal UserId çözümleniyor...
  const userId = await resolveUserId(competitor.url);

  if (!userId) {
    throw new Error("Mağaza ID'si (UserId) okunamadı. Lütfen tam profil linkini girin (Örn: https://www.itemsatis.com/p/MağazaAdı)");
  }

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let page = 1;
  let hasMore = true;
  let totalSalesInPeriod = 0;
  const productData: Record<string, { title: string, link: string, count: number }> = {};

  while (hasMore) {
    const response = await fetch(`https://www.itemsatis.com/api/getProfileComments?UserId=${userId}&PageNumber=${page}&sekme=degerlendirmeler`, {
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
    if (page > 30) break; // Maksimum 30 sayfa tara
  }

  return await prisma.competitorAnalysis.create({
    data: {
      competitorId,
      totalReviews: totalSalesInPeriod,
      resultJson: productData as any,
    }
  });
}
