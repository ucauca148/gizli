import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeCompetitorPerformance } from "@/services/ai.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitor = await prisma.competitor.findUnique({
      where: { id: params.id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!competitor || !competitor.analyses[0]) {
      return NextResponse.json({ error: "Analiz verisi bulunamadı. Önce 'Analiz Et' butonuna basın." }, { status: 400 });
    }

    const lastAnalysis = competitor.analyses[0];
    const insight = await analyzeCompetitorPerformance(
      competitor.name,
      lastAnalysis.totalReviews,
      lastAnalysis.resultJson as any
    );

    return NextResponse.json({ insight });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
