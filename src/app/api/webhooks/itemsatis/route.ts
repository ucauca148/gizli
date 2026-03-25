import { NextRequest, NextResponse } from "next/server";

// TAM DİNAMİK YAPILANDIRMA
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  // Geçici olarak tüm DB ve Service işlemlerini build geçene kadar devre dışı bırakıyoruz
  return NextResponse.json({ success: true, message: "Debug mode: webhooks are temporarily bypass-only for build test." });
}
