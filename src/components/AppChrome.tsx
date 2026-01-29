"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ チェック実行中は「全画面」にして、共通ヘッダー/下タブも消す
  const isRun = pathname === "/check/run" || pathname.startsWith("/check/run/");

  if (isRun) {
    // /check/run は page.tsx 側で TopBar/BottomBar を持つので、ここでは何も足さない
    return <>{children}</>;
  }

  // ✅ 通常ページはこれまで通り「スマホ枠 + 固定ヘッダー + 下タブ」
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
