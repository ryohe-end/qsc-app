// src/app/api/ranking/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // とりあえずビルド通す用のダミー
  return NextResponse.json({ ok: true, items: [] });
}
