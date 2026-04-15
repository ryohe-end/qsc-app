"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LogOut, Lock, Store, ChevronDown, X,
  Eye, EyeOff, Check, Search, Plus, Loader2,
} from "lucide-react";

type StoreOption = { storeId: string; name: string; brandName?: string; bizName?: string };

type Props = {
  userName: string;
  role: string;
  onLogout: () => void;
};

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
    setTimeout(() => {
      setSheet({ open: true, title: "パスワード変更", content: <PasswordChangeForm onClose={closeSheet} /> });
    }, 50);
  };

  const openAreaChange = () => {
    setDropOpen(false);
    setTimeout(() => {
      setSheet({ open: true, title: "担当エリア変更依頼", content: <AreaChangeRequestForm onClose={closeSheet} /> });
    }, 50);
  };

  const isInspector = role === "inspector";

  return (
    <>
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
            <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid #f1f5f9", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{userName}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>
                {role === "admin" ? "システム管理者"
                  : role === "inspector" ? "検査員"
                  : role === "manager" ? "店舗担当" : role}
              </div>
            </div>

            <button
              onClick={openPasswordChange}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#1e293b" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Lock size={15} color="#6366f1" /> パスワード変更
            </button>

            {isInspector && (
              <button
                onClick={openAreaChange}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#1e293b" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Store size={15} color="#10b981" /> 担当エリア変更依頼
              </button>
            )}

            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={onLogout}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 800, color: "#dc2626" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} /> ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      {sheet.open && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={closeSheet} />
          <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 48px", maxHeight: "90vh", overflowY: "auto" }}>
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

/* ========================= 担当エリア変更依頼フォーム ========================= */
type AreaItem = { storeId: string; name: string; brandName?: string };

function AreaChangeRequestForm({ onClose }: { onClose: () => void }) {
  const [currentAreas, setCurrentAreas] = useState<AreaItem[]>([]);
  const [toRemove, setToRemove] = useState<Set<string>>(new Set());
  const [toAdd, setToAdd] = useState<AreaItem[]>([]);
  const [allStores, setAllStores] = useState<StoreOption[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch("/api/user/areas", { cache: "no-store" }),
          fetch("/api/check/stores", { cache: "no-store" }),
        ]);
        if (aRes.ok) { const d = await aRes.json(); setCurrentAreas(d.items ?? []); }
        if (sRes.ok) {
          const d = await sRes.json();
          const items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
          setAllStores(items.map((s: StoreOption) => ({ storeId: s.storeId, name: s.name, brandName: s.brandName })));
        }
      } catch (e) { console.error(e); }
      finally { setFetching(false); }
    };
    load();
  }, []);

  const toggleRemove = (storeId: string) => {
    setToRemove(prev => { const n = new Set(prev); n.has(storeId) ? n.delete(storeId) : n.add(storeId); return n; });
  };

  const addStore = (store: StoreOption) => {
    if (currentAreas.some(a => a.storeId === store.storeId)) return;
    if (toAdd.some(a => a.storeId === store.storeId)) return;
    setToAdd(prev => [...prev, store]);
    setShowSearch(false);
    setQuery("");
  };

  const removeFromAdd = (storeId: string) => setToAdd(prev => prev.filter(s => s.storeId !== storeId));

  const handleSubmit = async () => {
    setError(null);
    const fromStoreIds = currentAreas.map(a => a.storeId);
    const toStoreIds = [
      ...currentAreas.filter(a => !toRemove.has(a.storeId)).map(a => a.storeId),
      ...toAdd.map(a => a.storeId),
    ];
    if (toRemove.size === 0 && toAdd.length === 0) { setError("変更がありません"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/check/store-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStoreIds, toStoreIds, note }),
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

  const currentIds = new Set([...currentAreas.map(a => a.storeId), ...toAdd.map(a => a.storeId)]);
  const filtered = allStores.filter(s =>
    !currentIds.has(s.storeId) && (!query || s.name.toLowerCase().includes(query.toLowerCase()))
  );
  const hasChanges = toRemove.size > 0 || toAdd.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {/* 現在の担当エリア */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 10 }}>現在の担当エリア</div>
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
          </div>
        ) : currentAreas.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>担当エリアはありません</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {currentAreas.map(area => {
              const isRemoving = toRemove.has(area.storeId);
              return (
                <div key={area.storeId} onClick={() => toggleRemove(area.storeId)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, cursor: "pointer", border: `1.5px solid ${isRemoving ? "#fca5a5" : "#e2e8f0"}`, background: isRemoving ? "#fef2f2" : "#f8fafc", transition: "all 0.15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isRemoving ? "#dc2626" : "#e2e8f0"}`, background: isRemoving ? "#dc2626" : "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {isRemoving && <X size={12} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isRemoving ? "#dc2626" : "#1e293b" }}>{area.name}</div>
                      {area.brandName && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{area.brandName}</div>}
                    </div>
                  </div>
                  {isRemoving && <span style={{ fontSize: 11, fontWeight: 900, color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 6 }}>削除</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 追加エリア */}
      {toAdd.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#059669", marginBottom: 10 }}>追加するエリア</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {toAdd.map(store => (
              <div key={store.storeId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #86efac", background: "#f0fdf4" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{store.name}</div>
                  {store.brandName && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{store.brandName}</div>}
                </div>
                <button onClick={() => removeFromAdd(store.storeId)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#dcfce7", color: "#059669", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 新規追加 / 検索 */}
      {!showSearch ? (
        <button onClick={() => setShowSearch(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 14, border: "1.5px dashed #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 800, color: "#64748b", cursor: "pointer" }}>
          <Plus size={16} /> 担当エリアを追加
        </button>
      ) : (
        <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <Search size={15} color="#94a3b8" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="店舗名で検索..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#1e293b", background: "transparent" }} />
            <button onClick={() => { setShowSearch(false); setQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                {query ? "該当する店舗がありません" : "店舗名を入力してください"}
              </div>
            ) : filtered.slice(0, 20).map(s => (
              <button key={s.storeId} onClick={() => addStore(s)}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f8fafc" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{s.name}</div>
                  {s.brandName && <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.brandName}</div>}
                </div>
                <Plus size={14} color="#059669" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 備考 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 6 }}>備考（任意）</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="変更理由など"
          style={{ width: "100%", boxSizing: "border-box", minHeight: 64, borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, fontWeight: 600, outline: "none", resize: "none" }} />
      </div>

      {/* 変更サマリー */}
      {hasChanges && (
        <div style={{ background: "#f8fafc", borderRadius: 14, padding: "12px 14px", fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
          {toRemove.size > 0 && <div style={{ color: "#dc2626", fontWeight: 700 }}>削除: {Array.from(toRemove).map(id => currentAreas.find(a => a.storeId === id)?.name || id).join("、")}</div>}
          {toAdd.length > 0 && <div style={{ color: "#059669", fontWeight: 700 }}>追加: {toAdd.map(a => a.name).join("、")}</div>}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !hasChanges}
        style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: loading || !hasChanges ? "#e2e8f0" : "#059669", color: "#fff", fontSize: 15, fontWeight: 900, cursor: loading || !hasChanges ? "not-allowed" : "pointer" }}>
        {loading ? "送信中..." : "変更依頼を送信する"}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
