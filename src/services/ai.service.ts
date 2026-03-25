import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function analyzeCompetitorPerformance(
  competitorName: string, 
  totalSales: number, 
  productData: Record<string, { title: string, count: number }>
) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Sen profesyonel bir e-ticaret ve rekabet analisti asistanısın. 
    İtemSatış platformunda bir rakip mağazanın son 30 günlük verileri şöyledir:
    
    Mağaza Adı: ${competitorName}
    Toplam Tahmini Satış (Yorum Sayısı): ${totalSales}
    Ürün Dağılımı: ${JSON.stringify(productData, null, 2)}
    
    Lütfen bu verileri analiz et ve şunları söyle:
    1. Bu rakibin en güçlü olduğu ürün grubu hangisi?
    2. Satış trendlerine bakarak stratejik bir tavsiye ver (Örn: "Bu fiyatlara inme, kalite vurgusu yap" veya "Sen de bu ürünü listele").
    3. Genel pazar durumu hakkında kısa bir yorum yap.
    
    Yanıtın kısa, öz, Türkçe ve profesyonel olsun. Markdown formatında başlıklarla yaz.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Hatası:", error);
    return "AI Analizi şu an yapılamadı. Lütfen API anahtarınızı kontrol edin.";
  }
}
