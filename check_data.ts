async function check() {
  const userId = "2118"; 
  const url = `https://www.itemsatis.com/api/getProfileComments?UserId=${userId}&PageNumber=1&sekme=degerlendirmeler`;
  
  const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
  });
  
  const resJson = await response.json();
  const items = resJson.data || resJson.comments || [];
  
  if (items.length > 0) {
      console.log("Item 0 ALL KEYS:", JSON.stringify(Object.keys(items[0])));
      // Check for 'fixed', 'pinned', 'rank', etc.
      items.forEach((it, idx) => {
          console.log(`Item ${idx} - Date: ${it.Datetime} - Fixed: ${it.Fixed} - Rank: ${it.rank}`);
      });
  }
}

check();
