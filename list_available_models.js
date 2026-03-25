async function check() {
  const fs = require('fs');
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/GEMINI_API_KEY=["']?([^"'\s]+)["']?/);
  const apiKey = match ? match[1] : "";
  if (!apiKey) return;

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Full Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

check();
