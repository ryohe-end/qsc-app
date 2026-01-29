// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

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
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
