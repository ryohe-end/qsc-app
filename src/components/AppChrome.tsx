"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ チェック実行中
  const isRun = pathname === "/check/run" || pathname.startsWith("/check/run/");

  // ✅ Login/Authなど（枠を出さない想定のページがあるならここで判定してもOK）
  const isAuth =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");

  // ---------------------------
  // 1) /check/run ：枠は使うが Header/BottomNav を出さない
  // ---------------------------
  if (isRun) {
    return (
      <>
        <main
          className="qsc-frame qsc-frame--run"
          role="application"
          aria-label="QSC Check Run"
        >
          <section className="qsc-frame-shell qsc-frame-shell--run" aria-label="Run shell">
            <div className="qsc-frame-scroll qsc-frame-scroll--run">{children}</div>
          </section>
        </main>
      </>
    );
  }

  // ---------------------------
  // 2) Login/Auth ：（必要なら）枠ごと出さない
  // ---------------------------
  if (isAuth) {
    return <>{children}</>;
  }

  // ---------------------------
  // 3) 通常ページ：これまで通り
  // ---------------------------
  return (
    <>
      <AppHeader />
      <main className="qsc-frame" role="application" aria-label="QSC App">
        <section className="qsc-frame-shell" aria-label="App shell">
          <div className="qsc-frame-scroll">{children}</div>
        </section>
      </main>
      <AppBottomNav />
    </>
  );
}