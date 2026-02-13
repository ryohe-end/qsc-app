import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 静的資産 / API は素通し
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authed = req.cookies.get("qsc_authed")?.value === "1";
  const role = req.cookies.get("qsc_role")?.value;

  // ---------------------------------------------------------
  // ✅ 2) 管理者ログイン画面 (最優先)
  // ---------------------------------------------------------
  if (pathname === "/admin/login") {
    // 既に管理者としてログイン済みなら管理画面へ
    if (authed && role === "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    // それ以外（未ログイン、または一般ユーザー）はアクセスOK（フォームを表示）
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // ✅ 3) 管理画面本体へのアクセス制御
  // ---------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    // 管理者権限がない場合、管理者ログインへ飛ばす
    if (!authed || role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 4) 通常ログインページへのアクセス制御
  // ---------------------------------------------------------
  if (pathname.startsWith("/login")) {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 5) その他のアプリページ（未ログインならログインへ）
  // ---------------------------------------------------------
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};