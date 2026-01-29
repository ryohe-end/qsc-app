// src/components/AppHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isLogin = useMemo(() => pathname?.startsWith("/login"), [pathname]);

  // いまは認証未実装なので「仮のログイン状態」をローカルで判定（後でFirebaseに置換）
  const isAuthed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("qsc_authed") === "1";
  }, []);

  if (isLogin) return null;

  return (
    <header className="qsc-header">
      <div className="qsc-header-inner">
        <Link href="/" className="qsc-header-brand" onClick={() => setOpen(false)}>
          <BrandLogo width={110} />
          <div className="qsc-header-brandText">
            <div className="qsc-header-title">QSC Check</div>
            <div className="qsc-header-sub">Quality / Service / Cleanliness</div>
          </div>
        </Link>

        <nav className="qsc-nav-desktop">
          <Link className="qsc-nav-link" href="/dashboard">
            ダッシュボード
          </Link>
          <Link className="qsc-nav-link" href="/check">
            QSCチェック
          </Link>
          <Link className="qsc-nav-link" href="/ng">
            NG是正
          </Link>
          <Link className="qsc-nav-link" href="/results">
            結果
          </Link>
          <Link className="qsc-nav-link" href="/admin">
            管理
          </Link>
        </nav>

        <div className="qsc-header-right">
          {isAuthed ? (
            <button
              className="qsc-userbtn"
              onClick={() => {
                // 仮ログアウト
                localStorage.removeItem("qsc_authed");
                location.href = "/login";
              }}
            >
              ログアウト
            </button>
          ) : (
            <Link className="qsc-userbtn" href="/login">
              ログイン
            </Link>
          )}

          <button
            className="qsc-burger"
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <div className="qsc-nav-mobile">
          <Link className="qsc-nav-m-link" href="/dashboard" onClick={() => setOpen(false)}>
            ダッシュボード
          </Link>
          <Link className="qsc-nav-m-link" href="/check" onClick={() => setOpen(false)}>
            QSCチェック
          </Link>
          <Link className="qsc-nav-m-link" href="/ng" onClick={() => setOpen(false)}>
            NG是正
          </Link>
          <Link className="qsc-nav-m-link" href="/results" onClick={() => setOpen(false)}>
            結果
          </Link>
          <Link className="qsc-nav-m-link" href="/admin" onClick={() => setOpen(false)}>
            管理
          </Link>
        </div>
      )}
    </header>
  );
}
