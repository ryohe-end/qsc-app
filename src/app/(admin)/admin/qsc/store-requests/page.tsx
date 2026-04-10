"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Home, ChevronRight, CheckCheck, X, Loader2, ThumbsUp, ThumbsDown, Clock, Check, Store } from "lucide-react";

type RequestStatus = "pending" | "approved" | "rejected";

type StoreRequest = {
  requestId: string;
  userEmail: string;
  userName: string;
  fromStoreIds: string[];
  toStoreIds: string[];
  note?: string;
  status: RequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

type StoreOption = { storeId: string; name: string };

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: "承認待ち", color: "#d97706", bg: "#fffbeb", border: "#fef3c7" },
  approved: { label: "承認済み", color: "#059669", bg: "#f0fdf4", border: "#d1fae5" },
  rejected: { label: "却下",     color: "#dc2626", bg: "#fef2f2", border: "#fee2e2" },
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/* ========================= Sheet ========================= */
type SheetState = { open: boolean; title?: string; message?: string; primaryText?: string; cancelText?: string; onPrimary?: () => void; onCancel?: () => void };
function Sheet({ sheet }: { sheet: SheetState }) {
  if (!sheet.open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={sheet.onCancel} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 24px 48px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0", margin: "0 auto 8px" }} />
        {sheet.title && <div style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>{sheet.title}</div>}
        {sheet.message && <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>{sheet.message}</div>}
        {sheet.primaryText && <button onClick={sheet.onPrimary} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#1e293b", color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>{sheet.primaryText}</button>}
        {sheet.cancelText && <button onClick={sheet.onCancel} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{sheet.cancelText}</button>}
      </div>
    </div>
  );
}

/* ========================= Main ========================= */
export default function StoreRequestsPage() {
  const [requests, setRequests] = useState<StoreRequest[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch("/api/check/store-requests", { cache: "no-store" }),
        fetch("/api/admin/qsc/stores", { cache: "no-store" }),
      ]);
      if (rRes.ok) { const d = await rRes.json(); setRequests(d.items || []); }
      if (sRes.ok) { const d = await sRes.json(); setStores((d.items || []).map((s: StoreOption) => ({ storeId: s.storeId, name: s.name }))); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const storeName = (id: string) => stores.find(s => s.storeId === id)?.name || id;

  const filtered = useMemo(() =>
    filterStatus === "all" ? requests : requests.filter(r => r.status === filterStatus),
    [requests, filterStatus]
  );

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const allPendingSelected = filtered.filter(r => r.status === "pending").length > 0 &&
    filtered.filter(r => r.status === "pending").every(r => selectedIds.has(r.requestId));

  const toggleAll = () => {
    const pendingFiltered = filtered.filter(r => r.status === "pending");
    if (allPendingSelected) setSelectedIds(prev => { const n = new Set(prev); pendingFiltered.forEach(r => n.delete(r.requestId)); return n; });
    else setSelectedIds(prev => { const n = new Set(prev); pendingFiltered.forEach(r => n.add(r.requestId)); return n; });
  };

  const handleAction = async (ids: string[], action: "approved" | "rejected") => {
    setProcessing(true);
    setSheet({ open: false });
    try {
      const res = await fetch("/api/check/store-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds: ids, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIds(new Set());
      await load();
    } catch (e) { console.error(e); }
    finally { setProcessing(false); }
  };

  const openBulkApprove = () => {
    const targets = [...selectedIds];
    setSheet({
      open: true,
      title: `${targets.length}件をまとめて承認`,
      message: "選択した変更依頼をまとめて承認します。承認後は自動的に担当店舗が変更されます。",
      primaryText: `${targets.length}件承認する`,
      cancelText: "キャンセル",
      onPrimary: () => handleAction(targets, "approved"),
      onCancel: () => setSheet({ open: false }),
    });
  };

  const openSingleApprove = (requestId: string) => {
    setSheet({
      open: true,
      title: "承認する",
      message: "この変更依頼を承認しますか？承認後は担当店舗が変更されます。",
      primaryText: "承認する",
      cancelText: "キャンセル",
      onPrimary: () => handleAction([requestId], "approved"),
      onCancel: () => setSheet({ open: false }),
    });
  };

  const openSingleReject = (requestId: string) => {
    setSheet({
      open: true,
      title: "却下する",
      message: "この変更依頼を却下しますか？",
      primaryText: "却下する",
      cancelText: "キャンセル",
      onPrimary: () => handleAction([requestId], "rejected"),
      onCancel: () => setSheet({ open: false }),
    });
  };

  return (
    <main style={{ minHeight: "100vh", padding: "32px 24px", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } } @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} color="#cbd5e1" />
          <span style={{ color: "#1e293b", fontWeight: 900 }}>担当店舗変更申請</span>
        </nav>

        {/* ヘッダー */}
        <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 24, padding: "20px 24px", color: "#fff", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>STORE REQUESTS</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>担当店舗変更申請</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            承認待ち {pendingCount}件
          </div>
        </div>

        {/* フィルター + 一括操作 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "pending", "approved", "rejected"] as const).map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setSelectedIds(new Set()); }}
                style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", border: "1.5px solid", borderColor: filterStatus === s ? "#1e293b" : "#e2e8f0", background: filterStatus === s ? "#1e293b" : "#fff", color: filterStatus === s ? "#fff" : "#64748b", whiteSpace: "nowrap" }}>
                {s === "all" ? "すべて" : STATUS_CONFIG[s].label}
                {s !== "all" && ` (${requests.filter(r => r.status === s).length})`}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <button onClick={openBulkApprove} disabled={processing}
              style={{ padding: "9px 18px", borderRadius: 12, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCheck size={15} /> {selectedIds.size}件まとめて承認
            </button>
          )}
        </div>

        {/* 全選択 */}
        {filterStatus === "pending" && filtered.some(r => r.status === "pending") && (
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={allPendingSelected} onChange={toggleAll}
              style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>
              {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : "すべて選択"}
            </span>
          </label>
        )}

        {/* リスト */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontWeight: 700 }}>
            {filterStatus === "pending" ? "承認待ちの申請はありません" : "該当する申請はありません"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((r, idx) => {
              const cfg = STATUS_CONFIG[r.status];
              const isPending = r.status === "pending";
              return (
                <div key={r.requestId} style={{ background: "#fff", borderRadius: 20, border: `1.5px solid ${cfg.border}`, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start", animation: `fadeUp 0.3s ease ${idx * 0.04}s both` }}>
                  {/* チェックボックス（pending のみ） */}
                  {isPending && (
                    <input type="checkbox" checked={selectedIds.has(r.requestId)}
                      onChange={e => setSelectedIds(prev => { const n = new Set(prev); e.target.checked ? n.add(r.requestId) : n.delete(r.requestId); return n; })}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: "#6366f1", cursor: "pointer", flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#1e293b" }}>{r.userName}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{r.userEmail}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 8, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* 変更内容 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 12 }}>
                      <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", marginBottom: 6 }}>現在の担当店舗</div>
                        {r.fromStoreIds.length === 0 ? (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>なし</span>
                        ) : r.fromStoreIds.map(id => (
                          <div key={id} style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                            <Store size={11} /> {storeName(id)}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 18, color: "#cbd5e1" }}>→</div>
                      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 12px", border: "1px solid #d1fae5" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#059669", marginBottom: 6 }}>希望の担当店舗</div>
                        {r.toStoreIds.map(id => (
                          <div key={id} style={{ fontSize: 12, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                            <Store size={11} /> {storeName(id)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {r.note && (
                      <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
                        備考: {r.note}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {formatDate(r.requestedAt)}
                        {r.reviewedBy && <span style={{ marginLeft: 8 }}>· {r.reviewedBy} が{r.status === "approved" ? "承認" : "却下"}</span>}
                      </div>

                      {isPending && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openSingleReject(r.requestId)} disabled={processing}
                            style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #7c3aed", background: "#fff", color: "#7c3aed", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <ThumbsDown size={13} /> 却下
                          </button>
                          <button onClick={() => openSingleApprove(r.requestId)} disabled={processing}
                            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <ThumbsUp size={13} /> 承認
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet sheet={sheet} />
    </main>
  );
}
