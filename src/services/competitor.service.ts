import { prisma } from "@/lib/prisma";
import { parseTurkishDate } from "@/lib/date-utils";

/**
 * İtemSatış profil sayfalarından sayısal UserId'yi bulur.
 */
async function resolveUserId(url: string): Promise<string | null> {
  const urlMatch = url.match(/\/profil\/(\d+)\//);
  if (urlMatch) return urlMatch[1];

  try {
    const cleanUrl = url.split("?")[0];
    const response = await fetch(cleanUrl, {
      cache: "no-store", // Vercel önbelleğini devre dışı bırak
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html"
      }
    });
    if (!response.ok) return null;
    
    const html = await response.text();

    const patterns = [
      /btn-follow["']\s+data-id=["'](\d+)["']/i,
      /data-id=["'](\d+)["']/i,
      /UserId\s*[:=]\s*["']?(\d+)["']?/i,
      /getProfileComments\?UserId=(\d+)/i,
      /reportProfile\((\d+)\)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
  } catch (e) {
    console.error("UserId çözümleme hatası:", e);
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

export async function scrapeCompetitor(competitorId: string, days: number = 30) {
  console.log(`[Scraper] Rakip ID ${competitorId} için tarama başlatıldı (${days} gün)`);
  
  const competitor = await prisma.competitor.findUnique({ 
    where: { id: competitorId } 
  });
  
  if (!competitor) throw new Error("Rakip bulunamadı");

  const userId = await resolveUserId(competitor.url);
  console.log(`[Scraper] Çözümlenen UserId: ${userId}`);

  if (!userId) {
    throw new Error("Mağaza ID'si (UserId) okunamadı. Lütfen tam profil linkini girin.");
  }

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let page = 1;
  let hasMore = true;
  let totalSalesInPeriod = 0;
  const productData: Record<string, { title: string, link: string, count: number }> = {};

  while (hasMore) {
    console.log(`[Scraper] Sayfa ${page} çekiliyor...`);
    const response = await fetch(`https://www.itemsatis.com/api/getProfileComments?UserId=${userId}&PageNumber=${page}&sekme=degerlendirmeler`, {
      cache: "no-store", // KRİTİK: Önbelleği kapat
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
        console.error(`[Scraper] Sayfa ${page} hatası: ${response.status}`);
        break;
    }

    const resJson = await response.json();
    const comments = resJson.data || resJson.comments || [];
    console.log(`[Scraper] Sayfa ${page} üzerinden ${comments.length} yorum alındı.`);

    if (comments.length === 0) break;

    for (const comment of comments) {
      const dateStr = comment.Datetime ? comment.Datetime.replace(/ , /g, " ") : ""; 
      const commentDate = parseTurkishDate(dateStr);
      
      const isFixed = comment.IsFixed === 1 || comment.IsFixed === "1";

      console.log(`[Item] Date: ${dateStr} | Parsed: ${commentDate.toISOString()} | IsFixed: ${isFixed}`);

      // Eğer yorum sabitlenmiş değilse ve cutoff'tan eskiyse döngüyü kır
      if (!isFixed && commentDate < cutoffDate) {
        console.log(`[Scraper] Cutoff tarihine (${cutoffDate.toISOString()}) ulaşıldı. Döngü kırılıyor.`);
        hasMore = false;
        break;
      }

      // Sadece tarih aralığındakileri say
      if (commentDate >= cutoffDate) {
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
    }

    page++;
    if (page > 30) {
        console.log("[Scraper] Maksimum sayfa sınırına ulaşıldı.");
        break; 
    }
  }

  console.log(`[Scraper] Analiz tamamlandı. Toplam Satış: ${totalSalesInPeriod}`);

  return await prisma.competitorAnalysis.create({
    data: {
      competitorId,
      totalReviews: totalSalesInPeriod,
      resultJson: productData as any,
    }
  });
}
