// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";

export const metadata: Metadata = {
  title: "QSC Check",
  description: "Quality / Service / Cleanliness 点検アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {/* 固定ヘッダー */}
        <AppHeader />

        {/* ✅ 全ページを “スマホ枠” に入れる */}
        <main className="qsc-frame" role="application" aria-label="QSC App">
          <section className="qsc-frame-shell" aria-label="App shell">
            <div className="qsc-frame-scroll">{children}</div>
          </section>
        </main>

        {/* 固定フッター（下タブ） */}
        <AppBottomNav />
      </body>
    </html>
  );
}
