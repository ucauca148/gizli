async function check() {
  const fs = require('fs');
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/GEMINI_API_KEY=["']?([^"'\s]+)["']?/);
  const apiKey = match ? match[1] : "";
  
  if (!apiKey) return console.log("Key missing");

  console.log("Testing Key (first 5):", apiKey.substring(0, 5));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Merhaba' }] }]
      })
    });
    
    const data = await res.json();
    console.log("REST Response Status:", res.status);
    if (res.status === 200) {
        console.log("SUCCESS! Key is working.");
    } else {
        console.log("FAILED! Error:", data.error?.message);
    }
  } catch (e) {
    console.log("Fetch Error:", e.message);
  }
}

check();
