import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DashboardSummaryResponse } from "@/types/itemsatis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId"); // Mağaza filtresi opsiyonel

    // Zaman ayarları (Bugünün başı)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Son 7 Gün başı
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Bugün de dahil 7 gün
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Opsiyonel filtre koşulu
    const baseWhere = storeId ? { storeId } : {};

    // 1. Bugünkü Satış Metrikleri (Sadece bugünkü siparişler)
    const todayOrders = await prisma.order.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: today },
      },
      select: { status: true, totalAmount: true } // Performans için sadece gerekli kolonlar
    });

    const todaySalesCount = todayOrders.length;
    const todayApprovedCount = todayOrders.filter(o => o.status === "APPROVED").length;
    const todayCancelledCount = todayOrders.filter(o => o.status === "CANCELLED").length;
    
    // Sadece APPROVED siparişlerin cirosunu dahil ediyoruz
    const todayRevenue = todayOrders
      .filter(o => o.status === "APPROVED")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // 2. Son 7 Gün Grafiği (Chart Datası)
    const last7DaysOrders = await prisma.order.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: sevenDaysAgo },
        // Grafiklerde genelde iade ve iptaller satış olarak sayılmaz veya ayrı gösterilir
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      }
    });

    // Boş günleri '0' verisi ile doldurabilmek için "YYYY-MM-DD" haritası
    const daysMap = new Map<string, { salesCount: number; revenue: number }>();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; 
      daysMap.set(dateStr, { salesCount: 0, revenue: 0 });
    }

    // Veritabanından gelen verileri ilgili günlere ekle
    last7DaysOrders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split("T")[0];
      if (daysMap.has(dateStr)) {
        const current = daysMap.get(dateStr)!;
        current.salesCount += 1;
        current.revenue += Number(order.totalAmount);
      }
    });

    // Haritayı diziye çevirip tarihe göre sırala (Eskiden > Yeniye Recharts uyumu için)
    const last7DaysChart = Array.from(daysMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Response'un tip güvenliği ile dönmesi
    const responseContent: DashboardSummaryResponse = {
      todaySalesCount,
      todayApprovedCount,
      todayCancelledCount,
      todayRevenue,
      last7DaysChart,
    };

    return NextResponse.json(responseContent, { status: 200 });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "İç sunucu hatası" }, { status: 500 });
  }
}
