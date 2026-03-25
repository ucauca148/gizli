async function check() {
  const fs = require('fs');
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/GEMINI_API_KEY=["']?([^"'\s]+)["']?/);
  const apiKey = match ? match[1] : "";
  if (!apiKey) return;

  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
  const versions = ["v1beta", "v1"];
  
  for (const v of versions) {
    for (const m of models) {
      const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
        });
        const data = await res.json();
        console.log(`[${v}] ${m} -> Status: ${res.status}`);
        if (res.status === 200) {
          console.log(`>>> SUCCESS WITH [${v}] ${m}`);
          return;
        } else {
            console.log(`    Error: ${data.error?.message}`);
        }
      } catch (e) {}
    }
  }
}

check();
