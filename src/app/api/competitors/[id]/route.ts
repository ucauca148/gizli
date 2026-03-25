import { NextRequest, NextResponse } from "next/server";
import { deleteCompetitor } from "@/services/competitor.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteCompetitor(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
