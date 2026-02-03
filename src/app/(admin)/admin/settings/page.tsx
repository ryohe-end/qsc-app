"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontWeight: 950 }}>設定</h1>
      <p style={{ opacity: 0.75 }}>ここにシステム設定を作る</p>
      <Link href="/admin">← 管理トップへ</Link>
    </main>
  );
}
