import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeCompetitorPerformance(
  competitorName: string, 
  totalSales: number, 
  productData: Record<string, { title: string, count: number }>
) {
  if (!apiKey) {
    return "AI Analizi yapılamadı: GEMINI_API_KEY eksik. Lütfen Vercel veya .env üzerinden anahtarınızı tanımlayın.";
  }

  // Denenecek model listesi (Fallback yapısı)
  const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-pro"];
  let lastError = "";

  const prompt = `
    Sen profesyonel bir e-ticaret ve rekabet analisti asistanısın. 
    İtemSatış platformunda bir rakip mağazanın son verileri şöyledir:
    
    Mağaza Adı: ${competitorName}
    Analiz Aralığındaki Toplam Satış (Yorum Sayısı): ${totalSales}
    Ürün Dağılımı: ${JSON.stringify(productData, null, 2)}
    
    Lütfen bu verileri analiz et ve şunları söyle:
    1. Bu rakibin en çok satan ve en güçlü olduğu ürün grubu hangisi?
    2. Satış trendlerine (adetlere) bakarak stratejik bir tavsiye ver.
    3. Genel pazar durumu ve rakibin agresifliği hakkında kısa bir yorum yap.
    
    Yanıtın kısa, öz, Türkçe ve profesyonel olsun. Markdown formatında başlıklarla yaz.
  `;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] ${modelName} modeli ile içerik üretiliyor...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error(`[AI] ${modelName} hatası:`, error.message);
      lastError = error.message;
      // Eğer hata 404 ise bir sonraki modeli dene, değilse (örn 401, 429) direkt dön
      if (!error.message?.includes("404")) {
        break;
      }
    }
  }

  return `AI Analizi yapılamadı. Hata: ${lastError || "Modeller bulunamadı"}`;
}
