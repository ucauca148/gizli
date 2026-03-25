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

  // Kullanıcının API anahtarına özel model listesi (2.0/2.5 desteği dahil edildi)
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest", 
    "gemini-1.5-flash", 
    "gemini-pro"
  ];
  
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
    
    Yanıtın Türkçe ve profesyonel olsun. Markdown formatında başlıklarla yaz.
  `;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] ${modelName} deneniyor...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error(`[AI] ${modelName} hatası:`, error.message);
      lastError = error.message;
      
      // Sadece 404 (Model Bulunamadı) hatası varsa bir sonrakine geç
      if (!error.message?.includes("404")) {
        break;
      }
    }
  }

  return `AI Analizi yapılamadı. En son alınan hata: ${lastError || "Modeller bu anahtar için kapalı"}`;
}
