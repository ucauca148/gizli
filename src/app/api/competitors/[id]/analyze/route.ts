import { NextRequest, NextResponse } from "next/server";
import { scrapeCompetitor } from "@/services/competitor.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analysis = await scrapeCompetitor(params.id);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
