"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Home, ChevronRight, AlertCircle, Clock, CheckCircle2,
  ImageIcon, MessageSquare, ArrowRight, X, RotateCcw, Maximize2,
  Building2, UserCheck, Download, Loader2, Send, ThumbsUp, ThumbsDown,
  CheckCheck,
} from "lucide-react";

/* ========================= Types ========================= */
type CorrectionStatus = "pending" | "submitted" | "reviewing" | "approved" | "rejected";

type NgStore = {
  id?: string; storeId?: string; PK?: string; pk?: string;
  resultPk?: string; storePk?: string;
  name?: string; storeName?: string;
  pending?: number; inspectionDate?: string; userName?: string;
};

type NgIssue = {
  id: string;
  sectionIndex: number;
  category: string;
  question: string;
  inspectorNote: string;
  deadline: string;
  beforePhoto: string;
  afterPhoto?: string;
  comment: string;
  resultPk: string;
  resultSk: string;
  correctionStatus: CorrectionStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  inspectionDate?: string;
  storeName?: string;
};

/* ========================= Status Config ========================= */
const STATUS_CONFIG: Record<CorrectionStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  pending:   { label: "未対応",   color: "#dc2626", bg: "#fef2f2", border: "#fee2e2", icon: <AlertCircle size={12} /> },
  submitted: { label: "報告済み", color: "#d97706", bg: "#fffbeb", border: "#fef3c7", icon: <Send size={12} /> },
  reviewing: { label: "確認中",   color: "#2563eb", bg: "#eff6ff", border: "#dbeafe", icon: <RotateCcw size={12} /> },
  approved:  { label: "承認済み", color: "#059669", bg: "#f0fdf4", border: "#d1fae5", icon: <CheckCheck size={12} /> },
  rejected:  { label: "差し戻し", color: "#7c3aed", bg: "#f5f3ff", border: "#ede9fe", icon: <RotateCcw size={12} /> },
};

/* ========================= Helpers ========================= */
function stripStorePrefix(v?: string) {
  return v ? String(v).replace(/^STORE#/, "").trim() || undefined : undefined;
}
function resolveStoreId(s: NgStore) {
  return stripStorePrefix(s.storeId) || stripStorePrefix(s.id) ||
    stripStorePrefix(s.PK) || stripStorePrefix(s.pk) || stripStorePrefix(s.resultPk);
}
function resolveStoreName(s: NgStore) { return s.name || s.storeName || "店舗"; }
function normalizeStores(json: unknown): NgStore[] {
  if (Array.isArray(json)) return json;
  const j = json as Record<string, unknown>;
  if (Array.isArray(j?.items)) return j.items as NgStore[];
  if (Array.isArray(j?.stores)) return j.stores as NgStore[];
  return [];
}
function normalizeImageUrl(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) { for (const e of value) { const f = normalizeImageUrl(e); if (f) return f; } return ""; }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return String(o.url || o.previewUrl || o.src || "").trim();
  }
  return "";
}
function isDisplayable(url?: string) {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("data:image/") || url.startsWith("http") || url.startsWith("/");
}
function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

/* ========================= Sheet ========================= */
type SheetState = {
  open: boolean; title?: string; message?: string;
  primaryText?: string; secondaryText?: string; cancelText?: string;
  onPrimary?: () => void; onSecondary?: () => void; onCancel?: () => void;
  inputLabel?: string; inputValue?: string; onInputChange?: (v: string) => void;
};
function Sheet({ sheet, setSheet }: { sheet: SheetState; setSheet: (s: SheetState) => void }) {
  if (!sheet.open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={sheet.onCancel} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 24px 40px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0", margin: "0 auto 8px" }} />
        {sheet.title && <div style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>{sheet.title}</div>}
        {sheet.message && <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>{sheet.message}</div>}
        {sheet.inputLabel && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{sheet.inputLabel}</div>
            <textarea value={sheet.inputValue ?? ""} onChange={e => sheet.onInputChange?.(e.target.value)}
              placeholder="コメントを入力..."
              style={{ width: "100%", boxSizing: "border-box", minHeight: 80, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "10px 12px", fontSize: 14, outline: "none", resize: "none" }} />
          </div>
        )}
        {sheet.primaryText && (
          <button onClick={sheet.onPrimary} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#1e293b", color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
            {sheet.primaryText}
          </button>
        )}
        {sheet.secondaryText && (
          <button onClick={sheet.onSecondary} style={{ width: "100%", padding: 16, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fff", color: "#1e293b", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            {sheet.secondaryText}
          </button>
        )}
        {sheet.cancelText && (
          <button onClick={sheet.onCancel} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            {sheet.cancelText}
          </button>
        )}
      </div>
    </div>
  );
}

/* ========================= StatusChip ========================= */
function StatusChip({ status }: { status: CorrectionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 8,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ========================= SafeImage ========================= */
function SafeImage({ src, style, onClick }: { src?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!isDisplayable(src) || failed) {
    return (
      <div style={{ ...style, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "#f1f5f9", color: "#94a3b8", borderRadius: 16 }}>
        <ImageIcon size={24} /><span style={{ fontSize: 11, fontWeight: 700 }}>画像なし</span>
      </div>
    );
  }
  return <img src={src} alt="" style={{ ...style, objectFit: "cover", cursor: onClick ? "zoom-in" : "default" }} onError={() => setFailed(true)} onClick={onClick} />;
}

/* ========================= Main Page ========================= */
export default function ImprovementReportsPage() {
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string; pending: number } | null>(null);
  const [detailIssue, setDetailIssue] = useState<NgIssue | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // 店舗一覧
  const [stores, setStores] = useState<NgStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 指摘一覧
  const [issues, setIssues] = useState<NgIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CorrectionStatus | "all">("all");

  // 一括選択
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sheet
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [rejectNote, setRejectNote] = useState("");

  // 店舗一覧取得
  useEffect(() => {
    fetch("/api/check/results/ng-stores", { cache: "no-store" })
      .then(r => r.ok ? r.json() : {})
      .then(json => setStores(normalizeStores(json)))
      .catch(console.error)
      .finally(() => setStoresLoading(false));
  }, []);

  // 指摘一覧取得
  useEffect(() => {
    if (!selectedStore) return;
    setIssuesLoading(true);
    fetch(`/api/check/results/ng-list?storeId=${encodeURIComponent(selectedStore.id)}&t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(json => {
        const raw = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
        setIssues(raw.map((item: Record<string, unknown>) => ({
          id: String(item.id || ""),
          sectionIndex: Number(item.sectionIndex ?? 0),
          category: String(item.category || ""),
          question: String(item.question || ""),
          inspectorNote: String(item.inspectorNote || ""),
          deadline: String(item.deadline || "期限なし"),
          beforePhoto: normalizeImageUrl(item.beforePhoto || item.beforePhotos || item.photos || ""),
          afterPhoto: normalizeImageUrl(item.afterPhoto || item.afterPhotos || "") || undefined,
          comment: String(item.comment || ""),
          resultPk: String(item.resultPk || ""),
          resultSk: String(item.resultSk || ""),
          correctionStatus: (item.correctionStatus as CorrectionStatus) || "pending",
          reviewNote: item.reviewNote ? String(item.reviewNote) : undefined,
          reviewedBy: item.reviewedBy ? String(item.reviewedBy) : undefined,
          reviewedAt: item.reviewedAt ? String(item.reviewedAt) : undefined,
          inspectionDate: item.inspectionDate ? String(item.inspectionDate) : undefined,
          storeName: item.storeName ? String(item.storeName) : undefined,
        })));
      })
      .catch(console.error)
      .finally(() => { setIssuesLoading(false); setSelectedIds(new Set()); });
  }, [selectedStore]);

  // correctionStatus 更新
  const patchStatus = useCallback(async (
    issue: NgIssue, correctionStatus: CorrectionStatus, reviewNote?: string
  ) => {
    const res = await fetch("/api/check/results/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pk: issue.resultPk, sk: issue.resultSk,
        sectionIndex: issue.sectionIndex, itemIndex: issue.id,
        correctionStatus, reviewNote: reviewNote ?? "",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "更新失敗");
    // ローカル状態を更新
    setIssues(prev => prev.map(i => i.id !== issue.id ? i : {
      ...i, correctionStatus,
      reviewNote: reviewNote ?? i.reviewNote,
    }));
    if (detailIssue?.id === issue.id) {
      setDetailIssue(prev => prev ? { ...prev, correctionStatus, reviewNote: reviewNote ?? prev.reviewNote } : null);
    }
  }, [detailIssue]);

  const handleApprove = useCallback((issue: NgIssue) => {
    setSheet({
      open: true, title: "承認する", message: "この改善報告を承認しますか？",
      primaryText: "承認する", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        try { await patchStatus(issue, "approved"); }
        catch (e) { console.error(e); setSheet({ open: true, title: "エラー", message: "承認に失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) }); }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [patchStatus]);

  const handleReject = useCallback((issue: NgIssue) => {
    setRejectNote("");
    setSheet({
      open: true, title: "差し戻し", message: "差し戻し理由を入力してください。",
      inputLabel: "差し戻し理由", inputValue: "",
      onInputChange: v => { setRejectNote(v); setSheet(s => ({ ...s, inputValue: v })); },
      primaryText: "差し戻す", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        try { await patchStatus(issue, "rejected", rejectNote); }
        catch (e) { console.error(e); setSheet({ open: true, title: "エラー", message: "差し戻しに失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) }); }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [patchStatus, rejectNote]);

  const filteredStores = useMemo(() =>
    stores.filter(s => resolveStoreName(s).includes(searchQuery)),
    [stores, searchQuery]
  );

  const filteredIssues = useMemo(() =>
    filterStatus === "all" ? issues : issues.filter(i => i.correctionStatus === filterStatus),
    [issues, filterStatus]
  );

  const statusCounts = useMemo(() =>
    issues.reduce((acc, i) => { acc[i.correctionStatus] = (acc[i.correctionStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [issues]
  );

  // 一括承認（filteredIssues の後に宣言）
  const handleBulkApprove = useCallback(() => {
    const targets = filteredIssues.filter(i =>
      selectedIds.has(i.id) &&
      (i.correctionStatus === "submitted" || i.correctionStatus === "reviewing")
    );
    if (targets.length === 0) {
      setSheet({ open: true, title: "対象なし", message: "承認可能な項目が選択されていません（報告済み・確認中のみ承認できます）", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      return;
    }
    setSheet({
      open: true,
      title: `${targets.length}件をまとめて承認`,
      message: "選択した改善報告をまとめて承認しますか？",
      primaryText: `${targets.length}件承認する`,
      cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        let success = 0;
        for (const issue of targets) {
          try { await patchStatus(issue, "approved"); success++; } catch (e) { console.error(e); }
        }
        setSelectedIds(new Set());
        setSheet({ open: true, title: "完了", message: `${success}件承認しました${success < targets.length ? `（${targets.length - success}件失敗）` : ""}`, cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [filteredIssues, selectedIds, patchStatus]);

  /* ========== 店舗一覧 ========== */
  if (!selectedStore) {
    return (
      <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc" }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } } .ir-store:hover { border-color: #6366f1 !important; transform: translateY(-2px); }`}</style>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <Home size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} color="#cbd5e1" />
            <span style={{ color: "#1e293b", fontWeight: 900 }}>改善報告管理</span>
          </nav>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 950, color: "#1e293b", margin: 0 }}>改善報告管理</h1>
              <p style={{ color: "#64748b", fontWeight: 600, marginTop: 4, margin: "4px 0 0" }}>
                是正対応が必要な店舗を選択してください
              </p>
            </div>
            <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
              <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input placeholder="店舗名で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", height: 48, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, paddingLeft: 44, fontSize: 14, fontWeight: 600, outline: "none" }} />
            </div>
          </div>

          {storesLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
              <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
            </div>
          ) : filteredStores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 28, border: "2px dashed #e2e8f0" }}>
              <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", marginBottom: 6 }}>是正待ちの店舗はありません</h2>
              <p style={{ color: "#94a3b8", fontWeight: 600 }}>すべての指摘が対応済みです</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filteredStores.map((store, i) => {
                const sid = resolveStoreId(store);
                const sname = resolveStoreName(store);
                const pending = store.pending ?? 0;
                return (
                  <button key={sid ?? i} className="ir-store"
                    onClick={() => sid && setSelectedStore({ id: sid, name: sname, pending })}
                    style={{ textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", padding: 24, borderRadius: 24, cursor: "pointer", transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: 16, animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 12, display: "grid", placeItems: "center" }}>
                        <Building2 size={20} color="#64748b" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 20, background: pending > 0 ? "#fef2f2" : "#f0fdf4", color: pending > 0 ? "#dc2626" : "#059669" }}>
                        未対応 {pending}件
                      </span>
                    </div>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", margin: "0 0 4px" }}>{sname}</h2>
                      {store.inspectionDate && (
                        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>最終点検: {store.inspectionDate}</div>
                      )}
                    </div>
                    {store.userName && (
                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                        <UserCheck size={14} color="#6366f1" /> {store.userName}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ========== 指摘一覧 ========== */
  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} color="#cbd5e1" />
          <button onClick={() => setSelectedStore(null)} style={{ background: "none", border: "none", padding: 0, color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            改善報告管理
          </button>
          <ChevronRight size={14} color="#cbd5e1" />
          <span style={{ color: "#1e293b", fontWeight: 900 }}>{selectedStore.name}</span>
        </nav>

        {/* 店舗ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, background: "#1e293b", borderRadius: 16, display: "grid", placeItems: "center" }}>
              <Building2 size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 950, color: "#1e293b", margin: 0 }}>{selectedStore.name}</h1>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>
                指摘 {issues.length}件 · 未対応 {statusCounts["pending"] ?? 0}件 · 報告済み {statusCounts["submitted"] ?? 0}件
              </p>
            </div>
          </div>
        </div>

        {/* 一括操作バー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={filteredIssues.length > 0 && filteredIssues.every(i => selectedIds.has(i.id))}
              onChange={e => {
                if (e.target.checked) setSelectedIds(new Set(filteredIssues.map(i => i.id)));
                else setSelectedIds(new Set());
              }}
              style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>
              {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : "すべて選択"}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkApprove}
              style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCheck size={15} /> {selectedIds.size}件をまとめて承認
            </button>
          )}
        </div>

        {/* フィルタータブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
          {([["all", "すべて"], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => {
            const count = key === "all" ? issues.length : (statusCounts[key] ?? 0);
            const isActive = filterStatus === key;
            const cfg = key !== "all" ? STATUS_CONFIG[key as CorrectionStatus] : null;
            return (
              <button key={key} onClick={() => setFilterStatus(key as typeof filterStatus)}
                style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 12, border: "1.5px solid", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", borderColor: isActive ? "#1e293b" : "#e2e8f0", background: isActive ? "#1e293b" : "#fff", color: isActive ? "#fff" : (cfg?.color ?? "#64748b") }}>
                {label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* 指摘カード一覧 */}
        {issuesLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "#fff", borderRadius: 32, border: "2px dashed #e2e8f0" }}>
            <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", marginBottom: 6 }}>指摘事項はありません</h2>
            <p style={{ color: "#94a3b8", fontWeight: 600 }}>選択された条件に該当する指摘データはありません</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {filteredIssues.map((issue, idx) => {
              const cfg = STATUS_CONFIG[issue.correctionStatus] ?? STATUS_CONFIG.pending;
              const canApprove = issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing";
              const canReject  = issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing" || issue.correctionStatus === "approved";
              return (
                <div key={issue.id} style={{ background: "#fff", borderRadius: 28, border: `1.5px solid ${cfg.border}`, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 380px", animation: `fadeUp 0.3s ease ${idx * 0.04}s both`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>

                  {/* 左：情報エリア */}
                  <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        {/* チェックボックス */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(issue.id)}
                          onChange={e => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(issue.id);
                              else next.delete(issue.id);
                              return next;
                            });
                          }}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: "#6366f1", cursor: "pointer", flexShrink: 0 }}
                        />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#6366f1", background: "#f5f3ff", padding: "3px 8px", borderRadius: 6 }}>{issue.category}</span>
                          {issue.inspectionDate && <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{issue.inspectionDate}</span>}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", margin: 0, lineHeight: 1.4 }}>{issue.question}</h3>
                      </div>
                      </div>
                      <StatusChip status={issue.correctionStatus} />
                    </div>

                    {/* 指摘内容 */}
                    <div style={{ background: "#fff7f7", borderLeft: "3px solid #dc2626", borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#dc2626", marginBottom: 3 }}>指摘内容</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", lineHeight: 1.4 }}>{issue.inspectorNote || "（コメントなし）"}</div>
                    </div>

                    {/* 期限 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#64748b" }}>
                      <Clock size={14} /> 改善期限: {issue.deadline}
                    </div>

                    {/* 店舗コメント */}
                    {issue.comment && (
                      <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", marginBottom: 4 }}>店舗の改善コメント</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.4 }}>{issue.comment}</div>
                      </div>
                    )}

                    {/* 差し戻しコメント */}
                    {issue.correctionStatus === "rejected" && issue.reviewNote && (
                      <div style={{ background: "#f5f3ff", borderLeft: "3px solid #7c3aed", borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", marginBottom: 3 }}>差し戻し理由</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#4c1d95" }}>{issue.reviewNote}</div>
                        {issue.reviewedBy && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{issue.reviewedBy} · {formatDate(issue.reviewedAt)}</div>}
                      </div>
                    )}

                    {/* 承認済み */}
                    {issue.correctionStatus === "approved" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f0fdf4", borderRadius: 12 }}>
                        <CheckCheck size={16} color="#059669" />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#059669" }}>承認済み</div>
                          {issue.reviewedBy && <div style={{ fontSize: 11, color: "#94a3b8" }}>{issue.reviewedBy} · {formatDate(issue.reviewedAt)}</div>}
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                      <button onClick={() => setDetailIssue(issue)}
                        style={{ flex: 1, height: 48, borderRadius: 14, background: "#f1f5f9", color: "#1e293b", border: "none", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
                        <MessageSquare size={16} /> 詳細
                      </button>
                      {canApprove && (
                        <button onClick={() => handleApprove(issue)}
                          style={{ flex: 2, height: 48, borderRadius: 14, background: "#059669", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                          <ThumbsUp size={15} /> 承認
                        </button>
                      )}
                      {canReject && (
                        <button onClick={() => handleReject(issue)}
                          style={{ flex: 2, height: 48, borderRadius: 14, background: "#fff", color: "#7c3aed", border: "1.5px solid #7c3aed", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                          <ThumbsDown size={15} /> 差し戻し
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 右：写真エリア */}
                  <div style={{ background: "#f8fafc", padding: 20, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 8, letterSpacing: "0.05em" }}>指摘時（BEFORE）</div>
                      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1/1", background: "#e2e8f0" }}>
                        <SafeImage src={issue.beforePhoto} style={{ width: "100%", height: "100%" }}
                          onClick={isDisplayable(issue.beforePhoto) ? () => setZoomedImage(issue.beforePhoto) : undefined} />
                        {isDisplayable(issue.beforePhoto) && (
                          <button onClick={() => setZoomedImage(issue.beforePhoto)}
                            style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(15,23,42,0.7)", border: "none", borderRadius: 8, padding: 6, color: "#fff", cursor: "pointer" }}>
                            <Maximize2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#cbd5e1" />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 8, letterSpacing: "0.05em" }}>改善後（AFTER）</div>
                      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1/1", background: "#e2e8f0" }}>
                        <SafeImage src={issue.afterPhoto} style={{ width: "100%", height: "100%" }}
                          onClick={isDisplayable(issue.afterPhoto) ? () => setZoomedImage(issue.afterPhoto!) : undefined} />
                        {isDisplayable(issue.afterPhoto) && (
                          <button onClick={() => setZoomedImage(issue.afterPhoto!)}
                            style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(15,23,42,0.7)", border: "none", borderRadius: 8, padding: 6, color: "#fff", cursor: "pointer" }}>
                            <Maximize2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 詳細スライドパネル */}
      {detailIssue && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setDetailIssue(null)} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, height: "100%", background: "#fff", boxShadow: "-10px 0 40px rgba(0,0,0,0.1)", display: "grid", gridTemplateRows: "auto 1fr auto", animation: "slideIn 0.3s cubic-bezier(0,0,0.2,1)" }}>
            {/* ヘッダー */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 950, margin: "0 0 4px" }}>指摘詳細</h2>
                <StatusChip status={detailIssue.correctionStatus} />
              </div>
              <button onClick={() => setDetailIssue(null)} style={{ width: 40, height: 40, borderRadius: 12, background: "#f8fafc", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <X size={20} />
              </button>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>{detailIssue.question}</div>

              <div style={{ background: "#fff7f7", borderLeft: "3px solid #dc2626", borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#dc2626", marginBottom: 3 }}>指摘内容</div>
                <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 600, lineHeight: 1.4 }}>{detailIssue.inspectorNote || "（コメントなし）"}</div>
              </div>

              {detailIssue.comment && (
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", marginBottom: 6 }}>店舗の改善コメント</div>
                  <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 600, lineHeight: 1.5 }}>{detailIssue.comment}</div>
                </div>
              )}

              {detailIssue.correctionStatus === "rejected" && detailIssue.reviewNote && (
                <div style={{ background: "#f5f3ff", borderLeft: "3px solid #7c3aed", borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", marginBottom: 3 }}>差し戻し理由</div>
                  <div style={{ fontSize: 13, color: "#4c1d95", fontWeight: 600 }}>{detailIssue.reviewNote}</div>
                </div>
              )}

              {/* 写真 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "指摘時（BEFORE）", src: detailIssue.beforePhoto },
                  { label: "改善後（AFTER）", src: detailIssue.afterPhoto },
                ].map(({ label, src }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{label}</div>
                    <div style={{ aspectRatio: "1/1", borderRadius: 14, overflow: "hidden", background: "#f1f5f9" }}>
                      <SafeImage src={src} style={{ width: "100%", height: "100%" }}
                        onClick={isDisplayable(src) ? () => setZoomedImage(src!) : undefined} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 承認・差し戻しボタン */}
            <div style={{ padding: "20px 28px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 12 }}>
              {(detailIssue.correctionStatus === "submitted" || detailIssue.correctionStatus === "reviewing") && (
                <>
                  <button onClick={() => handleReject(detailIssue)}
                    style={{ flex: 1, height: 52, borderRadius: 14, background: "#fff", color: "#7c3aed", border: "1.5px solid #7c3aed", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                    <ThumbsDown size={16} /> 差し戻し
                  </button>
                  <button onClick={() => handleApprove(detailIssue)}
                    style={{ flex: 2, height: 52, borderRadius: 14, background: "#059669", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15 }}>
                    <ThumbsUp size={16} /> 承認する
                  </button>
                </>
              )}
              {detailIssue.correctionStatus === "approved" && (
                <div style={{ flex: 1, height: 52, borderRadius: 14, background: "#f0fdf4", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 900 }}>
                  <CheckCheck size={16} /> 承認済み
                </div>
              )}
              {(detailIssue.correctionStatus === "pending" || detailIssue.correctionStatus === "rejected") && (
                <div style={{ flex: 1, height: 52, borderRadius: 14, background: "#f8fafc", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                  店舗の報告待ち
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomedImage && (
        <div onClick={() => setZoomedImage(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 40 }}>
          <button onClick={() => setZoomedImage(null)}
            style={{ position: "absolute", top: 24, right: 24, background: "#fff", border: "none", borderRadius: "50%", width: 52, height: 52, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
            <X size={24} />
          </button>
          <img src={zoomedImage} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 20, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", objectFit: "contain" }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <Sheet sheet={sheet} setSheet={setSheet} />
    </main>
  );
}
