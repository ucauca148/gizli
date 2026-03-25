import { NextRequest, NextResponse } from "next/server";
import { getCompetitors, addCompetitor } from "@/services/competitor.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const competitors = await getCompetitors();
    return NextResponse.json(competitors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, url, platform } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ error: "İsim ve URL zorunludur." }, { status: 400 });
    }
    const competitor = await addCompetitor(name, url, platform);
    return NextResponse.json(competitor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
