import { parse } from "node-html-parser";

export interface MyListing {
  title: string;
  url: string;
  price: number;
  category: string;
  rank?: number;
}

export interface RankResult {
  myListings: MyListing[];
  marketCheapest: number;
  marketCheapestUrl?: string;
  totalListings: number;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html",
};

/**
 * Parses Turkish price strings like "89.90", "1.039,90", "1,039.90", "99,90"
 */
function parseTurkishPrice(priceStr: string): number {
  if (!priceStr) return 0;
  
  const lastCommaIndex = priceStr.lastIndexOf(',');
  const lastDotIndex = priceStr.lastIndexOf('.');

  // If both exist: e.g. "1.039,90" or "1,039.90"
  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
       // "1.039,90" -> dot is thousands, comma is decimal
       return parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
    } else {
       // "1,039.90" -> comma is thousands, dot is decimal
       return parseFloat(priceStr.replace(/,/g, ''));
    }
  }

  // Only comma: e.g. "89,90" or "1,200"
  if (lastCommaIndex > -1) {
    // If it has 3 digits after comma, it might be thousands "1,200", else decimal "89,90"
    if (priceStr.length - lastCommaIndex === 4) {
       return parseFloat(priceStr.replace(',', '')); // 1200
    }
    return parseFloat(priceStr.replace(',', '.')); // 89.90
  }

  // Only dot: e.g. "89.90" or "1.200"
  if (lastDotIndex > -1) {
    if (priceStr.length - lastDotIndex === 4) {
       return parseFloat(priceStr.replace('.', '')); // 1200
    }
    return parseFloat(priceStr); // 89.90
  }

  return parseFloat(priceStr);
}

function extractListingId(href: string): string | null {
  const match = href.match(/-(\d{4,12})\.html(?:\?.*)?$/i);
  return match ? match[1] : null;
}

function getPathFromHref(href: string): string {
  if (!href) return "";
  if (href.startsWith("http")) {
    try {
      return new URL(href).pathname;
    } catch {
      return href;
    }
  }
  return href;
}

function getNearestSeller(node: any): string {
  let cursor = node;
  for (let i = 0; i < 8; i++) {
    const parent = cursor?.parentNode;
    if (!parent || typeof parent.querySelector !== "function") break;
    const sellerNode = parent.querySelector("a[href*='/profil/']");
    if (sellerNode) {
      return (
        sellerNode
          .getAttribute("href")
          ?.split("/profil/")[1]
          ?.replace(".html", "")
          ?.trim()
          ?.toLowerCase() || ""
      );
    }
    cursor = parent;
  }
  return "";
}

/** Kategori slug'ındaki anlamlı parçalar (profilde hangi ilanların bu kategoriye yakın olduğunu tahmin etmek için) */
function categorySlugTokens(categorySlug: string): string[] {
  const stopWords = new Set([
    "hesap",
    "hesabi",
    "hesaplari",
    "hesaplar",
    "satis",
    "satış",
    "satin",
    "al",
    "ve",
    "ucuz",
    "kategori",
    "urun",
    "ilan",
    "paket",
  ]);
  const tokens = categorySlug
    .split("-")
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3 && !stopWords.has(t));
  if (tokens.length > 0) return tokens;
  const first = categorySlug.split("-")[0]?.toLowerCase();
  if (first && first.length >= 2) return [first];
  return [];
}

/** Profil path'inin bu kategoriyle ilişkili olma ihtimali (tam slug ilan URL'sinde nadiren geçer) */
function profilePathMatchesCategory(relPath: string, categorySlug: string): boolean {
  const low = relPath.toLowerCase();
  const slugLow = categorySlug.toLowerCase();
  if (low.includes(slugLow)) return true;
  return categorySlugTokens(categorySlug).some((t) => low.includes(t));
}

/**
 * Fetches all active listings for a store from their profile page.
 * Filters by a category keyword (partial URL slug match).
 */
export async function findMyRanks(
  categoryUrl: string,
  myStoreName: string,
  maxPages: number = 10
): Promise<RankResult> {
  const normalizedCategory = categoryUrl.split('?')[0];
  const urlParts = normalizedCategory.replace(/\.html$/, "").split("/");
  const categorySlug = urlParts[urlParts.length - 1]; // e.g. 'crunchyroll-hesap-satis'
  const normalizedStoreName = myStoreName.trim().toLowerCase();

  let siralama = "Varsayılan";
  try {
     const urlParams = new URL(categoryUrl).searchParams;
     siralama = urlParams.get("siralama") || "Varsayılan";
  } catch(e) {}

  // 1. Get user's own listings from Profile
  const myListings: MyListing[] = [];
  try {
    const profileUrl = `https://www.itemsatis.com/profil/${myStoreName}.html`;
    const res = await fetch(profileUrl, { headers: HEADERS });
    if (res.ok) {
        const html = await res.text();
        const allListingMatches = Array.from(
          html.matchAll(/href=["'](\/[^"']+?-\d{4,12}\.html)["']/g)
        ).map((m) => m[1]);

        const uniqueListings = Array.from(new Set(allListingMatches));
        const myListingUrls = uniqueListings.filter((u) =>
          profilePathMatchesCategory(u, categorySlug)
        );

        for (const relUrl of myListingUrls.slice(0, 40)) {
           const fullUrl = `https://www.itemsatis.com${relUrl}`;
           // We could fetch each profile listing for exact price, but it takes time. 
           // We will rely on category ranking pass to assign price, and fetch selectively if not found!
           myListings.push({ 
             title: relUrl.split('/').pop()?.replace('.html', '') || '', 
             url: fullUrl, 
             price: 0, 
             category: categorySlug,
             rank: 0 
           });
        }
    }
  } catch (e: any) {
    console.error("[RankService] Profile fetch error:", e.message);
  }

  // 2. Fetch Category Pages via simple GET requests and parse `.advert-data`
  let marketCheapest = Infinity;
  let marketCheapestUrl: string | undefined = undefined;
  let totalListingsScanned = 0;
  const seenListingIds = new Set<string>();

  // We loop for maxPages pages on the given sort param. 
  // Wait, to guarantee getting absolute marketCheapest, we MUST query `siralama=en-dusuk-fiyat` page 1 at least once.
  try {
     const buyboxUrl = `https://www.itemsatis.com/ilanlar/${categorySlug}.html?siralama=en-dusuk-fiyat&page=1`;
     const buyboxRes = await fetch(buyboxUrl, { headers: HEADERS });
     if (buyboxRes.ok) {
        const buyboxHtml = await buyboxRes.text();
        const root = parse(buyboxHtml);
        const firstItem = root
          .querySelectorAll(".advert-data .AdvertMd a[href]")
          .find((a) => /-\d{4,12}\.html(?:\?.*)?$/i.test(getPathFromHref(a.getAttribute("href") || "")));
        if (firstItem) {
          let container = firstItem as any;
          for (let i = 0; i < 6; i++) {
            const parent = container?.parentNode;
            if (!parent || !parent.outerHTML) break;
            container = parent;
          }
          const outerHTML = container?.outerHTML || firstItem.outerHTML;
          const textContent = container?.text || firstItem.text || "";
          const pMatch =
            textContent.match(/([\d.,]+)\s*(?:₺|TL)/i) ||
            outerHTML.match(/og:price:amount"[^>]+content="([\d.,]+)"/i);
          if (pMatch) {
            marketCheapest = parseTurkishPrice(pMatch[1]);
            const href = firstItem.getAttribute("href");
            if (href) {
              marketCheapestUrl = href.startsWith("http")
                ? href
                : `https://www.itemsatis.com${href}`;
            }
          }
        }
     }
  } catch(e) {}

  // 3. Scan for Organic Ranks based on user's sorting pref
  const activeSort = siralama !== "Varsayılan" ? siralama : "en-yeni";
  let currentRank = 1;

  for (let page = 1; page <= maxPages; page++) {
     try {
         const pageUrl = activeSort === "Varsayılan"
             ? `https://www.itemsatis.com/ilanlar/${categorySlug}.html?page=${page}`
             : `https://www.itemsatis.com/ilanlar/${categorySlug}.html?siralama=${activeSort}&page=${page}`;
         const apiRes = await fetch(pageUrl, { headers: HEADERS });
         
         if (!apiRes.ok) break;
         const html = await apiRes.text();
         const root = parse(html);
         
        // Sadece kategori kartlarındaki ilan linklerini tara. Geniş a[href] taraması vitrin/yan modül linklerini dahil edip rank'i bozuyordu.
        const links = Array.from(root.querySelectorAll(".advert-data .AdvertMd a[href]")).filter((a) => {
          const h = a.getAttribute("href") || "";
          const path = getPathFromHref(h);
          return /-\d{4,12}\.html(?:\?.*)?$/i.test(path);
        });

         const uniqueLinks = new Map();
         for(const l of links) {
            uniqueLinks.set(l.getAttribute("href"), l);
         }

         if (uniqueLinks.size === 0) break; // Reached end of category

         for (const [href, linkNode] of Array.from(uniqueLinks.entries())) {
           const hrefStr = href || "";
           const listingPath = getPathFromHref(hrefStr);
           const listingId = extractListingId(listingPath);
           if (!listingId || seenListingIds.has(listingId)) {
             continue;
           }

            let container = linkNode as any;
            for(let i=0; i<6; i++) {
               if (container.parentNode && (container.parentNode as any).outerHTML) {
                   container = container.parentNode as any;
               } else { break; }
            }

            const outerHTML = container.outerHTML || linkNode.outerHTML;
            const textContent = container.text || linkNode.text || "";
            
            let price = 0;
            const pMatch = textContent.match(/([\d.,]+)\s*(?:₺|TL)/i) || outerHTML.match(/og:price:amount"[^>]+content="([\d.,]+)"/i);
            if (pMatch) {
               price = parseTurkishPrice(pMatch[1]);
            }

            let seller = getNearestSeller(linkNode);
            if (!seller && outerHTML.toLowerCase().includes(normalizedStoreName)) {
              seller = normalizedStoreName;
            }

            // Listing card doğrulaması: satıcı bilgisi ya da fiyat görünmeli.
            const looksLikeListingCard = !!seller || price > 0;
            if (!looksLikeListingCard) {
              continue;
            }

            seenListingIds.add(listingId);
            totalListingsScanned++;

            if (price > 0 && price < marketCheapest) {
              marketCheapest = price;
              marketCheapestUrl = hrefStr.startsWith("http")
                ? hrefStr
                : `https://www.itemsatis.com${hrefStr}`;
            }

            if (seller.toLowerCase() === normalizedStoreName) {
               const title = linkNode.getAttribute("title") || linkNode.innerText.trim();
               const fullListingUrl = hrefStr.startsWith("http")
                 ? hrefStr
                 : `https://www.itemsatis.com${hrefStr}`;
               const pop = listingPath.split("/").filter(Boolean).pop() || "";
               let existing = myListings.find(
                 (m) => pop && m.url.includes(pop)
               );
               if (existing) {
                  existing.rank = currentRank;
                  existing.price = price;
                  existing.title = title || existing.title;
               } else {
                  myListings.push({
                     title: title || pop || '',
                     url: fullListingUrl,
                     price,
                     category: categorySlug,
                     rank: currentRank
                  });
               }
            }

            currentRank++;
         }
     } catch(e) {
         break;
     }
  }

  // 4. Fill missing prices for profile items
  for (const item of myListings) {
     if (item.price === 0) {
         try {
             const res = await fetch(item.url, { headers: HEADERS });
             if (res.ok) {
                 const html = await res.text();
                 const textContent = parse(html).text;
                 const outerHTML = html;
                 const pMatch = textContent.match(/([\d.,]+)\s*(?:₺|TL)/i) || outerHTML.match(/og:price:amount"[^>]+content="([\d.,]+)"/i);
                 if (pMatch) {
                    item.price = parseTurkishPrice(pMatch[1]);
                 }
                 const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<|]+)/i);
                 if (titleMatch) item.title = titleMatch[1].trim().substring(0, 80);
             }
         } catch(e) {}
     }
  }

  return {
    myListings,
    marketCheapest: marketCheapest === Infinity ? 0 : marketCheapest,
    marketCheapestUrl,
    totalListings: totalListingsScanned,
  };
}
