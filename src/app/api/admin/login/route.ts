import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const expectedUserId = process.env.ADMIN_USER_ID;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    // 環境変数未設定なら拒否（デフォルト admin/1234 でログインさせない）
    if (!expectedUserId || !expectedPassword) {
      console.error("ADMIN_USER_ID / ADMIN_PASSWORD が未設定です");
      return NextResponse.json({ error: "管理者ログインが設定されていません" }, { status: 500 });
    }

    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
    }

    if (userId !== expectedUserId || password !== expectedPassword) {
      return NextResponse.json({ error: "管理者IDまたはパスワードが違います" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const maxAge = 60 * 60 * 8;
    const isProd = process.env.NODE_ENV === "production";

    const opts = { path: "/", maxAge, httpOnly: true, secure: isProd, sameSite: "lax" as const };

    cookieStore.set("qsc_authed", "1", opts);
    cookieStore.set("qsc_role", "admin", opts);
    cookieStore.set("qsc_user_name", encodeURIComponent("システム管理者"), opts);
    cookieStore.set("qsc_user_role", "admin", opts);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "サーバーエラー";
    console.error("Admin Login Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const deleteOpts = { path: "/", maxAge: 0 };
  cookieStore.set("qsc_authed", "", deleteOpts);
  cookieStore.set("qsc_role", "", deleteOpts);
  cookieStore.set("qsc_user_name", "", deleteOpts);
  cookieStore.set("qsc_user_role", "", deleteOpts);
  return NextResponse.json({ ok: true });
}
