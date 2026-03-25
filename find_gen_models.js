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
    if (!data.models) {
        console.log("No models found:", data);
        return;
    }

    const generationModels = data.models.filter(m => 
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
    ).map(m => m.name.replace("models/", ""));

    console.log("Models supporting generateContent:", generationModels);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

check();
