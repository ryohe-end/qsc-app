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

  // 2. 認証情報の取得
  // qsc_authed は path:/ と path:/admin 両方チェック
  const isAuthed = request.cookies.has('qsc_authed');
  // qsc_role は一般ログイン用、qsc_role_admin は管理者ログイン用
  const role = request.cookies.get('qsc_role')?.value;

  // 3. 管理画面 (/admin) のガード
  if (pathname.startsWith('/admin')) {
    if (!isAuthed || role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // 4. 一般画面のガード
  if (!isAuthed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. /check は inspector と admin のみアクセス可能
  if (pathname.startsWith('/check')) {
    if (role === 'store' || role === 'manager') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
