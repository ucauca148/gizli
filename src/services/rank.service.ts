import { parse } from "node-html-parser";

export interface MyListing {
  title: string;
  url: string;
  price: number;
  category: string;
}

export interface RankResult {
  myListings: MyListing[];
  marketCheapest: number;
  totalListings: number;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html",
};

/**
 * Fetches all active listings for a store from their profile page.
 * Filters by a category keyword (partial URL slug match).
 */
export async function findMyRanks(
  categoryUrl: string,
  myStoreName: string,
  _maxPages: number = 3
): Promise<RankResult> {
  // Extract category slug from URL, e.g. 'geforce-now-hesaplari'
  const urlParts = categoryUrl.replace(/\.html$/, "").split("/");
  const categorySlug = urlParts[urlParts.length - 1]; // e.g. 'geforce-now-hesaplari'

  // Fetch user profile page
  const profileUrl = `https://www.itemsatis.com/profil/${myStoreName}.html`;
  let html = "";
  try {
    const res = await fetch(profileUrl, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    console.error("[RankService] Profile fetch error:", e.message);
    return { myListings: [], marketCheapest: 0, totalListings: 0 };
  }

  // Find all numeric-ID listing URLs (format: /category/title-NNNNN.html)
  const allListingMatches = Array.from(
    html.matchAll(/href=["'](\/[^"']+?-\d{4,8}\.html)["']/g)
  ).map((m) => m[1]);

  const uniqueListings = Array.from(new Set(allListingMatches));

  // Filter to match our target category slug (partial match)
  // e.g. 'geforce-now-hesaplari' -> match listings with 'geforce-now' in URL
  const categoryKeywords = categorySlug
    .split("-")
    .slice(0, 2)
    .join("-"); // 'geforce-now' from 'geforce-now-hesaplari'

  const myListingUrls = uniqueListings.filter((u) =>
    u.includes(categoryKeywords)
  );

  if (myListingUrls.length === 0) {
    // Fallback: return all listings
    console.warn(
      `[RankService] No listings found for '${categoryKeywords}'. Found categories:`,
      Array.from(new Set(uniqueListings.map((u) => u.split("/")[1])))
    );
    return { myListings: [], marketCheapest: 0, totalListings: 0 };
  }

  // Fetch each listing page to get its price and title
  const myListings: MyListing[] = [];

  for (const relUrl of myListingUrls.slice(0, 20)) {
    try {
      const fullUrl = `https://www.itemsatis.com${relUrl}`;
      const res = await fetch(fullUrl, { headers: HEADERS });
      if (!res.ok) continue;
      const listingHtml = await res.text();

      // Extract price - look for common price patterns
      const priceMatch =
        listingHtml.match(/["']fiyat["']\s*[:>]\s*["']?([\d.,]+)["']?/i) ||
        listingHtml.match(
          /<[^>]*(?:price|fiyat)[^>]*>\s*([\d.,]+)\s*(?:₺|TL)/i
        ) ||
        listingHtml.match(
          /(?:Fiyat|Price|Satış Fiyatı)[^<]*<[^>]+>([\d.,]+)/i
        ) ||
        listingHtml.match(/([\d.,]+)\s*₺/);

      let price = 0;
      if (priceMatch) {
        const raw = priceMatch[1].replace(/\./g, "").replace(",", ".");
        price = parseFloat(raw);
      }

      // Extract title
      const titleMatch =
        listingHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
        listingHtml.match(/<title>([^<|]+)/i);
      const title = titleMatch
        ? titleMatch[1].trim().substring(0, 100)
        : relUrl.split("/").pop() || "";

      const category = relUrl.split("/")[1];

      myListings.push({ title, url: fullUrl, price, category });
    } catch (e: any) {
      console.error("[RankService] Listing fetch error:", e.message);
    }
  }

  const prices = myListings.map((l) => l.price).filter((p) => p > 0);
  const marketCheapest = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    myListings,
    marketCheapest,
    totalListings: myListingUrls.length,
  };
}
