import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // AI için veritabanından bugünün sipariş bağlamını oluşturuyoruz
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

    // Eğer OpenAI anahtarı yoksa veya örnek anahtarsa Mock çalışsın
    if (!openaiKey || openaiKey.startsWith("sk-...") || openaiKey === "") {
      return NextResponse.json({ 
        insight: `Yapay Zeka Hazır Değil: OpenAI API anahtarı (.env içerisine) eklenmediği için standart rapor gösteriliyor. Bugün ${todayCount} sipariş aldınız, bunun ${approvedCount} tanesi onaylandı ve yaklaşık ${revenue} ₺ ciro elde ettiniz.` 
      }, { status: 200 });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Faz 1 Chatbot için yeterli ve ucuz model
      messages: [
        { 
          role: "system", 
          content: "Sen kıdemli bir e-ticaret analiz uzmanısın (İtemSatış platformu için). Kullanıcıya bugünün mağaza performansı hakkında tam 2 cümlelik, yapıcı, kısa ve profesyonel bir içgörü sunacaksın." 
        },
        { 
          role: "user", 
          content: `Bugün mağazalarımız toplam ${todayCount} sipariş aldı. Bunların ${approvedCount} tanesi müşteri tarafından onaylandı. Toplam ciro ${revenue} TL oldu. Bize mağaza ilerleyişi ile ilgili kısa bir stratejik yorum veya öneri yapar mısın? (2 cümleyi aşma)` 
        }
      ]
    });

    const insight = completion.choices[0]?.message?.content || "Analiz süreci başarısız oldu.";

    return NextResponse.json({ insight }, { status: 200 });
  } catch (error: any) {
    console.error("AI Insight Endpoint Error:", error);
    return NextResponse.json({ error: "AI servisine bağlanılamadı veya rate-limit aşıldı." }, { status: 500 });
  }
}
