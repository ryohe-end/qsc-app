"use client";

import React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Megaphone,
  Users,
  Store,
  Shield,
  FileStack,
  ArrowUpRight,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.1) 0%, transparent 60%), #f8fafc",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: 32 }}>
        
        {/* Header Section */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#1e293b", borderRadius: 20, display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <Shield size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0, letterSpacing: "-0.04em", display: "flex", alignItems: "center", gap: 10 }}>
                Admin Console <Sparkles size={20} style={{ color: "#f59e0b" }} />
              </h1>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>システム管理・QSC基準の設定</p>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textAlign: "right" }}>
            v2.4.0<br/>Final Stable
          </div>
        </header>

        {/* Main Grid Section */}
        <div style={{ display: "grid", gap: 32 }}>
          
          {/* Group 1: Master Data */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, marginLeft: 8 }}>Master Management</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              <AdminTile
                href="/admin/qsc/stores"
                icon={<Store size={22} />}
                title="店舗管理"
                desc="拠点マスタ・稼働状態の管理"
                color="#4f46e5"
              />
              <AdminTile
                href="/admin/users"
                icon={<Users size={22} />}
                title="ユーザー管理"
                desc="アカウント発行・権限ロール設定"
                color="#4f46e5"
              />
            </div>
          </div>

          {/* Group 2: QSC Operations */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, marginLeft: 8 }}>QSC Operations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              <AdminTile
                href="/admin/qsc/improvements"
                icon={<ClipboardCheck size={24} />}
                title="改善報告管理"
                desc="指摘事項の是正進捗と完了承認"
                color="#f43f5e"
              />
              <AdminTile
                href="/admin/qsc/analytics"
                icon={<TrendingUp size={24} />}
                title="是正状況分析"
                desc="統計グラフ・店舗別状況の可視化"
                color="#ec4899"
              />
            </div>
          </div>

          {/* Group 3: QSC Configuration */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, marginLeft: 8 }}>QSC Standards</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              <AdminTile
                href="/admin/qsc/questions"
                icon={<ClipboardList size={22} />}
                title="設問マスタ"
                desc="QSCチェック項目の作成・編集"
                color="#10b981"
              />
              <AdminTile
                href="/admin/qsc/assets"
                icon={<FileStack size={22} />}
                title="アセット構成"
                desc="設問をパッケージ化し店舗へ配信"
                color="#8b5cf6"
              />
            </div>
          </div>

          {/* Group 4: Communication & System */}
          <div>
             <h2 style={{ fontSize: 13, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, marginLeft: 8 }}>System & Support</h2>
             {/* カラム数を他と合わせて2に変更（要素が1つなので左寄せになります） */}
             <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                <AdminTile
                  href="/admin/news"
                  icon={<Megaphone size={20} />}
                  title="お知らせ"
                  desc="全店配信情報の管理"
                  small
                />
             </div>
          </div>

        </div>

        {/* Footer Area */}
        <footer style={{ borderTop: "1px solid #e2e8f0", paddingTop: 32, textAlign: "center" }}>
           <p style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>© 2026 QSC Insight Platform. All rights reserved.</p>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        body { background-color: #f8fafc; margin: 0; }
      `}</style>
    </main>
  );
}

function AdminTile({
  href,
  icon,
  title,
  desc,
  color = "#64748b",
  small,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="tile-card" style={{
        padding: small ? "20px" : "28px",
        borderRadius: 28,
        background: "#fff",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)",
        height: "100%",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div className="icon-box" style={{
            width: small ? 44 : 52,
            height: small ? 44 : 52,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: `${color}10`,
            color: color,
            transition: "0.3s"
          }}>
            {icon}
          </div>
          <ArrowUpRight size={18} color="#cbd5e1" />
        </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: small ? 15 : 17, color: "#1e293b", marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", lineHeight: 1.4 }}>{desc}</div>
        </div>

        <style jsx>{`
          .tile-card:hover {
            transform: translateY(-4px);
            border-color: ${color};
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
          }
          .tile-card:hover .icon-box {
            background: ${color};
            color: #fff;
            transform: scale(1.05);
          }
        `}</style>
      </div>
    </Link>
  );
}