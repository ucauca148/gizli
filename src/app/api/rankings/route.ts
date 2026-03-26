import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trackers = await prisma.rankTracker.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(trackers);
}

export async function POST(req: NextRequest) {
  try {
    const { categoryUrl, myStoreUserId } = await req.json();
    
    if (!categoryUrl || !myStoreUserId) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }

    const tracker = await prisma.rankTracker.create({
      data: { categoryUrl, myStoreUserId }
    });

    return NextResponse.json(tracker);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
