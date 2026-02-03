"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";

export default function AdminUsersPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontWeight: 950 }}>ユーザー</h1>
      <p style={{ opacity: 0.75 }}>ここに権限/所属を作る</p>
      <Link href="/admin">← 管理トップへ</Link>
    </main>
  );
}
