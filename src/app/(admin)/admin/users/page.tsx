"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  X,
  Home,
  Trash2,
  ChevronRight,
  Sparkles,
  Save,
  Mail,
  ShieldCheck,
  Building2,
  UserPlus,
  Clock,
  MoreVertical,
} from "lucide-react";

/** =========================
 * Types & Constants
 * ========================= */
type UserRole = "admin" | "manager" | "inspector";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  corporateName: string;
  status: UserStatus;
  lastLogin?: string;
  updatedAt: string;
};

const ROLES: Record<UserRole, { label: string; tone: string }> = {
  admin: { label: "システム管理者", tone: "red" },
  manager: { label: "カンパニー担当", tone: "indigo" },
  inspector: { label: "検査員", tone: "blue" },
};

const CORPORATE_MASTER = ["自社本部", "株式会社オカモト", "株式会社ヤマウチ", "FCパートナーA", "FCパートナーB"];

/** =========================
 * Mock Data
 * ========================= */
const INITIAL_USERS: UserRow[] = [
  { userId: "U001", name: "山田 太郎", email: "yamada@example.com", role: "admin", corporateName: "自社本部", status: "active", lastLogin: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { userId: "U002", name: "佐藤 花子", email: "sato@example.com", role: "inspector", corporateName: "株式会社オカモト", status: "active", lastLogin: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { userId: "U003", name: "鈴木 一郎", email: "suzuki@example.com", role: "manager", corporateName: "FCパートナーA", status: "invited", updatedAt: new Date().toISOString() },
];

/** =========================
 * UI Components
 * ========================= */

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const s: any = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber: { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  }[tone || "muted"];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.text, border: `1px solid ${s.bd}`, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

/** =========================
 * Main Page
 * ========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<UserRow> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  // エディタの同期
  useEffect(() => {
    if (selectedId === "new") {
      setDraft({ name: "", email: "", role: "inspector", corporateName: CORPORATE_MASTER[0], status: "invited" });
      setDirty(true);
    } else if (selectedId) {
      const sel = users.find(u => u.userId === selectedId);
      if (sel) { setDraft({ ...sel }); setDirty(false); }
    } else {
      setDraft(null);
    }
  }, [selectedId, users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => u.name.includes(searchQuery) || u.email.includes(searchQuery) || u.corporateName.includes(searchQuery));
  }, [users, searchQuery]);

  const saveUser = () => {
    if (!draft?.name || !draft?.email) return alert("氏名とメールアドレスは必須です");
    
    const updated = {
      ...(draft as UserRow),
      userId: selectedId === "new" ? `U${String(Date.now()).slice(-3)}` : (draft.userId as string),
      updatedAt: new Date().toISOString()
    };

    if (selectedId === "new") {
      setUsers([updated, ...users]);
    } else {
      setUsers(users.map(u => u.userId === updated.userId ? updated : u));
    }
    
    setSelectedId(updated.userId);
    setDirty(false);
    alert("保存しました");
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px", color: "#0f172a", background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.05) 0%, transparent 50%), #f8fafc", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header with Breadcrumbs */}
      <div style={{ maxWidth: 1400, margin: "0 auto 32px", display: "grid", gap: 16 }}>
        {/* Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            <Home size={14} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
          <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>ユーザー管理</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 16, display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)" }}>
              <Users size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0, letterSpacing: "-0.04em" }}>ユーザー管理</h1>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>アカウント発行と権限設定</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setSelectedId("new")} style={{ height: 46, padding: "0 24px", borderRadius: 14, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={20} />新規ユーザー</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: selectedId ? "1fr 480px" : "1fr", gap: 24, transition: "0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        
        {/* User List Panel */}
        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 32, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative", maxWidth: 400 }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 12, color: "#94a3b8" }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="氏名、メール、企業名で検索..." style={{ width: "100%", height: 42, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 44, outline: "none", fontSize: 14, fontWeight: 700 }} />
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "16px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>ユーザー</th>
                  <th style={{ padding: "16px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>権限</th>
                  <th style={{ padding: "16px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>所属企業</th>
                  <th style={{ padding: "16px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>状態</th>
                  <th style={{ padding: "16px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>最終ログイン</th>
                  <th style={{ padding: "16px 24px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.userId} onClick={() => setSelectedId(u.userId)} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: selectedId === u.userId ? "#f5f3ff" : "transparent", transition: "0.2s" }}>
                    <td style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f1f5f9", display: "grid", placeItems: "center", fontWeight: 900, color: "#4f46e5", fontSize: 14 }}>{u.name[0]}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "20px 24px" }}><Chip tone={ROLES[u.role].tone}>{ROLES[u.role].label}</Chip></td>
                    <td style={{ padding: "20px 24px", fontSize: 13, fontWeight: 700, color: "#64748b" }}>{u.corporateName}</td>
                    <td style={{ padding: "20px 24px" }}>
                      <Chip tone={u.status === "active" ? "green" : u.status === "invited" ? "amber" : "red"}>{u.status === "active" ? "有効" : u.status === "invited" ? "招待中" : "停止"}</Chip>
                    </td>
                    <td style={{ padding: "20px 24px", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={14} /> {u.lastLogin ? u.lastLogin.slice(0, 10) : "未ログイン"}</div>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "right" }}><ChevronRight size={18} color="#cbd5e1" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Edit/Create Side Panel */}
        {selectedId && draft && (
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 32, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)", display: "grid", gridTemplateRows: "auto 1fr auto", overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>{selectedId === "new" ? "新規ユーザー登録" : "ユーザー詳細"}</h2>
              <button onClick={() => setSelectedId(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 12, width: 36, height: 36, cursor: "pointer", display: "grid", placeItems: "center" }}><X size={20} /></button>
            </div>

            <div style={{ padding: "32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Profile Card */}
              <div style={{ background: "#f8fafc", padding: "24px", borderRadius: 24, border: "1px solid #f1f5f9", textAlign: "center" }}>
                <div style={{ width: 80, height: 80, background: "#fff", borderRadius: 28, display: "grid", placeItems: "center", margin: "0 auto 16px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
                  <Users size={32} color="#4f46e5" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{draft.name || "氏名未入力"}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{draft.email || "メールアドレス未入力"}</div>
              </div>

              {/* Form Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>氏名</label>
                  <input value={draft.name} onChange={e => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }} placeholder="例: 巡回 太郎" style={{ height: 48, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 16px", fontSize: 14, fontWeight: 700, outline: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>メールアドレス</label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: 16, top: 16, color: "#94a3b8" }} />
                    <input value={draft.email} onChange={e => { setDraft({ ...draft, email: e.target.value }); setDirty(true); }} placeholder="user@joyfit.jp" style={{ width: "100%", height: 48, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 44, fontSize: 14, fontWeight: 700, outline: "none" }} />
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>権限ロール</label>
                    <select value={draft.role} onChange={e => { setDraft({ ...draft, role: e.target.value as UserRole }); setDirty(true); }} style={{ height: 48, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, fontWeight: 800, background: "#f8fafc" }}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>所属先</label>
                    <select value={draft.corporateName} onChange={e => { setDraft({ ...draft, corporateName: e.target.value }); setDirty(true); }} style={{ height: 48, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, fontWeight: 800, background: "#f8fafc" }}>
                      {CORPORATE_MASTER.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>ステータス設定</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["active", "invited", "suspended"] as UserStatus[]).map(s => (
                      <button key={s} onClick={() => { setDraft({ ...draft, status: s }); setDirty(true); }} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid", borderColor: draft.status === s ? "#4f46e5" : "#e2e8f0", background: draft.status === s ? "#f5f3ff" : "#fff", color: draft.status === s ? "#4f46e5" : "#64748b", fontWeight: 800, fontSize: 11, cursor: "pointer", transition: "0.2s" }}>
                        {s === "active" ? "有効" : s === "invited" ? "招待中" : "停止"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedId !== "new" && (
                <button onClick={() => { if(confirm("このユーザーを削除しますか？")) { setUsers(users.filter(u => u.userId !== selectedId)); setSelectedId(null); } }} style={{ marginTop: 24, height: 48, borderRadius: 16, border: "1px solid #fee2e2", background: "none", color: "#f87171", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Trash2 size={18} />アカウント削除</button>
              )}
            </div>

            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <button onClick={saveUser} disabled={!dirty} style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: dirty ? "#4f46e5" : "#cbd5e1", color: "#fff", fontWeight: 950, fontSize: 15, cursor: dirty ? "pointer" : "default", boxShadow: dirty ? "0 10px 15px -3px rgba(79, 70, 229, 0.3)" : "none", transition: "0.3s" }}>
                <Save size={20} style={{ marginRight: 8, display: "inline" }} />
                {selectedId === "new" ? "ユーザーを招待する" : "変更を保存する"}
              </button>
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        body { background-color: #f8fafc; margin: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </main>
  );
}