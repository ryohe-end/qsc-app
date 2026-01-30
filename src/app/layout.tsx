// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

/* =========================
   Metadata
   ========================= */
export const metadata: Metadata = {
  title: "QSC Check",
  description: "Quality / Service / Cleanliness 点検アプリ",
};

/* =========================
   Viewport（スマホ拡大対策の本命）
   ========================= */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iPhone notch / safe-area 対応
};

/* =========================
   Root Layout
   ========================= */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}