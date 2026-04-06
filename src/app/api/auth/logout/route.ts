import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  
  // 認証関連のクッキーをすべて削除
  cookieStore.delete("qsc_authed");
  cookieStore.delete("qsc_user_role");
  cookieStore.delete("qsc_user_id");
  cookieStore.delete("admin_session");

  return NextResponse.json({ ok: true });
}