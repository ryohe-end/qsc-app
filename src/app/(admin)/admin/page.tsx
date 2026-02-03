"use client";

import React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Megaphone,
  Users,
  Settings,
  Store,
  ChevronRight,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        padding: "18px 14px 28px",
        background:
          "radial-gradient(1200px 800px at 10% 0%, rgba(47,140,230,.12) 0%, transparent 55%)," +
          "radial-gradient(900px 700px at 95% 10%, rgba(47,179,109,.12) 0%, transparent 55%)," +
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(245,247,250,1) 100%)",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
        {/* ===== title (ヘッダーじゃなく “カード内ヘッド” にする) ===== */}
        <section
          style={{
            borderRadius: 22,
            border: "1px solid rgba(15,17,21,.08)",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 24px 60px rgba(15,17,21,.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 14px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(15,17,21,.92)",
                  boxShadow: "0 14px 40px rgba(15,17,21,.18)",
                }}
                aria-hidden
              >
                <Shield size={18} color="white" />
              </div>

              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>
                  管理画面
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7 }}>
                  Admin console
                </div>
              </div>
            </div>
          </div>

          {/* ===== tiles ===== */}
          <div
            style={{
              display: "grid",
              gap: 10,
              padding: "0 14px 14px",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <AdminTile
              href="/admin/stores"
              icon={<Store size={18} />}
              title="店舗管理"
              desc="店舗マスタ / 表示名 / 有効化"
            />
            <AdminTile
              href="/admin/check-items"
              icon={<ClipboardList size={18} />}
              title="チェック項目"
              desc="カテゴリ/項目の編集"
            />
            <AdminTile
              href="/admin/news"
              icon={<Megaphone size={18} />}
              title="お知らせ"
              desc="配信/公開期間"
            />
            <AdminTile
              href="/admin/users"
              icon={<Users size={18} />}
              title="ユーザー"
              desc="権限/所属/有効化"
            />
            <AdminTile
              href="/admin/settings"
              icon={<Settings size={18} />}
              title="設定"
              desc="システム設定"
              wide
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminTile({
  href,
  icon,
  title,
  desc,
  wide,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        gridColumn: wide ? "1 / -1" : undefined,
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gap: 6,
        padding: "14px 14px",
        borderRadius: 18,
        border: "1px solid rgba(15,17,21,.08)",
        background: "rgba(255,255,255,.75)",
        boxShadow: "0 12px 28px rgba(15,17,21,.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(15,17,21,.10)",
            background: "rgba(255,255,255,.90)",
          }}
          aria-hidden
        >
          {icon}
        </div>
        <div style={{ fontWeight: 950 }}>{title}</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.72 }}>{desc}</div>

      <div style={{ justifySelf: "end", opacity: 0.55 }}>
        <ChevronRight size={18} />
      </div>
    </Link>
  );
}
