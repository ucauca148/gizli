import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMyRanks } from "@/services/rank.service";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    await prisma.rankTracker.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tracker = await prisma.rankTracker.findUnique({ where: { id: params.id } });
    if (!tracker) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    // Tarama işlemini başlat
    const analysis = await findMyRanks(tracker.categoryUrl, tracker.myStoreUserId);

    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
