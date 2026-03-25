import { NextRequest, NextResponse } from "next/server";
import { scrapeCompetitor } from "@/services/competitor.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { days } = await req.json().catch(() => ({}));
    const daysNum = parseInt(days) || 30; // Varsayılan 30 gün
    
    console.log(`[API] Rakip ${params.id} için ${daysNum} günlük analiz başlatılıyor.`);
    const analysis = await scrapeCompetitor(params.id, daysNum);
    
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
