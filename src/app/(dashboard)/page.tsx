import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Doğrudan veritabanı sorgusu atıyoruz (API route yerine)
async function getSummaryData() {
  const storeId = null; // Gelişmiş aşamada props'tan alınabilir
  
  const now = new Date();
  const last24hAgo = new Date(now);
  last24hAgo.setHours(now.getHours() - 24);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const baseWhere = storeId ? { storeId } : {};

  // Webhook'tan işlenen siparişler burada order tablosu üzerinden gelir.
  const last24hOrders = await prisma.order.findMany({
    where: { ...baseWhere, createdAt: { gte: last24hAgo } },
    select: { status: true, totalAmount: true, createdAt: true }
  });

  const last24hSalesCount = last24hOrders.length;
  const last24hApprovedOrders = last24hOrders.filter((o) => o.status === "APPROVED");
  const last24hCancelledOrders = last24hOrders.filter((o) => o.status === "CANCELLED");

  const last24hApprovedCount = last24hApprovedOrders.length;
  const last24hCancelledCount = last24hCancelledOrders.length;

  const last24hApprovedRevenue = last24hApprovedOrders
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const last24hCancelledRevenue = last24hCancelledOrders
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const last7DaysOrders = await prisma.order.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: sevenDaysAgo },
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { createdAt: true, totalAmount: true }
  });

  const daysMap = new Map<string, { salesCount: number; revenue: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; 
    daysMap.set(dateStr, { salesCount: 0, revenue: 0 });
  }

  last7DaysOrders.forEach(order => {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    if (daysMap.has(dateStr)) {
      const current = daysMap.get(dateStr)!;
      current.salesCount += 1;
      current.revenue += Number(order.totalAmount);
    }
  });

  const last7DaysChart = Array.from(daysMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    last24hSalesCount,
    last24hApprovedCount,
    last24hCancelledCount,
    last24hApprovedRevenue,
    last24hCancelledRevenue,
    last7DaysChart,
  };
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
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white animate-fade-in">Genel Bakış</h1>
        <p className="text-zinc-400 font-medium">Mağaza performansını ve anlık satışları buradan takip edebilirsiniz.</p>
      </div>

      {error ? (
        <Card className="border-red-500 bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-400">Veri Çekme Hatası</CardTitle>
            <CardDescription className="text-red-400/80">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : summary ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-black/40 to-primary/5 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-zinc-300">Son 24 Saat Sipariş</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white tracking-tight">{summary.last24hSalesCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-black/40 to-primary/5 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-zinc-300">Onaylanan Ciro (Son 24 Saat)</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white tracking-tight">{summary.last24hApprovedRevenue.toFixed(2)} <span className="text-xl text-zinc-500">₺</span></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-black/40 to-emerald-900/10 border-emerald-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-zinc-300">Onaylanan Adet & Tutar</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-emerald-400 tracking-tight">{summary.last24hApprovedCount}</div>
              <div className="mt-2 text-sm text-emerald-300/90 font-semibold">
                {summary.last24hApprovedRevenue.toFixed(2)} ₺
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-black/40 to-red-900/10 border-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-zinc-300">İptal Edilen Adet & Tutar</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-red-400 tracking-tight">{summary.last24hCancelledCount}</div>
              <div className="mt-2 text-sm text-red-300/90 font-semibold">
                {summary.last24hCancelledRevenue.toFixed(2)} ₺
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex p-12 w-full justify-center items-center text-zinc-500 animate-pulse font-medium">
          Sistem Verileri Yükleniyor...
        </div>
      )}

      {/* Son 7 Gün - MVP Grafiği */}
      {summary && (
        <Card className="col-span-4 mt-8 bg-black/20 border-white/5">
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl text-white">Son 7 Günlük Performans</CardTitle>
            <CardDescription className="text-zinc-400">Gelir ve sipariş alışkanlıkları seyri</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {summary.last7DaysChart?.map((day: any) => (
                <div key={day.date} className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors duration-300 p-5 rounded-2xl min-w-[130px] border border-white/5 shadow-inner">
                  <span className="text-xs text-zinc-400 mb-2 font-medium">{day.date}</span>
                  <span className="font-bold text-xl text-white tracking-tight">{day.revenue} ₺</span>
                  <span className="text-[11px] mt-2 text-primary/80 font-bold uppercase tracking-wider">{day.salesCount} Satış</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
