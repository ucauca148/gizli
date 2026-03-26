import { parse } from "node-html-parser";

export interface ListingItem {
  title: string;
  storeName: string;
  price: number;
  featured: boolean;
  rank: number; // Global rank on the page
}

export async function scrapeCategory(url: string, page: number = 1): Promise<ListingItem[]> {
  const cleanUrl = url.includes("?") ? url.split("?")[0] : url;
  const targetUrl = `${cleanUrl}?page=${page}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html"
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const root = parse(html);
    
    // İtemSatış ilan kartlarını bul (Browser subagent verisine dayanarak)
    // Kartlar genelde <a> tagi içinde veya bir div içinde bir grup class ile gelir.
    const productCards = root.querySelectorAll("div.flex.flex-col.h-full");
    
    const items: ListingItem[] = [];
    let currentRank = (page - 1) * 36 + 1; // Sayfa başına genelde 36 ilan var

    productCards.forEach((card) => {
      // Başlık
      const titleEl = card.querySelector("h4") || card.querySelector(".text-sm.font-bold");
      const title = titleEl?.text.trim() || "";

      // Fiyat (Örn: 1.500,00 ₺)
      const priceEl = card.querySelector("price") || card.querySelector(".text-xl.font-black");
      let price = 0;
      if (priceEl) {
        const priceStr = priceEl.text.replace(/[^0-9,]/g, "").replace(",", ".");
        price = parseFloat(priceStr);
      }

      // Mağaza İsmi (Profil linkinden)
      const storeLink = card.querySelector("a[href*='/profil/'], a[href*='/p/']");
      let storeName = "";
      if (storeLink) {
        const href = storeLink.getAttribute("href") || "";
        // /p/StoreName veya /profil/StoreName.html formatından ismi ayıkla
        storeName = href.split("/").pop()?.replace(".html", "") || "";
      }

      if (title && storeName) {
        items.push({
          title,
          storeName,
          price,
          featured: !!card.querySelector(".featured-badge"), // Opsiyonel: öne çıkarılmış mı?
          rank: currentRank++
        });
      }
    });

    return items;
  } catch (e) {
    console.error("Scraping error:", e);
    return [];
  }
}

export async function findMyRanks(categoryUrl: string, myStoreName: string, maxPages: number = 3) {
  const allResults: ListingItem[] = [];
  const myResults: ListingItem[] = [];
  let cheapestOverall = Infinity;

  for (let p = 1; p <= maxPages; p++) {
    const pageItems = await scrapeCategory(categoryUrl, p);
    if (pageItems.length === 0) break;

    pageItems.forEach(item => {
      if (item.price > 0 && item.price < cheapestOverall) {
        cheapestOverall = item.price;
      }
      
      // Store name kontrolü (Küçük/Büyük harf duyarsız)
      if (item.storeName.toLowerCase() === myStoreName.toLowerCase()) {
        myResults.push(item);
      }
      allResults.push(item);
    });
  }

  return {
    myRankings: myResults,
    marketCheapest: cheapestOverall,
    totalPagesScanned: maxPages
  };
}
