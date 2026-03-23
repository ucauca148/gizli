import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { headers } from "next/headers"

// Dashboard verisini /api/dashboard/summary endpointinden çek
async function getSummaryData() {
  const hostList = headers().get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  
  // Tam Next.js URL path'i zorunlu olduğu için
  const fetchUrl = `${protocol}://${hostList}/api/dashboard/summary`

  const res = await fetch(fetchUrl, { cache: 'no-store' }) // Hep güncel data
  if (!res.ok) {
    throw new Error(`API hatası: ${res.statusText}`)
  }
  return res.json()
}

export default async function DashboardPage() {
  let summary = null
  let error = null

  try {
    summary = await getSummaryData()
  } catch (e: any) {
    error = e.message || "Bilinmeyen bir hata oluştu"
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
        <p className="text-muted-foreground">Mağaza performansını ve anlık satışları buradan takip edebilirsiniz.</p>
      </div>

      {error ? (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Veri Çekme Hatası</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Sipariş (Bugün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todaySalesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Ciro (Bugün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todayRevenue} ₺</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onaylanan (Bugün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{summary.todayApprovedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İptal Edilen (Bugün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{summary.todayCancelledCount}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex p-12 w-full justify-center items-center text-muted-foreground animate-pulse">
          Veriler Yükleniyor...
        </div>
      )}

      {/* Son 7 Gün - MVP Grafiği (Basit Kart Listesi) */}
      {summary && (
        <Card className="col-span-4 mt-6">
          <CardHeader>
            <CardTitle>Son 7 Günlük Performans</CardTitle>
            <CardDescription>Gelir ve sipariş alışkanlıkları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {summary.last7DaysChart?.map((day: any) => (
                <div key={day.date} className="flex flex-col items-center justify-center bg-muted/50 p-4 rounded-xl min-w-[120px] border">
                  <span className="text-xs text-muted-foreground mb-1">{day.date}</span>
                  <span className="font-bold text-lg">{day.revenue} ₺</span>
                  <span className="text-xs mt-1">{day.salesCount} Satış</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
