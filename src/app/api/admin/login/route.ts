import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_CREDENTIALS = {
  userId: process.env.ADMIN_USER_ID || "admin",
  password: process.env.ADMIN_PASSWORD || "1234",
};

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
    }

    if (userId !== ADMIN_CREDENTIALS.userId || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json({ error: "管理者IDまたはパスワードが違います" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const maxAge = 60 * 60 * 8;

    // ✅ path:"/" で発行（middlewareがどのパスでも読めるように）
    const opts = { path: "/", maxAge, httpOnly: false, sameSite: "lax" as const };

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
