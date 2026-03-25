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

export async function scrapeCompetitor(competitorId: string) {
  const competitor = await prisma.competitor.findUnique({ 
    where: { id: competitorId } 
  });
  
  if (!competitor) throw new Error("Rakip bulunamadı");

  // URL'den userId çek (İtemSatış: https://www.itemsatis.com/profil/123456/username.html)
  const match = competitor.url.match(/\/profil\/(\d+)\//);
  const userId = match ? match[1] : null;

  if (!userId) throw new Error("Mağaza ID'si (UserId) URL'den okunamadı. İtemSatış profil linki olduğundan emin olun.");

  // API'den yorumları çek (Page 1)
  const response = await fetch(`https://www.itemsatis.com/api/getProfileComments?userId=${userId}&page=1`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json"
    }
  });
  
  if (!response.ok) throw new Error(`İtemSatış API hatası: ${response.statusText}`);

  const data = await response.json();
  const comments = data.comments || [];

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let totalSalesIn24h = 0;
  const productDistribution: Record<string, number> = {};

  comments.forEach((comment: any) => {
    // "26 Mart 2025, 22:07"
    if (!comment.commentDate) return;
    
    const commentDate = parseTurkishDate(comment.commentDate);

    if (commentDate >= yesterday) {
      totalSalesIn24h++;
      const productName = comment.productName || "Bilinmeyen Ürün";
      productDistribution[productName] = (productDistribution[productName] || 0) + 1;
    }
  });

  // Analiz sonucunu kaydet
  return await prisma.competitorAnalysis.create({
    data: {
      competitorId,
      totalReviews: totalSalesIn24h,
      resultJson: productDistribution as any,
    }
  });
}
