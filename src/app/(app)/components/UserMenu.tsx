"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LogOut, Lock, Store, ChevronDown, X, Eye, EyeOff, Check, Search } from "lucide-react";

type StoreOption = { storeId: string; name: string; brandName?: string };

type Props = {
  userName: string;
  role: string;
  onLogout: () => void;
};

/* ========================= Sheet ========================= */
type SheetState = {
  open: boolean;
  title?: string;
  content?: React.ReactNode;
};

export function UserMenu({ userName, role, onLogout }: Props) {
  const [dropOpen, setDropOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const closeSheet = () => setSheet({ open: false });

  const openPasswordChange = () => {
    setDropOpen(false);
    // ドロップダウンが閉じた後にシートを開く
    setTimeout(() => {
      setSheet({ open: true, title: "パスワード変更", content: <PasswordChangeForm onClose={closeSheet} /> });
    }, 50);
  };

  const openStoreRequest = () => {
    setDropOpen(false);
    setTimeout(() => {
      setSheet({ open: true, title: "担当店舗変更依頼", content: <StoreChangeRequestForm onClose={closeSheet} /> });
    }, 50);
  };

  const isInspector = role === "inspector";

  return (
    <>
      {/* トリガーボタン */}
      <div ref={dropRef} style={{ position: "relative" }}>
        <button
          onClick={() => setDropOpen(!dropOpen)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 14, background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#1e293b" }}
        >
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eef2ff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900, color: "#4f46e5" }}>
            {userName?.charAt(0) || "?"}
          </div>
          {userName}
          <ChevronDown size={14} color="#94a3b8" style={{ transition: "transform 0.2s", transform: dropOpen ? "rotate(180deg)" : "none" }} />
        </button>

        {dropOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220, background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: 8, zIndex: 1000 }}>
            {/* ユーザー情報 */}
            <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid #f1f5f9", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{userName}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>{
                role === "admin" ? "システム管理者" :
                role === "inspector" ? "検査員" :
                role === "manager" ? "店舗担当" : role
              }</div>
            </div>

            {/* パスワード変更 */}
            <button onClick={openPasswordChange} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#1e293b" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Lock size={15} color="#6366f1" /> パスワード変更
            </button>

            {/* 担当店舗変更依頼（検査員のみ） */}
            {isInspector && (
              <button onClick={openStoreRequest} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#1e293b" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Store size={15} color="#10b981" /> 担当店舗変更依頼
              </button>
            )}

            {/* ログアウト */}
            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
              <button onClick={onLogout} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#dc2626" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} /> ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      {/* シートオーバーレイ（Portal経由でbodyに描画） */}
      {sheet.open && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={closeSheet} />
          <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 48px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1e293b" }}>{sheet.title}</div>
              <button onClick={closeSheet} style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <X size={18} />
              </button>
            </div>
            {sheet.content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ========================= パスワード変更フォーム ========================= */
function PasswordChangeForm({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!current || !next || !confirm) { setError("すべての項目を入力してください"); return; }
    if (next !== confirm) { setError("新しいパスワードが一致しません"); return; }
    if (next.length < 6) { setError("新しいパスワードは6文字以上で設定してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "変更に失敗しました");
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <Check size={48} color="#059669" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#059669" }}>パスワードを変更しました</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {[
        { label: "現在のパスワード", value: current, onChange: setCurrent, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
        { label: "新しいパスワード", value: next, onChange: setNext, show: showNext, toggle: () => setShowNext(!showNext) },
        { label: "新しいパスワード（確認）", value: confirm, onChange: setConfirm, show: showNext, toggle: () => setShowNext(!showNext) },
      ].map((f, i) => (
        <div key={i}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 6 }}>{f.label}</div>
          <div style={{ position: "relative" }}>
            <input
              type={f.show ? "text" : "password"}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", height: 48, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 48px 0 16px", fontSize: 15, fontWeight: 600, outline: "none" }}
            />
            <button type="button" onClick={f.toggle} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
              {f.show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      ))}

      <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: loading ? "#e2e8f0" : "#1e293b", color: "#fff", fontSize: 15, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
        {loading ? "変更中..." : "パスワードを変更する"}
      </button>
    </div>
  );
}

/* ========================= 担当店舗変更依頼フォーム ========================= */
function StoreChangeRequestForm({ onClose }: { onClose: () => void }) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [currentStoreIds, setCurrentStoreIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch("/api/admin/qsc/stores", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        if (sRes.ok) {
          const sData = await sRes.json();
          setStores((sData.items || []).map((s: StoreOption) => ({ storeId: s.storeId, name: s.name, brandName: s.brandName })));
        }
        if (uRes.ok) {
          const uData = await uRes.json();
          const current = uData.user?.assignedStoreIds || [];
          setCurrentStoreIds(current);
          setSelectedIds(current); // 現在の店舗を初期選択
        }
      } catch (e) { console.error(e); }
      finally { setFetching(false); }
    };
    load();
  }, []);

  const filtered = stores.filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setError(null);
    if (selectedIds.length === 0) { setError("希望の担当店舗を選択してください"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/check/store-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStoreIds: currentStoreIds, toStoreIds: selectedIds, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "申請に失敗しました");
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <Check size={48} color="#059669" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#059669" }}>変更依頼を送信しました</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>管理者が承認後に反映されます</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {/* 現在の担当店舗 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 8 }}>現在の担当店舗</div>
        {currentStoreIds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>なし</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {currentStoreIds.map(id => {
              const s = stores.find(x => x.storeId === id);
              return <span key={id} style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "#f1f5f9", color: "#475569" }}>{s?.name || id}</span>;
            })}
          </div>
        )}
      </div>

      {/* 希望の担当店舗 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 8 }}>希望の担当店舗（複数選択可）</div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 14, color: "#94a3b8" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="店舗名で検索..."
            style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 12, border: "1px solid #e2e8f0", paddingLeft: 36, fontSize: 14, fontWeight: 600, outline: "none" }} />
        </div>
        {fetching ? (
          <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>読み込み中...</div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 14, padding: 6 }}>
            {filtered.map(s => {
              const isSel = selectedIds.includes(s.storeId);
              return (
                <button key={s.storeId} type="button" onClick={() => toggle(s.storeId)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: isSel ? "#f0fdf4" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{s.name}</div>
                    {s.brandName && <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.brandName}</div>}
                  </div>
                  {isSel && <Check size={15} color="#059669" />}
                </button>
              );
            })}
          </div>
        )}
        {selectedIds.length > 0 && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginTop: 6 }}>
            {selectedIds.length}店舗選択中
          </div>
        )}
      </div>

      {/* 備考 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 6 }}>備考（任意）</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="変更理由など"
          style={{ width: "100%", boxSizing: "border-box", minHeight: 64, borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, fontWeight: 600, outline: "none", resize: "none" }} />
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: loading ? "#e2e8f0" : "#059669", color: "#fff", fontSize: 15, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "送信中..." : "変更依頼を送信する"}
      </button>
    </div>
  );
}
