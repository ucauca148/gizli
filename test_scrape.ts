import { parseTurkishDate } from "./src/lib/date-utils";

async function resolveUserId(url: string): Promise<string | null> {
  const urlMatch = url.match(/\/profil\/(\d+)\//);
  if (urlMatch) return urlMatch[1];
  try {
    const response = await fetch(url.split("?")[0], {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html"
      }
    });
    const html = await response.text();
    const match = html.match(/btn-follow["']\s+data-id=["'](\d+)["']/i);
    return match ? match[1] : null;
  } catch (e) { return null; }
}

async function testScrape(targetUrl: string) {
  const userId = await resolveUserId(targetUrl);
  console.log("Resolved UserId:", userId);
  if (!userId) return;

  const days = 30;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let page = 1;
  let hasMore = true;
  let count = 0;

  // siralama=yeni eklendi!
  const apiUrl = `https://www.itemsatis.com/api/getProfileComments?UserId=${userId}&sekme=degerlendirmeler&siralama=yeni&PageNumber=`;

  while (hasMore && page <= 3) {
    console.log(`Page ${page} fetching...`);
    const res = await fetch(apiUrl + page, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 ...", "Accept": "application/json" }
    });
    const json = await res.json();
    const comments = json.data || json.comments || [];
    
    if (comments.length === 0) break;

    for (const comment of comments) {
      const dateStr = comment.Datetime ? comment.Datetime.replace(/ , /g, " ") : ""; 
      const commentDate = parseTurkishDate(dateStr);
      
      console.log(`- [${comment.IsFixed ? 'FIXED' : 'NORMAL'}] ${dateStr} -> ${commentDate.toISOString()}`);

      if (commentDate < cutoffDate && !comment.IsFixed) {
        hasMore = false;
        break;
      }

      if (commentDate >= cutoffDate) {
        count++;
      }
    }
    page++;
  }
  console.log("FINAL COUNT FOR LAST 30 DAYS:", count);
}

testScrape("https://www.itemsatis.com/p/OpssGamerShop");
