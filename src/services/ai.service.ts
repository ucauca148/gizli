import { GoogleGenerativeAI } from "@google/generative-ai";

// API Anahtarı kontrolü
const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("DIKKAT: GEMINI_API_KEY tanımlı değil!");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeCompetitorPerformance(
  competitorName: string, 
  totalSales: number, 
  productData: Record<string, { title: string, count: number }>
) {
  if (!apiKey) {
    return "AI Analizi yapılamadı: GEMINI_API_KEY eksik. Lütfen Vercel veya .env üzerinden anahtarınızı tanımlayın.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini AI Hatası:", error);
    // Hatanın detayını kullanıcıya güvenli bir şekilde gösterelim (örn: quota exceeded)
    if (error.message?.includes("429")) return "Hata: Limit aşımı (429). Lütfen 1 dakika sonra tekrar deneyin.";
    if (error.message?.includes("403")) return "Hata: API Anahtarı yetkisiz (403). Lütfen geçerli bir anahtar girdiğinizden emin olun.";
    
    return `AI Analizi şu an yapılamadı. Hata: ${error.message || "Bilinmiyor"}`;
  }
}
