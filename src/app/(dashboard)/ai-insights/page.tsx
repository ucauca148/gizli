import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Brain } from "lucide-react"
import { headers } from "next/headers"

export const revalidate = 0

// Sunucudan AI route'una istek atılır (AI Key burada gizlenmiş olur)
async function getAiInsight() {
  const host = headers().get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  
  const res = await fetch(`${protocol}://${host}/api/ai/daily-summary`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('AI servisine erişim reddedildi veya timeout oluştu.')
  }
  return res.json()
}

export default async function AiInsightsPage() {
  let data = null
  let error = null

  try {
    data = await getAiInsight()
  } catch (e: any) {
    error = e.message
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">AI Insights <span className="text-sm font-normal text-muted-foreground ml-2">(Yapay Zeka)</span></h1>
        <p className="text-muted-foreground">Mağaza performansınız OpenAI modelleri tarafından her gün otomatik yorumlanır ve size öneriler sunulur.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5 shadow-md col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 bg-primary text-primary-foreground rounded-full shadow-inner shadow-white/20">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Bugünün Vaka Özeti</CardTitle>
              <CardDescription>Sistem Verilerinden Açıklanan Sonuçlar</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {error ? (
              <p className="text-destructive font-medium border-l-4 border-destructive pl-4">{error}</p>
            ) : data?.error ? (
              <p className="text-destructive font-medium border-l-4 border-destructive pl-4">{data.error}</p>
            ) : data ? (
              <p className="text-lg leading-relaxed text-foreground/90 font-medium italic border-l-4 border-primary pl-4">
                "{data.insight}"
              </p>
            ) : (
             <div className="flex p-4 w-full text-muted-foreground animate-pulse border-l-4 border-muted pl-4">
                Yapay zeka verileri sentezi devam ediyor...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gelecek Faz Kartları (MVP'de UI gösterilir ama pasiftir) */}
        <div className="flex flex-col gap-4">
          <Card className="opacity-60 saturate-50 cursor-not-allowed transition-all hover:opacity-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fiyat Optimizasyonu (Faz 2)</CardTitle>
              <CardDescription>Rakiplerinizin fiyatlarına göre "Bu fiyatı artırabilirsiniz" önerileri sunar.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold px-2 py-1 bg-muted rounded w-max">Yakında Eklenecek</p>
            </CardContent>
          </Card>

          <Card className="opacity-60 saturate-50 cursor-not-allowed transition-all hover:opacity-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Riskli & Atıl Ürün Alarmı (Faz 2)</CardTitle>
              <CardDescription>Günlerce satmayan ürünleri veya iptal oranı yüksek riskli ürünleri bulup listeler.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold px-2 py-1 bg-muted rounded w-max">Yakında Eklenecek</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
