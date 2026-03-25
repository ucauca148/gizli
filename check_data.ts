import { parseTurkishDate } from "./src/lib/date-utils";

async function check() {
  const userId = "2118"; // OpssGamerShop
  const url = `https://www.itemsatis.com/api/getProfileComments?UserId=${userId}&PageNumber=1&sekme=degerlendirmeler`;
  
  console.log("Fetching:", url);
  
  const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
  });
  
  const resJson = await response.json();
  const comments = resJson.data || [];
  
  console.log("Total Comments in Page 1:", comments.length);
  
  if (comments.length > 0) {
    const firstComment = comments[0];
    console.log("First Comment Raw Datetime:", firstComment.Datetime);
    
    // Test parsing
    const dateStr = firstComment.Datetime ? firstComment.Datetime.replace(/ , /g, " ") : "";
    const parsedDate = parseTurkishDate(dateStr);
    console.log("First Comment Parsed Date:", parsedDate.toISOString());
    console.log("Current System Date:", new Date().toISOString());
    
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log("30 Day Cutoff:", cutoff.toISOString());
    console.log("Is within 30 days?", parsedDate >= cutoff);
  } else {
    console.log("RAW JSON Response:", JSON.stringify(resJson).substring(0, 500));
  }
}

check();
