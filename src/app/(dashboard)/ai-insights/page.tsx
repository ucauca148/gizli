import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Brain } from "lucide-react"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

export const dynamic = 'force-dynamic'

async function getAiInsight() {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.order.count({ 
      where: { createdAt: { gte: today } } 
    });
    
    const approvedCount = await prisma.order.count({ 
      where: { createdAt: { gte: today }, status: "APPROVED" } 
    });

    const revenueResult = await prisma.order.aggregate({
      where: { createdAt: { gte: today }, status: "APPROVED" },
      _sum: { totalAmount: true }
    });
    const revenue = revenueResult._sum.totalAmount || 0;

    if (!openaiKey || openaiKey.startsWith("sk-...") || openaiKey === "") {
      return { 
        insight: `Yapay Zeka Hazır Değil: OpenAI API anahtarı eklenmediği için standart rapor gösteriliyor. Bugün ${todayCount} sipariş aldınız, bunun ${approvedCount} tanesi onaylandı ve yaklaşık ${revenue} ₺ ciro elde ettiniz.` 
      };
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "Sen kıdemli bir e-ticaret analiz uzmanısın (İtemSatış platformu için). Kullanıcıya bugünün mağaza performansı hakkında tam 2 cümlelik, yapıcı ve profesyonel bir içgörü sunacaksın." 
        },
        { 
          role: "user", 
          content: `Bugün ${todayCount} sipariş aldık. ${approvedCount} tanesi onaylandı. Ciro: ${revenue} TL. Taktiksel bir yorum veya öneri yapar mısın? (Max 2 cümle)` 
        }
      ]
    });

    return { insight: completion.choices[0]?.message?.content || "Analiz süreci başarısız oldu." };
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return { error: "Yapay zeka servisine bağlanılamadı veya rate-limit aşıldı." };
  }
}

export default async function AiInsightsPage() {
  const data = await getAiInsight()

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">AI Insights</h1>
        <p className="text-zinc-400">Mağaza performansınız OpenAI modelleri tarafından her gün otomatik yorumlanır.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 bg-gradient-to-br from-primary to-purple-600 rounded-full text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Bugünün Vaka Özeti</CardTitle>
              <CardDescription>Sistem Verilerinden Açıklanan Sonuçlar</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data.error ? (
              <p className="text-red-400 font-medium border-l-2 border-red-500 pl-4">{data.error}</p>
            ) : data.insight ? (
              <p className="text-lg leading-relaxed text-zinc-100 font-medium italic border-l-2 border-primary pl-4">
                "{data.insight}"
              </p>
            ) : (
             <div className="flex p-4 w-full text-zinc-500 animate-pulse border-l-2 border-zinc-700 pl-4">
                Yapay zeka verileri sentezi devam ediyor...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gelecek Faz Kartları */}
        <div className="flex flex-col gap-4">
          <Card className="opacity-40 grayscale cursor-not-allowed transition-all hover:grayscale-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fiyat Optimizasyonu (Faz 2)</CardTitle>
              <CardDescription>Rakiplerinizin fiyatlarına göre "Bu fiyatı artırabilirsiniz" önerileri sunar.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold px-2 py-1 bg-white/10 rounded w-max text-white">Yakında</p>
            </CardContent>
          </Card>

          <Card className="opacity-40 grayscale cursor-not-allowed transition-all hover:grayscale-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Riskli Alarmı (Faz 2)</CardTitle>
              <CardDescription>Günlerce satmayan ürünleri veya iptal oranı yüksek riskli ürünleri bulup listeler.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold px-2 py-1 bg-white/10 rounded w-max text-white">Yakında</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
