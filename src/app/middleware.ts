// src/middleware.ts
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

  // Cookieでログイン判定
  const authed = req.cookies.get("qsc_authed")?.value === "1";

  // 2) ログインページへのアクセス制御
  if (pathname.startsWith("/login")) {
    // 既にログイン済みならホームへリダイレクト
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // 未ログインならそのままログインページを表示
    return NextResponse.next();
  }

  // 3) その他のページ（未ログインならログインへ強制転送）
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