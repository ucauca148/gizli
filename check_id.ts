const fs = require('fs');

async function check() {
  const url = "https://www.itemsatis.com/p/OpssGamerShop";
  const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html"
      }
  });
  const html = await response.text();
  
  const id = "2118";
  const index = html.indexOf(id);
  if (index !== -1) {
    const fragment = html.substring(index - 300, index + 300);
    fs.writeFileSync('fragment.txt', fragment);
    console.log("Written fragment to fragment.txt");
  } else {
    console.log("2118 NOT FOUND");
    // Print first 500 chars to see if it's a block
    fs.writeFileSync('fragment.txt', html.substring(0, 1000));
  }
}

check();
