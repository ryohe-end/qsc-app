import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  
  // 認証関連のクッキーをすべて削除
  for (const name of [
    "qsc_authed",
    "qsc_role",
    "qsc_user_role",
    "qsc_user_id",
    "qsc_user_name",
    "qsc_store_id",
    "admin_session",
  ]) {
    cookieStore.delete(name);
  }

  return NextResponse.json({ ok: true });
}