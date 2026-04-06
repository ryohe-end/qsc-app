import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  
  // ログイン時に保存したクッキーたちを呼ぶ
  const isAuthed = cookieStore.get("qsc_authed");
  const name = cookieStore.get("qsc_user_name")?.value;
  const role = cookieStore.get("qsc_user_role")?.value;
  const storeId = cookieStore.get("qsc_user_id")?.value;

  // 認証クッキーがなければ「未ログイン」として返す
  if (!isAuthed) {
    return NextResponse.json({ session: null });
  }

  // これを HomePage の useSession() が受け取って画面に名前を出す
  return NextResponse.json({
    session: {
      name: name || "名前未設定",
      role: role || "guest",
      storeId: storeId || "",
    }
  });
}