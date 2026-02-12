"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Plus,
  X,
  Home,
  Pin,
  Send,
  GripVertical,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  CheckCircle2,
  FileText
} from "lucide-react";

/** =========================
 * Types
 * ========================= */
type Brand = "all" | "JOYFIT" | "FIT365";
type NewsStatus = "draft" | "published";
type Scope = "ALL" | "DIRECT" | "FC" | "HQ";

type NewsRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  brand: Brand;
  scope: Scope;
  status: NewsStatus;
  pinned: boolean;
  order: number;
  publishedAt?: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
};

const CATEGORY_OPTIONS = ["重要", "運営", "障害", "キャンペーン", "その他"];

/** =========================
 * Sub-Components
 * ========================= */
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "blue" | "green" | "red" | "indigo" }) {
  const s = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  }[tone];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.text, border: `1px solid ${s.bd}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
    </span>
  );
}

/** =========================
 * Main Component
 * ========================= */
export default function AdminNewsPage() {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [q, setQ] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<NewsRow>>({});
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    setRows([
      { id: "N001", title: "【重要】2/10 システムメンテナンスのお知らせ", body: "2/10（火） 02:00〜04:00にメンテナンスを実施します。", category: "重要", brand: "all", scope: "ALL", status: "published", pinned: true, order: 10, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: "admin", version: 1 },
      { id: "N002", title: "QSC：写真レビューの表示を改善", body: "スマホでのプレビュー表示が安定しました。", category: "運営", brand: "all", scope: "HQ", status: "draft", pinned: false, order: 20, updatedAt: new Date().toISOString(), updatedBy: "admin", version: 1 },
    ]);
  }, []);

  const filtered = useMemo(() => {
    const list = rows.filter(r => r.title.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase()));
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
  }, [rows, q]);

  const saveNews = () => {
    if (!draft.title || !draft.body) return alert("タイトルと本文を入力してください");
    const next = { 
      ...(draft as NewsRow), 
      updatedAt: new Date().toISOString(), 
      version: (draft.version || 0) + 1 
    };

    if (sheetMode === "create") {
      setRows([{ ...next, id: `N${Date.now()}`, order: rows.length * 10 + 10 }, ...rows]);
    } else {
      setRows(rows.map(r => r.id === draft.id ? next : r));
    }
    setSheetOpen(false);
  };

  const deleteNews = (id: string) => {
    if (confirm("このお知らせを削除しますか？")) {
      setRows(rows.filter(r => r.id !== id));
      setSheetOpen(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.08) 0%, transparent 60%), #f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: 32 }}>
        
        {/* Header with Breadcrumbs */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
              <Home size={14} /> <span>Dashboard</span>
            </Link>
            <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
            <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>お知らせ管理</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 18, display: "grid", placeItems: "center", color: "#fff" }}><Bell size={26} /></div>
              <div><h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>お知らせ管理</h1><p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>全店舗への通知制御</p></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setReorderMode(!reorderMode)} style={{ height: 48, padding: "0 20px", borderRadius: 16, background: reorderMode ? "#4f46e5" : "#fff", border: "1px solid #e2e8f0", fontWeight: 800, color: reorderMode ? "#fff" : "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <GripVertical size={18} /> {reorderMode ? "完了" : "並び替え"}
              </button>
              <button onClick={() => { setSheetMode("create"); setDraft({ status: "draft", pinned: false, category: "運営" }); setSheetOpen(true); }} style={{ height: 48, padding: "0 24px", borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><Plus size={22} />新規作成</button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: "#fff", borderRadius: 24, padding: "12px", display: "flex", gap: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 16, top: 13, color: "#94a3b8" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="キーワードやIDで検索..." style={{ width: "100%", height: 44, borderRadius: 14, border: "none", background: "#f8fafc", paddingLeft: 48, outline: "none", fontSize: 14, fontWeight: 700 }} />
          </div>
        </div>

        {/* List */}
        <div style={{ display: "grid", gap: 12, paddingBottom: 100 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => { setSheetMode("edit"); setDraft(r); setSheetOpen(true); }} style={{ background: "#fff", borderRadius: 24, padding: "20px 24px", border: "1px solid #e2e8f0", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: r.pinned ? "#f5f3ff" : "#f8fafc", color: r.pinned ? "#4f46e5" : "#cbd5e1", display: "grid", placeItems: "center" }}>
                <Pin size={20} fill={r.pinned ? "currentColor" : "none"} />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Chip tone={r.category === "重要" ? "red" : "indigo"}>{r.category}</Chip>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#1e293b" }}>{r.title}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                  <span>ID: {r.id}</span>
                  <span>•</span>
                  <span style={{ color: r.status === "published" ? "#10b981" : "#94a3b8" }}>
                    {r.status === "published" ? "公開中" : "下書き"}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: "#e2e8f0" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Editor Sheet */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ flex: 1 }} onClick={() => setSheetOpen(false)} />
          <div style={{ width: "100%", maxWidth: 640, background: "#fff", height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontWeight: 950 }}>{sheetMode === "create" ? "新規作成" : "お知らせの編集"}</h2>
              <button onClick={() => setSheetOpen(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "32px", overflowY: "auto", display: "grid", gap: 24 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>タイトル</label>
                <input value={draft.title || ""} onChange={e => setDraft({...draft, title: e.target.value})} placeholder="タイトル..." style={{ height: 50, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 16px", fontSize: 16, fontWeight: 800, outline: "none" }} />
              </div>
              
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>本文</label>
                <textarea value={draft.body || ""} onChange={e => setDraft({...draft, body: e.target.value})} placeholder="本文..." style={{ minHeight: 200, borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px", fontSize: 15, fontWeight: 700, outline: "none", resize: "none", lineHeight: 1.6 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>カテゴリ</label>
                  <select value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800 }}>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>ステータス</label>
                  <select value={draft.status} onChange={e => setDraft({...draft, status: e.target.value as NewsStatus})} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800 }}>
                    <option value="draft">下書き</option>
                    <option value="published">今すぐ公開</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "20px", borderRadius: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={draft.pinned} onChange={e => setDraft({...draft, pinned: e.target.checked})} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>一覧のトップに固定（ピン留め）</span>
                </label>
              </div>

              {sheetMode === "edit" && (
                <button onClick={() => deleteNews(draft.id!)} style={{ marginTop: 20, color: "#ef4444", background: "#fef2f2", border: "1px solid #fee2e2", padding: "14px", borderRadius: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Trash2 size={16} /> お知らせを削除</button>
              )}
            </div>

            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 16, background: "#f8fafc" }}>
              <button onClick={() => setSheetOpen(false)} style={{ flex: 1, height: 54, borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", fontWeight: 800, cursor: "pointer", color: "#64748b" }}>キャンセル</button>
              <button onClick={saveNews} style={{ flex: 2, height: 54, borderRadius: 16, background: "#1e293b", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 16 }}>お知らせを保存</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        body { background-color: #f8fafc; margin: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </main>
  );
}