import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 無条件でパスさせる（無限ループ防止）
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. 認証情報の取得（auth.ts でセットしている名前に合わせる）
  const isAuthed = request.cookies.has('qsc_authed');
  const role = request.cookies.get('qsc_role')?.value; // roleを取得

  // 3. 管理画面 (/admin) のガード
  if (pathname.startsWith('/admin')) {
    // ログインしていない、またはロールが admin じゃない場合はログイン画面へ
    if (!isAuthed || role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // 4. 一般画面のガード
  // 未ログインなら強制的に /login へ
  if (!isAuthed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};