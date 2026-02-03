// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

/* =========================
   Metadata
   ========================= */
export const metadata: Metadata = {
  title: "QSC Check",
  description: "Quality / Service / Cleanliness 点検アプリ",
};

/* =========================
   Viewport
   ========================= */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* =========================
   Root Layout（最小）
   ========================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}