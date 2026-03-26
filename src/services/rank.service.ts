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
  maxPages: number = 5
): Promise<RankResult> {
  const normalizedCategory = categoryUrl.split('?')[0];
  const urlParts = normalizedCategory.replace(/\.html$/, "").split("/");
  const categorySlug = urlParts[urlParts.length - 1]; // e.g. 'geforce-now-hesaplari'
  const categoryPrefix = categorySlug.split("-").slice(0, 2).join("-"); // 'geforce-now'

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
          html.matchAll(/href=["'](\/[^"']+?-\d{4,8}\.html)["']/g)
        ).map((m) => m[1]);

        const uniqueListings = Array.from(new Set(allListingMatches));
        const myListingUrls = uniqueListings.filter((u) => u.includes(categoryPrefix));

        for (const relUrl of myListingUrls.slice(0, 20)) {
           const fullUrl = `https://www.itemsatis.com${relUrl}`;
           // We could fetch each profile listing for exact price, but it takes time. 
           // We will rely on category ranking pass to assign price, and fetch selectively if not found!
           myListings.push({ 
             title: relUrl.split('/').pop()?.replace('.html', '') || '', 
             url: fullUrl, 
             price: 0, 
             category: categoryPrefix,
             rank: 0 
           });
        }
    }
  } catch (e: any) {
    console.error("[RankService] Profile fetch error:", e.message);
  }

  // 2. Fetch Category Page to get CSRF and CatID
  let csrf = "";
  let catId = "";
  try {
    const res = await fetch(normalizedCategory, { headers: HEADERS });
    if (res.ok) {
       const html = await res.text();
       csrf = html.match(/csrf-token['"]\s+content=["']([^"']+)/)?.[1] || "";
       catId = html.match(/cat:(\d+)/)?.[1] || "";
    }
  } catch (e) {}

  let marketCheapest = Infinity;
  let totalListingsScanned = 0;

  if (csrf && catId) {
    // 3. Get Absolute Market Cheapest (Buybox)
    try {
       const buyboxRes = await fetch("https://www.itemsatis.com/index2.php?go=GetPosts", {
          method: "POST",
          headers: { ...HEADERS, "X-CSRF-TOKEN": csrf, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", "Referer": normalizedCategory },
          body: `cat_id=${catId}&page=1&say=20&siralama=en-dusuk-fiyat`
       });
       if (buyboxRes.ok) {
          const buyboxHtml = await buyboxRes.text();
          const pMatch = buyboxHtml.match(/([\d.,]+)\s*(?:₺|TL)/i);
          if (pMatch) {
             marketCheapest = parseFloat(pMatch[1].replace(/\./g, "").replace(",", "."));
          }
       }
    } catch(e) {}

    // 4. Scan for Organic Ranks based on user's sorting pref (default: varsayılan)
    const activeSort = siralama !== "Varsayılan" ? siralama : "en-yeni"; // Default to newest if none specified
    let currentRank = 1;

    for (let page = 1; page <= maxPages; page++) {
       try {
           const apiRes = await fetch("https://www.itemsatis.com/index2.php?go=GetPosts", {
              method: "POST",
              headers: { ...HEADERS, "X-CSRF-TOKEN": csrf, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", "Referer": normalizedCategory },
              body: `cat_id=${catId}&page=${page}&say=20&siralama=${activeSort}`
           });
           
           if (!apiRes.ok) break;
           const chunkHtml = await apiRes.text();
           const chunkRoot = parse(chunkHtml);
           
           // Extract links
           const links = Array.from(chunkRoot.querySelectorAll("a[href]")).filter(a => {
              const h = a.getAttribute("href") || "";
              return h.includes(categoryPrefix) && h.match(/\-\d{4,8}\.html$/) && !h.includes('/profil/');
           });

           // Deduplicate links in this chunk
           const uniqueLinks = new Map();
           for(const l of links) {
              uniqueLinks.set(l.getAttribute("href"), l);
           }

           if (uniqueLinks.size === 0) break; // Reached end of category

           for (const [href, linkNode] of Array.from(uniqueLinks.entries())) {
              let container = linkNode;
              for(let i=0; i<4; i++) {
                 if (container.getAttribute('class')?.includes('col') || container.getAttribute('class')?.includes('card')) break;
                 if (container.parentNode) container = container.parentNode;
              }

              const outerHTML = container.outerHTML || linkNode.outerHTML;
              
              let price = 0;
              const pMatch = outerHTML.match(/([\d.,]+)\s*(?:₺|TL)/i);
              if (pMatch) price = parseFloat(pMatch[1].replace(/\./g, "").replace(",", "."));

              let seller = "";
              const sellerNode = container.querySelector("a[href*='/profil/']");
              if (sellerNode) {
                 seller = sellerNode.getAttribute("href")?.split('/profil/')[1]?.replace('.html', '') || "";
              } else if (outerHTML.toLowerCase().includes(myStoreName.toLowerCase())) {
                 seller = myStoreName.toLowerCase();
              }

              // Update market cheapest just in case
              if (price > 0 && price < marketCheapest) marketCheapest = price;

              // If this is my listing, update its rank and exact title/price
              if (seller.toLowerCase() === myStoreName.toLowerCase()) {
                 const title = linkNode.getAttribute("title") || linkNode.innerText.trim();
                 let existing = myListings.find(m => href.includes(m.url.split('/').pop()!));
                 if (existing) {
                    existing.rank = currentRank;
                    existing.price = price;
                    existing.title = title || existing.title;
                 } else {
                    myListings.push({
                       title: title || href.split('/').pop() || '',
                       url: `https://www.itemsatis.com${href}`,
                       price,
                       category: categoryPrefix,
                       rank: currentRank
                    });
                 }
              }

              currentRank++;
              totalListingsScanned++;
           }
       } catch(e) {
           break;
       }
    }
  }

  // 5. Fill missing prices for profile items that were not found in the scanned pages
  for (const item of myListings) {
     if (item.price === 0) {
         try {
             // In a perfect system we could run a background queue for this.
             // We'll do a quick fetch to get its price.
             const res = await fetch(item.url, { headers: HEADERS });
             if (res.ok) {
                 const html = await res.text();
                 const pMatch = html.match(/([\d.,]+)\s*(?:₺|TL)/i) || html.match(/og:price:amount"[^>]+content="([\d.,]+)"/i);
                 if (pMatch) item.price = parseFloat(pMatch[1].replace(/\./g, "").replace(",", "."));
                 const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<|]+)/i);
                 if (titleMatch) item.title = titleMatch[1].trim().substring(0, 80);
             }
         } catch(e) {}
     }
  }

  return {
    myListings,
    marketCheapest: marketCheapest === Infinity ? 0 : marketCheapest,
    totalListings: totalListingsScanned,
  };
}
