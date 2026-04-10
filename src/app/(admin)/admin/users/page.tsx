"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, Search, X, Home, Trash2, ChevronRight, Save, Mail, UserPlus,
  Shield, Building2, Hash, Loader2, Eye, EyeOff, Lock, Store, Check,
} from "lucide-react";

/* ========================= Types ========================= */
type UserRole = "admin" | "store" | "inspector";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  corpId: string;
  status: UserStatus;
  assignedStoreIds: string[]; // クラブコードの代わりに storeId 複数
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

type StoreOption = {
  storeId: string;
  name: string;
  brandName?: string;
};

type CorpOption = {
  corpId: string;
  name: string;
};

const ROLES: Record<UserRole, { label: string; tone: string; desc: string }> = {
  admin:     { label: "システム管理者", tone: "red",    desc: "全機能へのアクセス権限" },
  store:     { label: "店舗担当",       tone: "indigo", desc: "自店舗の結果閲覧と改善入力" },
  inspector: { label: "検査員",         tone: "blue",   desc: "QSC検査の実施と報告" },
};

/* ========================= Sub Components ========================= */
const Chip = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) => {
  const styles: Record<string, { bg: string; text: string; bd: string }> = {
    blue:   { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green:  { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red:    { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber:  { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    muted:  { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
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

/* ========================= StoreMultiSelect ========================= */
function StoreMultiSelect({ selected, onChange, stores }: {
  selected: string[];
  onChange: (ids: string[]) => void;
  stores: StoreOption[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = stores.filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.storeId.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (storeId: string) => {
    onChange(selected.includes(storeId) ? selected.filter(id => id !== storeId) : [...selected, storeId]);
  };

  const selectedStores = stores.filter(s => selected.includes(s.storeId));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* 選択済みタグ */}
      {selectedStores.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selectedStores.map(s => (
            <div key={s.storeId} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
              <Store size={12} color="#6366f1" />
              {s.name}
              <button type="button" onClick={() => toggle(s.storeId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "grid", placeItems: "center" }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* 検索インプット */}
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 14, top: 15, color: "#94a3b8", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="店舗名で検索して選択..."
          style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 40, paddingRight: 12, fontSize: 14, fontWeight: 600, outline: "none" }}
        />
      </div>
      {/* ドロップダウン */}
      {open && (
        <div style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 300, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8", textAlign: "center", fontWeight: 700 }}>該当する店舗がありません</div>
          ) : filtered.map(s => {
            const isSel = selected.includes(s.storeId);
            return (
              <button key={s.storeId} type="button" onClick={() => toggle(s.storeId)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: isSel ? "#f5f3ff" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? "#f5f3ff" : "transparent"; }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{s.name}</div>
                  {s.brandName && <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.brandName}</div>}
                </div>
                {isSel && <Check size={15} color="#6366f1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========================= Main ========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [corpOptions, setCorpOptions] = useState<CorpOption[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<UserRow> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isCreatingNew = selectedId === "new";

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes, sRes] = await Promise.all([
        fetch("/api/admin/qsc/users", { cache: "no-store" }),
        fetch("/api/admin/qsc/corps", { cache: "no-store" }),
        fetch("/api/admin/qsc/stores", { cache: "no-store" }),
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (uRes.ok) setUsers(uData.items || []);
      if (cRes.ok) setCorpOptions(cData.items || []);
      if (sRes.ok) setStoreOptions((sData.items || []).map((s: { storeId: string; name: string; brandName?: string }) => ({
        storeId: s.storeId,
        name: s.name,
        brandName: s.brandName,
      })));
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (selectedId === "new") {
      setDraft({ name: "", email: "", password: "", role: "inspector", corpId: corpOptions[0]?.corpId || "", status: "invited", assignedStoreIds: [] });
      setShowPassword(false);
      setDirty(true);
    } else if (selectedId) {
      const target = users.find(u => u.userId === selectedId);
      if (target) { setDraft({ ...target, assignedStoreIds: target.assignedStoreIds || [] }); setShowPassword(false); setDirty(false); }
    } else {
      setDraft(null);
    }
  }, [selectedId, users, corpOptions]);

  const displayUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.map(u => ({
      ...u,
      corpName: corpOptions.find(c => c.corpId === u.corpId)?.name || "未割当",
    })).filter(u =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.corpName.toLowerCase().includes(q)
    );
  }, [users, searchQuery, corpOptions]);

  /* ========================= Save ========================= */
  const handleSave = async () => {
    if (!draft?.name || !draft?.email || !draft?.corpId) {
      setSaveMsg("必須フィールドを入力してください");
      return;
    }
    if (isCreatingNew && !draft?.password) {
      setSaveMsg("パスワードを入力してください");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        ...draft,
        userId: isCreatingNew ? `U${Date.now()}` : selectedId,
        assignedStoreIds: draft.assignedStoreIds || [],
        sendWelcomeEmail: isCreatingNew, // 新規作成時にメール送信
      };

      const res = await fetch("/api/admin/qsc/users", {
        method: isCreatingNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "保存に失敗しました");
      }

      // inspector の場合、選択した店舗の managers を更新
      if (draft.role === "inspector") {
        await syncManagersToStores({
          userId: payload.userId as string,
          userName: draft.name,
          userEmail: draft.email,
          assignedStoreIds: payload.assignedStoreIds,
        });
      }

      await loadInitialData();
      setSelectedId(null);
      setSaveMsg(isCreatingNew ? "登録しました。招待メールを送信しました。" : "保存しました。");
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  /* 担当者を店舗のmanagersに同期 */
  const syncManagersToStores = async (params: {
    userId: string;
    userName: string;
    userEmail: string;
    assignedStoreIds: string[];
  }) => {
    // 全店舗を取得して、このユーザーのmanagers登録を更新
    const allStores = storeOptions;
    await Promise.allSettled(allStores.map(async store => {
      const shouldBeManager = params.assignedStoreIds.includes(store.storeId);
      // 現在の店舗データを取得
      const res = await fetch(`/api/admin/qsc/stores?storeId=${encodeURIComponent(store.storeId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const storeData = data.item || data;
      const currentManagers: { email: string; name: string }[] = storeData.managers || [];

      const alreadyManager = currentManagers.some(m => m.email === params.userEmail);

      let newManagers = currentManagers;
      if (shouldBeManager && !alreadyManager) {
        newManagers = [...currentManagers, { email: params.userEmail, name: params.userName }];
      } else if (!shouldBeManager && alreadyManager) {
        newManagers = currentManagers.filter(m => m.email !== params.userEmail);
      } else {
        return; // 変更なし
      }

      await fetch("/api/admin/qsc/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...storeData, managers: newManagers }),
      });
    }));
  };

  const handleDelete = async () => {
    if (!selectedId || isCreatingNew) return;
    if (!confirm("このユーザーを完全に削除しますか？")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/qsc/users?userId=${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await loadInitialData();
      setSelectedId(null);
    } catch {
      setSaveMsg("削除に失敗しました");
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
        {/* ユーザー一覧 */}
        <section className="list-card">
          <div className="search-bar">
            <div className="input-with-icon">
              <Search size={18} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="名前、メール、所属先で検索..." />
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
                ) : displayUsers.map(u => (
                  <tr key={u.userId} className={selectedId === u.userId ? "active-row" : ""} onClick={() => setSelectedId(u.userId)}>
                    <td>
                      <div className="user-info">
                        <div className="avatar">{u.name[0]}</div>
                        <div><div className="u-name">{u.name}</div><div className="u-email">{u.email}</div></div>
                      </div>
                    </td>
                    <td><Chip tone={ROLES[u.role]?.tone}>{ROLES[u.role]?.label}</Chip></td>
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

        {/* 編集パネル */}
        {selectedId && draft && (
          <aside className="editor-card">
            <div className="editor-header">
              <h2>{isCreatingNew ? "新規アカウント作成" : "詳細情報の編集"}</h2>
              <button className="btn-close" onClick={() => setSelectedId(null)}><X size={20} /></button>
            </div>
            <div className="editor-body">
              <div className="form-stack">

                {/* 氏名 */}
                <div className="form-group">
                  <FormLabel required>氏名</FormLabel>
                  <div className="input-icon-box">
                    <Users size={16} className="i-left" />
                    <input value={draft.name || ""} onChange={e => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }} placeholder="例: 山田 太郎" />
                  </div>
                </div>

                {/* メール */}
                <div className="form-group">
                  <FormLabel required>メールアドレス</FormLabel>
                  <div className="input-icon-box">
                    <Mail size={16} className="i-left" />
                    <input type="email" value={draft.email || ""} onChange={e => { setDraft({ ...draft, email: e.target.value }); setDirty(true); }} placeholder="example@joyfit.jp" />
                  </div>
                </div>

                {/* パスワード */}
                <div className="form-group">
                  <FormLabel required={isCreatingNew}>ログインパスワード</FormLabel>
                  <div className="input-icon-box" style={{ position: "relative" }}>
                    <Lock size={16} className="i-left" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={draft.password || ""}
                      onChange={e => { setDraft({ ...draft, password: e.target.value }); setDirty(true); }}
                      placeholder={isCreatingNew ? "パスワードを設定" : "変更する場合のみ入力"}
                      style={{ paddingRight: 48 }}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* ロール・法人 */}
                <div className="form-row">
                  <div className="form-group">
                    <FormLabel required>権限ロール</FormLabel>
                    <div className="select-wrapper">
                      <Shield size={16} className="i-left" />
                      <select value={draft.role} onChange={e => { setDraft({ ...draft, role: e.target.value as UserRole, assignedStoreIds: [] }); setDirty(true); }}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <FormLabel required>所属法人</FormLabel>
                    <div className="select-wrapper">
                      <Building2 size={16} className="i-left" />
                      <select value={draft.corpId} onChange={e => { setDraft({ ...draft, corpId: e.target.value }); setDirty(true); }}>
                        {corpOptions.map(c => <option key={c.corpId} value={c.corpId}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ② 担当店舗（inspectorのみ） */}
                {draft.role === "inspector" && (
                  <div className="form-group">
                    <FormLabel>担当店舗</FormLabel>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>
                      選択した店舗の担当者欄に自動で反映されます
                    </div>
                    <StoreMultiSelect
                      selected={draft.assignedStoreIds || []}
                      onChange={ids => { setDraft({ ...draft, assignedStoreIds: ids }); setDirty(true); }}
                      stores={storeOptions}
                    />
                  </div>
                )}

                {/* ① アカウント状態（invited は選択不可） */}
                <div className="form-group">
                  <FormLabel>アカウント状態</FormLabel>
                  <div className="status-grid">
                    {(["active", "invited", "suspended"] as UserStatus[]).map(s => {
                      const isInvited = s === "invited";
                      const isCurrent = draft.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={isInvited}
                          onClick={() => { if (!isInvited) { setDraft({ ...draft, status: s }); setDirty(true); } }}
                          title={isInvited ? "招待中は選択できません" : undefined}
                          className={`status-btn ${isCurrent ? "is-active" : ""} ${isInvited ? "is-disabled" : ""}`}
                        >
                          {s === "active" ? "有効" : s === "invited" ? "招待中" : "停止"}
                        </button>
                      );
                    })}
                  </div>
                  {draft.status === "invited" && (
                    <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700, marginTop: 6 }}>
                      招待メール送信後、ログインすると「有効」に切り替わります
                    </div>
                  )}
                </div>

                {/* エラー/成功メッセージ */}
                {saveMsg && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: saveMsg.includes("しました") ? "#f0fdf4" : "#fef2f2", color: saveMsg.includes("しました") ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 700 }}>
                    {saveMsg}
                  </div>
                )}

                {!isCreatingNew && (
                  <button className="btn-danger-outline" onClick={handleDelete} disabled={saving}>
                    <Trash2 size={16} /> このアカウントを削除する
                  </button>
                )}
              </div>
            </div>
            <div className="editor-footer">
              {isCreatingNew && (
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                  📧 作成後、ログイン情報をメールで送信します
                </div>
              )}
              <button className="btn-save" disabled={!dirty || saving} onClick={handleSave}>
                {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                {saving ? "保存中..." : isCreatingNew ? "登録してメール送信" : "保存"}
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
        .icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; display: grid; place-items: center; color: #fff; box-shadow: 0 10px 20px rgba(79,70,229,0.3); }
        h1 { font-size: 28px; font-weight: 900; margin: 0; }
        p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .btn-primary { background: #1e293b; color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .content-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 24px; }
        .content-grid.is-editing { grid-template-columns: 1fr 500px; }
        .list-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; overflow: hidden; }
        .search-bar { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .input-with-icon { position: relative; width: 400px; }
        .input-with-icon svg { position: absolute; left: 16px; top: 13px; color: #94a3b8; }
        .input-with-icon input { width: 100%; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding-left: 48px; outline: none; font-weight: 600; font-size: 14px; }
        .stats-badge { background: #f1f5f9; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #64748b; }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
        td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .td-loading { text-align: center; color: #94a3b8; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .active-row { background: #f5f3ff !important; }
        tr:hover { background: #fcfcfd; cursor: pointer; }
        .user-info { display: flex; align-items: center; gap: 14px; }
        .avatar { width: 40px; height: 40px; background: #eef2ff; border-radius: 12px; display: grid; place-items: center; color: #4f46e5; font-weight: 900; font-size: 16px; }
        .u-name { font-weight: 800; color: #1e293b; }
        .u-email { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .u-corp { font-size: 13px; color: #64748b; font-weight: 700; }
        .u-arrow { color: #cbd5e1; }
        .status-chip { font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; }
        .editor-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; position: sticky; top: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: calc(100vh - 64px); }
        .editor-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .editor-header h2 { font-size: 18px; font-weight: 900; margin: 0; }
        .btn-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 12px; cursor: pointer; display: grid; place-items: center; }
        .editor-body { padding: 28px 32px; overflow-y: auto; flex: 1; }
        .form-stack { display: flex; flex-direction: column; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 12px; font-weight: 900; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .required-mark { color: #ef4444; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .input-icon-box { position: relative; }
        .i-left { position: absolute; left: 14px; top: 15px; color: #94a3b8; pointer-events: none; z-index: 1; }
        input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px 12px 40px; font-size: 14px; font-weight: 600; outline: none; transition: border-color 0.2s; background: #fff; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        textarea { padding-left: 40px; resize: vertical; }
        .select-wrapper { position: relative; }
        .select-wrapper .i-left { top: 14px; }
        .password-toggle { position: absolute; right: 12px; top: 11px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
        .password-toggle:hover { color: #4f46e5; }
        .status-grid { display: flex; gap: 8px; }
        .status-btn { flex: 1; height: 44px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.15s; }
        .status-btn.is-active { border-color: #4f46e5; background: #f5f3ff; color: #4f46e5; }
        .status-btn.is-disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-danger-outline { margin-top: 8px; height: 48px; background: #fff; border: 1px solid #fee2e2; border-radius: 14px; color: #ef4444; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; font-size: 14px; }
        .editor-footer { padding: 20px 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; border-radius: 0 0 32px 32px; flex-shrink: 0; }
        .btn-save { width: 100%; height: 54px; border-radius: 16px; background: #4f46e5; color: #fff; border: none; font-size: 15px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 10px 20px -5px rgba(79,70,229,0.4); }
        .btn-save:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
