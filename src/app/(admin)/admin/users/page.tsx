"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Search, X, Home, Trash2, ChevronRight, Save, Mail, UserPlus,
  Clock, Shield, Building2, Hash, AlertCircle, CheckCircle2, Loader2,
  Eye, EyeOff, Lock
} from "lucide-react";

/** =========================
 * Types & Constants
 * ========================= */
type UserRole = "admin" | "store" | "inspector";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  password?: string; // 追加
  role: UserRole;
  corpId: string;
  status: UserStatus;
  clubCodes: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

type CorpOption = {
  corpId: string;
  name: string;
};

const ROLES: Record<UserRole, { label: string; tone: string; desc: string }> = {
  admin: { label: "システム管理者", tone: "red", desc: "全機能へのアクセス権限" },
  store: { label: "店舗担当", tone: "indigo", desc: "自店舗の結果閲覧と改善入力" },
  inspector: { label: "検査員", tone: "blue", desc: "QSC検査の実施と報告" },
};

/** =========================
 * Sub-Components
 * ========================= */
const Chip = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) => {
  const styles: Record<string, { bg: string; text: string; bd: string }> = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber: { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  };
  const c = styles[tone] || styles.muted;
  return (
    <span className="status-chip" style={{ background: c.bg, color: c.text, border: `1px solid ${c.bd}` }}>
      {children}
    </span>
  );
};

const FormLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="form-label">
    {children}
    {required && <span className="required-mark">*</span>}
  </label>
);

/** =========================
 * Helper Functions
 * ========================= */
const parseClubCodes = (text: string): string[] => 
  Array.from(new Set(text.split(/[\n,、\s]+/).map((v) => v.trim()).filter(Boolean)));

const formatClubCodes = (codes?: string[]): string => 
  Array.isArray(codes) ? codes.join(", ") : "";

/** =========================
 * Main Component
 * ========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [corpOptions, setCorpOptions] = useState<CorpOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<UserRow> | null>(null);
  
  // パスワード表示切り替え用
  const [showPassword, setShowPassword] = useState(false);
  
  const [clubCodesInput, setClubCodesInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  const isCreatingNew = selectedId === "new";

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch("/api/admin/qsc/users", { cache: "no-store" }),
        fetch("/api/admin/qsc/corps", { cache: "no-store" })
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      if (uRes.ok) setUsers(uData.items || []);
      if (cRes.ok) setCorpOptions(cData.items || []);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (selectedId === "new") {
      setDraft({
        name: "", email: "", password: "", role: "inspector",
        corpId: corpOptions[0]?.corpId || "",
        status: "invited", clubCodes: [],
      });
      setClubCodesInput("");
      setShowPassword(false);
      setDirty(true);
    } else if (selectedId) {
      const target = users.find(u => u.userId === selectedId);
      if (target) {
        setDraft({ ...target });
        setClubCodesInput(formatClubCodes(target.clubCodes));
        setShowPassword(false);
        setDirty(false);
      }
    } else {
      setDraft(null);
      setClubCodesInput("");
    }
  }, [selectedId, users, corpOptions]);

  const displayUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.map(u => ({
      ...u,
      corpName: corpOptions.find(c => c.corpId === u.corpId)?.name || "未割当"
    })).filter(u => 
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.corpName.toLowerCase().includes(q)
    );
  }, [users, searchQuery, corpOptions]);

  const handleSave = async () => {
    if (!draft?.name || !draft?.email || !draft?.corpId) {
      alert("必須フィールドを入力してください。");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        userId: isCreatingNew ? `U${Date.now()}` : selectedId,
        clubCodes: parseClubCodes(clubCodesInput)
      };

      const res = await fetch("/api/admin/qsc/users", {
        method: isCreatingNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("保存に失敗しました");
      
      await loadInitialData();
      setSelectedId(null);
      alert(isCreatingNew ? "新規ユーザーを登録しました" : "ユーザー情報を更新しました");
    } catch (e) {
      alert("エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreatingNew) return;
    if (!confirm("このユーザーを完全に削除しますか？\n(SK: METADATA のレコードが削除されます)")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/qsc/users?userId=${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await loadInitialData();
      setSelectedId(null);
    } catch (e) {
      alert("削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-container">
      <header className="header-wrapper">
        <div className="breadcrumb">
          <Link href="/admin" className="bc-item"><Home size={14} /> Dashboard</Link>
          <ChevronRight size={14} className="bc-sep" />
          <span className="bc-current">ユーザー管理</span>
        </div>
        <div className="title-bar">
          <div className="title-left">
            <div className="icon-box"><Users size={28} /></div>
            <div>
              <h1>ユーザー管理</h1>
              <p>組織アカウントの発行・権限設定・所属管理</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setSelectedId("new")}>
            <UserPlus size={20} /> 新規ユーザー作成
          </button>
        </div>
      </header>

      <div className={`content-grid ${selectedId ? "is-editing" : ""}`}>
        <section className="list-card">
          <div className="search-bar">
            <div className="input-with-icon">
              <Search size={18} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="名前、メール、所属先で検索..." />
            </div>
            <div className="stats-badge">全 {displayUsers.length} 件</div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ユーザー詳細</th>
                  <th>権限ロール</th>
                  <th>所属法人</th>
                  <th>ステータス</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="td-loading"><Loader2 className="spin" /> データを取得中...</td></tr>
                ) : displayUsers.map((u) => (
                  <tr key={u.userId} className={selectedId === u.userId ? "active-row" : ""} onClick={() => setSelectedId(u.userId)}>
                    <td>
                      <div className="user-info">
                        <div className="avatar">{u.name[0]}</div>
                        <div><div className="u-name">{u.name}</div><div className="u-email">{u.email}</div></div>
                      </div>
                    </td>
                    <td><Chip tone={ROLES[u.role].tone}>{ROLES[u.role].label}</Chip></td>
                    <td className="u-corp">{u.corpName}</td>
                    <td>
                      <Chip tone={u.status === "active" ? "green" : u.status === "invited" ? "amber" : "red"}>
                        {u.status === "active" ? "有効" : u.status === "invited" ? "招待中" : "停止"}
                      </Chip>
                    </td>
                    <td className="u-arrow"><ChevronRight size={18} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedId && draft && (
          <aside className="editor-card">
            <div className="editor-header">
              <h2>{isCreatingNew ? "新規アカウント作成" : "詳細情報の編集"}</h2>
              <button className="btn-close" onClick={() => setSelectedId(null)}><X size={20} /></button>
            </div>
            <div className="editor-body">
              <div className="form-stack">
                <div className="form-group">
                  <FormLabel required>氏名</FormLabel>
                  <div className="input-icon-box">
                    <Users size={16} className="i-left" />
                    <input value={draft.name || ""} onChange={e => { setDraft({...draft, name: e.target.value}); setDirty(true); }} placeholder="例: 山田 太郎" />
                  </div>
                </div>

                <div className="form-group">
                  <FormLabel required>メールアドレス</FormLabel>
                  <div className="input-icon-box">
                    <Mail size={16} className="i-left" />
                    <input type="email" value={draft.email || ""} onChange={e => { setDraft({...draft, email: e.target.value}); setDirty(true); }} placeholder="example@joyfit.jp" />
                  </div>
                </div>

                {/* パスワード入力欄 */}
                <div className="form-group">
                  <FormLabel required={isCreatingNew}>ログインパスワード</FormLabel>
                  <div className="input-icon-box password-group">
                    <Lock size={16} className="i-left" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={draft.password || ""} 
                      onChange={e => { setDraft({...draft, password: e.target.value}); setDirty(true); }} 
                      placeholder={isCreatingNew ? "パスワードを設定" : "変更する場合のみ入力"} 
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <FormLabel required>権限ロール</FormLabel>
                    <div className="select-wrapper">
                      <Shield size={16} className="i-left" />
                      <select value={draft.role} onChange={e => { setDraft({...draft, role: e.target.value as UserRole}); setDirty(true); }}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <FormLabel required>所属法人</FormLabel>
                    <div className="select-wrapper">
                      <Building2 size={16} className="i-left" />
                      <select value={draft.corpId} onChange={e => { setDraft({...draft, corpId: e.target.value}); setDirty(true); }}>
                        {corpOptions.map(c => <option key={c.corpId} value={c.corpId}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <FormLabel>対象クラブコード (任意)</FormLabel>
                  <div className="textarea-box">
                    <Hash size={16} className="i-left-top" />
                    <textarea 
                      value={clubCodesInput}
                      onChange={e => { setClubCodesInput(e.target.value); setDirty(true); }}
                      placeholder="410, 411, 512"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <FormLabel>アカウント状態</FormLabel>
                  <div className="status-grid">
                    {["active", "invited", "suspended"].map((s) => (
                      <button key={s} className={`status-btn ${draft.status === s ? "is-active" : ""}`} onClick={() => { setDraft({...draft, status: s as UserStatus}); setDirty(true); }}>
                        {s === "active" ? "有効" : s === "invited" ? "招待中" : "停止"}
                      </button>
                    ))}
                  </div>
                </div>
                {!isCreatingNew && <button className="btn-danger-outline" onClick={handleDelete}><Trash2 size={16} /> このアカウントを削除する</button>}
              </div>
            </div>
            <div className="editor-footer">
              <button className="btn-save" disabled={!dirty || saving} onClick={handleSave}>
                {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />} 
                {saving ? "保存中..." : isCreatingNew ? "登録" : "保存"}
              </button>
            </div>
          </aside>
        )}
      </div>

      <style jsx>{`
        .admin-container { min-height: 100vh; padding: 32px; background: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; }
        .header-wrapper { max-width: 1400px; margin: 0 auto 32px; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; font-weight: 600; color: #64748b; }
        .bc-item { text-decoration: none; color: inherit; display: flex; align-items: center; gap: 4px; }
        .bc-sep { color: #cbd5e1; }
        .bc-current { color: #1e293b; font-weight: 800; }
        .title-bar { display: flex; justify-content: space-between; align-items: center; }
        .title-left { display: flex; align-items: center; gap: 20px; }
        .icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; display: grid; place-items: center; color: #fff; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }
        h1 { font-size: 28px; font-weight: 900; margin: 0; }
        .btn-primary { background: #1e293b; color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        .content-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 24px; transition: 0.4s; }
        .content-grid.is-editing { grid-template-columns: 1fr 480px; }
        .list-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; overflow: hidden; }
        .search-bar { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .input-with-icon { position: relative; width: 400px; }
        .input-with-icon svg { position: absolute; left: 16px; top: 13px; color: #94a3b8; }
        .input-with-icon input { width: 100%; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding-left: 48px; outline: none; font-weight: 600; }
        .stats-badge { background: #f1f5f9; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #64748b; }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
        td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .active-row { background: #f5f3ff !important; }
        tr:hover { background: #fcfcfd; cursor: pointer; }
        .user-info { display: flex; align-items: center; gap: 14px; }
        .avatar { width: 40px; height: 40px; background: #eef2ff; border-radius: 12px; display: grid; place-items: center; color: #4f46e5; font-weight: 900; }
        .u-name { font-weight: 800; color: #1e293b; }
        .u-email { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .status-chip { font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; }
        .editor-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; position: sticky; top: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
        .editor-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .btn-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 12px; cursor: pointer; display: grid; place-items: center; }
        .editor-body { padding: 32px; overflow-y: auto; max-height: 70vh; flex: 1; }
        .form-stack { display: flex; flex-direction: column; gap: 24px; }
        .form-label { font-size: 12px; font-weight: 900; color: #64748b; display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
        .required-mark { color: #ef4444; }
        .input-icon-box { position: relative; }
        .i-left { position: absolute; left: 16px; top: 16px; color: #94a3b8; pointer-events: none; z-index: 10; }
        .i-left-top { position: absolute; left: 16px; top: 14px; color: #94a3b8; }
        input, select, textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px 14px 44px; font-size: 14px; font-weight: 700; outline: none; transition: 0.2s; }
        textarea { padding-left: 44px; resize: vertical; }
        input:focus, select:focus, textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }

        /* Password Specific */
        .password-toggle { position: absolute; right: 12px; top: 12px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
        .password-toggle:hover { color: #4f46e5; }

        .status-grid { display: flex; gap: 8px; }
        .status-btn { flex: 1; height: 44px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 800; color: #64748b; cursor: pointer; }
        .status-btn.is-active { border-color: #4f46e5; background: #f5f3ff; color: #4f46e5; }
        .btn-danger-outline { margin-top: 12px; height: 48px; background: #fff; border: 1px solid #fee2e2; border-radius: 14px; color: #ef4444; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .editor-footer { padding: 24px 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
        .btn-save { width: 100%; height: 54px; border-radius: 16px; background: #4f46e5; color: #fff; border: none; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4); }
        .btn-save:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}