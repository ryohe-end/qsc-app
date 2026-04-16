"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Home, ChevronRight, AlertCircle, Clock, CheckCircle2,
  ImageIcon, Building2, UserCheck, Loader2, Send, ThumbsUp, ThumbsDown,
  CheckCheck, RotateCcw, ArrowRight, X, Maximize2,
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
  beforePhotos: string[];
  afterPhotos: string[];
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

const STATUS_STEPS: { key: CorrectionStatus; label: string }[] = [
  { key: "pending",   label: "未対応" },
  { key: "submitted", label: "報告済み" },
  { key: "reviewing", label: "確認中" },
  { key: "approved",  label: "承認済み" },
];

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

// ★ beforePhoto(単数) + beforePhotos(複数) を両方拾う
function normalizeImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value.flatMap((e) => normalizeImageUrls(e)).filter(Boolean) as string[];
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const url = String(o.url || o.previewUrl || o.src || "").trim();
    return url ? [url] : [];
  }
  return [];
}

function isDisplayable(url?: string) {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("data:image/") ||
    url.startsWith("http") || url.startsWith("/") || url.startsWith("https");
}
function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}
function getFiscalYearQuarter(dateStr?: string): { fy: number; q: number } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const fy = month >= 4 ? year : year - 1;
  const q = month >= 4 && month <= 6 ? 1 : month >= 7 && month <= 9 ? 2 : month >= 10 && month <= 12 ? 3 : 4;
  return { fy, q };
}

/* ========================= Sheet ========================= */
type SheetState = {
  open: boolean; title?: string; message?: string;
  primaryText?: string; cancelText?: string;
  onPrimary?: () => void; onCancel?: () => void;
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
    <span style={{ fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 8, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
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
      <div style={{ ...style, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "#f1f5f9", color: "#94a3b8", borderRadius: 10 }}>
        <ImageIcon size={20} /><span style={{ fontSize: 10, fontWeight: 700 }}>画像なし</span>
      </div>
    );
  }
  return (
    <div style={{ ...style, position: "relative", overflow: "hidden", borderRadius: 10 }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", cursor: onClick ? "zoom-in" : "default", display: "block" }} onError={() => setFailed(true)} onClick={onClick} />
      {onClick && (
        <button onClick={onClick} style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(15,23,42,0.65)", border: "none", borderRadius: 6, padding: 5, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <Maximize2 size={11} />
        </button>
      )}
    </div>
  );
}

/* ========================= PhotoGrid ========================= */
// カルーセルをやめて全枚数グリッド表示
function PhotoGrid({ urls, onZoom, label }: { urls: string[]; onZoom: (url: string) => void; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 6, letterSpacing: "0.05em" }}>
        {label}{urls.length > 0 && <span style={{ color: "#94a3b8", fontWeight: 600 }}> ({urls.length}枚)</span>}
      </div>
      {urls.length === 0 ? (
        <div style={{ width: "100%", aspectRatio: "21/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: 10, gap: 4 }}>
          <ImageIcon size={16} color="#94a3b8" />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>写真なし</span>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: urls.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 5,
        }}>
          {urls.map((url, i) => (
            <SafeImage key={i} src={url}
              style={{ width: "100%", aspectRatio: urls.length === 1 ? "21/9" : "16/9" }}
              onClick={() => onZoom(url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= Main Page ========================= */
export default function ImprovementReportsPage() {
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string; pending: number } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [stores, setStores] = useState<NgStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fyFilter, setFyFilter] = useState<number | "all">("all");
  const [qFilter, setQFilter] = useState<number | "all">("all");

  const [issues, setIssues] = useState<NgIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CorrectionStatus | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [rejectNote, setRejectNote] = useState("");

  const currentFy = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }, []);

  useEffect(() => { setFyFilter(currentFy); }, [currentFy]);

  useEffect(() => {
    fetch("/api/check/results/ng-stores", { cache: "no-store" })
      .then(r => r.ok ? r.json() : {})
      .then(json => setStores(normalizeStores(json)))
      .catch(console.error)
      .finally(() => setStoresLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    setIssuesLoading(true);
    fetch(`/api/check/results/ng-list?storeId=${encodeURIComponent(selectedStore.id)}&t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(json => {
        const raw = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
        setIssues(raw.map((item: Record<string, unknown>) => {
          // ★ beforePhoto(単数) と beforePhotos(複数) を結合して重複除去
          const beforeSingle = normalizeImageUrls(item.beforePhoto);
          const beforeMulti  = normalizeImageUrls(item.beforePhotos);
          const beforeAll = Array.from(new Set([...beforeSingle, ...beforeMulti]));

          return {
            id: String(item.id || ""),
            sectionIndex: Number(item.sectionIndex ?? 0),
            category: String(item.category || ""),
            question: String(item.question || ""),
            inspectorNote: String(item.inspectorNote || ""),
            deadline: String(item.deadline || "期限なし"),
            beforePhotos: beforeAll,
            afterPhotos: normalizeImageUrls(item.afterPhotos),
            comment: String(item.comment || ""),
            resultPk: String(item.resultPk || ""),
            resultSk: String(item.resultSk || ""),
            correctionStatus: (item.correctionStatus as CorrectionStatus) || "pending",
            reviewNote: item.reviewNote ? String(item.reviewNote) : undefined,
            reviewedBy: item.reviewedBy ? String(item.reviewedBy) : undefined,
            reviewedAt: item.reviewedAt ? String(item.reviewedAt) : undefined,
            inspectionDate: item.inspectionDate ? String(item.inspectionDate) : undefined,
            storeName: item.storeName ? String(item.storeName) : undefined,
          };
        }));
      })
      .catch(console.error)
      .finally(() => { setIssuesLoading(false); setSelectedIds(new Set()); });
  }, [selectedStore]);

  const patchStatus = useCallback(async (issue: NgIssue, correctionStatus: CorrectionStatus, reviewNote?: string) => {
    const res = await fetch("/api/check/results/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pk: issue.resultPk, sk: issue.resultSk, sectionIndex: issue.sectionIndex, itemIndex: issue.id, correctionStatus, reviewNote: reviewNote ?? "" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "更新失敗");
    setIssues(prev => prev.map(i => i.id !== issue.id ? i : { ...i, correctionStatus, reviewNote: reviewNote ?? i.reviewNote }));
  }, []);

  const handleApprove = useCallback((issue: NgIssue) => {
    setSheet({
      open: true, title: "承認する", message: "この改善報告を承認しますか？",
      primaryText: "承認する", cancelText: "キャンセル",
      onPrimary: async () => { setSheet({ open: false }); try { await patchStatus(issue, "approved"); } catch (e) { console.error(e); } },
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
      onPrimary: async () => { setSheet({ open: false }); try { await patchStatus(issue, "rejected", rejectNote); } catch (e) { console.error(e); } },
      onCancel: () => setSheet({ open: false }),
    });
  }, [patchStatus, rejectNote]);

  const fyOptions = useMemo(() => {
    const fys = new Set<number>();
    stores.forEach(s => { const fq = getFiscalYearQuarter(s.inspectionDate); if (fq) fys.add(fq.fy); });
    return Array.from(fys).sort((a, b) => b - a);
  }, [stores]);

  const filteredStores = useMemo(() => stores.filter(s => {
    if (!resolveStoreName(s).includes(searchQuery)) return false;
    if (fyFilter !== "all" || qFilter !== "all") {
      const fq = getFiscalYearQuarter(s.inspectionDate);
      if (!fq) return false;
      if (fyFilter !== "all" && fq.fy !== fyFilter) return false;
      if (qFilter !== "all" && fq.q !== qFilter) return false;
    }
    return true;
  }), [stores, searchQuery, fyFilter, qFilter]);

  const filteredIssues = useMemo(() =>
    filterStatus === "all" ? issues : issues.filter(i => i.correctionStatus === filterStatus),
  [issues, filterStatus]);

  const statusCounts = useMemo(() =>
    issues.reduce((acc, i) => { acc[i.correctionStatus] = (acc[i.correctionStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  [issues]);

  const handleBulkApprove = useCallback(() => {
    const targets = filteredIssues.filter(i => selectedIds.has(i.id) && (i.correctionStatus === "submitted" || i.correctionStatus === "reviewing"));
    if (targets.length === 0) {
      setSheet({ open: true, title: "対象なし", message: "承認可能な項目（報告済み・確認中）が選択されていません", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      return;
    }
    setSheet({
      open: true, title: `${targets.length}件をまとめて承認`,
      message: "選択した改善報告をまとめて承認しますか？",
      primaryText: `${targets.length}件承認する`, cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        let success = 0;
        for (const issue of targets) { try { await patchStatus(issue, "approved"); success++; } catch (e) { console.error(e); } }
        setSelectedIds(new Set());
        setSheet({ open: true, title: "完了", message: `${success}件承認しました`, cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [filteredIssues, selectedIds, patchStatus]);

  /* ========== 店舗一覧 ========== */
  if (!selectedStore) {
    return (
      <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc" }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
          .ir-store:hover { border-color:#6366f1!important; transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.12)!important; }
        `}</style>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <Home size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} color="#cbd5e1" />
            <span style={{ color: "#1e293b", fontWeight: 900 }}>改善報告管理</span>
          </nav>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 950, color: "#1e293b", margin: "0 0 4px" }}>改善報告管理</h1>
              <p style={{ color: "#64748b", fontWeight: 600, margin: 0 }}>是正対応が必要な店舗を選択してください</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select value={fyFilter} onChange={e => setFyFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                style={{ height: 44, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, fontWeight: 700, color: "#1e293b", background: "#fff", cursor: "pointer", outline: "none" }}>
                <option value="all">全年度</option>
                {fyOptions.map(fy => <option key={fy} value={fy}>{fy}年度</option>)}
              </select>
              <select value={qFilter} onChange={e => setQFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                style={{ height: 44, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, fontWeight: 700, color: "#1e293b", background: "#fff", cursor: "pointer", outline: "none" }}>
                <option value="all">全Q</option>
                <option value={1}>Q1（4-6月）</option>
                <option value={2}>Q2（7-9月）</option>
                <option value={3}>Q3（10-12月）</option>
                <option value={4}>Q4（1-3月）</option>
              </select>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input placeholder="店舗名で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: 280, height: 44, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, paddingLeft: 40, fontSize: 13, fontWeight: 600, outline: "none" }} />
              </div>
            </div>
          </div>

          {storesLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
            </div>
          ) : filteredStores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 28, border: "2px dashed #e2e8f0" }}>
              <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", marginBottom: 6 }}>是正待ちの店舗はありません</h2>
              <p style={{ color: "#94a3b8", fontWeight: 600 }}>選択した条件に該当する店舗はありません</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filteredStores.map((store, i) => {
                const sid = resolveStoreId(store);
                const sname = resolveStoreName(store);
                const pending = store.pending ?? 0;
                const fq = getFiscalYearQuarter(store.inspectionDate);
                return (
                  <button key={sid ?? i} className="ir-store"
                    onClick={() => sid && setSelectedStore({ id: sid, name: sname, pending })}
                    style={{ textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", padding: 24, borderRadius: 24, cursor: "pointer", transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: 14, animation: `fadeUp 0.3s ease ${i * 0.05}s both`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 12, display: "grid", placeItems: "center" }}>
                        <Building2 size={20} color="#64748b" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 20, background: pending > 0 ? "#fef2f2" : "#f0fdf4", color: pending > 0 ? "#dc2626" : "#059669" }}>
                        未対応 {pending}件
                      </span>
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 900, color: "#1e293b", margin: "0 0 4px" }}>{sname}</h2>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {store.inspectionDate && <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>最終点検: {store.inspectionDate}</div>}
                        {fq && <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#eef2ff", color: "#6366f1" }}>{fq.fy}年度 Q{fq.q}</span>}
                      </div>
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
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", minHeight: "100vh" }}>

        {/* ===== 左：メインコンテンツ ===== */}
        <div style={{ padding: "32px 28px", overflowY: "auto" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, fontWeight: 700 }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, background: "#1e293b", borderRadius: 14, display: "grid", placeItems: "center" }}>
              <Building2 size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 950, color: "#1e293b", margin: "0 0 2px" }}>{selectedStore.name}</h1>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: 0 }}>
                指摘 {issues.length}件 · 未対応 {statusCounts["pending"] ?? 0}件 · 報告済み {statusCounts["submitted"] ?? 0}件
              </p>
            </div>
          </div>

          {/* 一括操作バー */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox"
                checked={filteredIssues.length > 0 && filteredIssues.every(i => selectedIds.has(i.id))}
                onChange={e => { if (e.target.checked) setSelectedIds(new Set(filteredIssues.map(i => i.id))); else setSelectedIds(new Set()); }}
                style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>
                {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : "すべて選択"}
              </span>
            </label>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkApprove}
                style={{ padding: "9px 18px", borderRadius: 12, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCheck size={15} /> {selectedIds.size}件をまとめて承認
              </button>
            )}
          </div>

          {/* フィルタータブ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
            {([["all", "すべて"], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => {
              const count = key === "all" ? issues.length : (statusCounts[key] ?? 0);
              const isActive = filterStatus === key;
              const cfg = key !== "all" ? STATUS_CONFIG[key as CorrectionStatus] : null;
              return (
                <button key={key} onClick={() => setFilterStatus(key as typeof filterStatus)}
                  style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "1.5px solid", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", borderColor: isActive ? "#1e293b" : "#e2e8f0", background: isActive ? "#1e293b" : "#fff", color: isActive ? "#fff" : (cfg?.color ?? "#64748b") }}>
                  {label}{count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {/* 指摘カード */}
          {issuesLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 24, border: "2px dashed #e2e8f0" }}>
              <CheckCircle2 size={40} color="#10b981" strokeWidth={1.5} style={{ marginBottom: 10 }} />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>指摘事項はありません</h2>
              <p style={{ color: "#94a3b8", fontWeight: 600 }}>選択された条件に該当するデータはありません</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredIssues.map((issue, idx) => {
                const cfg = STATUS_CONFIG[issue.correctionStatus] ?? STATUS_CONFIG.pending;
                const canApprove = issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing";
                const canReject  = issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing" || issue.correctionStatus === "approved";

                return (
                  <div key={issue.id} style={{ background: "#fff", borderRadius: 20, border: `1.5px solid ${cfg.border}`, overflow: "hidden", animation: `fadeUp 0.3s ease ${idx * 0.04}s both` }}>

                    {/* カードヘッダー */}
                    <div style={{ padding: "18px 22px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                          <input type="checkbox" checked={selectedIds.has(issue.id)}
                            onChange={e => setSelectedIds(prev => { const n = new Set(prev); if (e.target.checked) n.add(issue.id); else n.delete(issue.id); return n; })}
                            style={{ width: 16, height: 16, marginTop: 3, accentColor: "#6366f1", cursor: "pointer", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: "#6366f1", background: "#f5f3ff", padding: "2px 7px", borderRadius: 5 }}>{issue.category}</span>
                              {issue.inspectionDate && <span style={{ fontSize: 11, color: "#94a3b8" }}>{issue.inspectionDate}</span>}
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", margin: 0, lineHeight: 1.5 }}>{issue.question}</h3>
                          </div>
                        </div>
                        <StatusChip status={issue.correctionStatus} />
                      </div>

                      {/* 指摘内容 */}
                      <div style={{ background: "#fff7f7", borderLeft: "3px solid #dc2626", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#dc2626", marginBottom: 2 }}>指摘内容</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", lineHeight: 1.5 }}>{issue.inspectorNote || "（コメントなし）"}</div>
                      </div>

                      {/* 改善期限 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>
                        <Clock size={13} /> 改善期限: {issue.deadline}
                      </div>

                      {/* 店舗コメント */}
                      {issue.comment && (
                        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 3 }}>店舗の改善コメント</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.5 }}>{issue.comment}</div>
                        </div>
                      )}

                      {/* 差し戻し理由 */}
                      {issue.correctionStatus === "rejected" && issue.reviewNote && (
                        <div style={{ background: "#f5f3ff", borderLeft: "3px solid #7c3aed", borderRadius: "0 10px 10px 0", padding: "8px 12px", marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: "#7c3aed", marginBottom: 2 }}>差し戻し理由</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#4c1d95" }}>{issue.reviewNote}</div>
                          {issue.reviewedBy && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{issue.reviewedBy} · {formatDate(issue.reviewedAt)}</div>}
                        </div>
                      )}

                      {/* 承認済み */}
                      {issue.correctionStatus === "approved" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 10, marginBottom: 10 }}>
                          <CheckCheck size={14} color="#059669" />
                          <span style={{ fontSize: 12, fontWeight: 900, color: "#059669" }}>承認済み</span>
                          {issue.reviewedBy && <span style={{ fontSize: 11, color: "#94a3b8" }}>— {issue.reviewedBy} · {formatDate(issue.reviewedAt)}</span>}
                        </div>
                      )}
                    </div>

                    {/* ★ 写真グリッド（コメント欄の下、カード幅いっぱいに表示） */}
                    <div style={{ padding: "0 22px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "start" }}>
                        <PhotoGrid urls={issue.beforePhotos} onZoom={setZoomedImage} label="指摘時（BEFORE）" />
                        <div style={{ paddingTop: 22 }}>
                          <ArrowRight size={14} color="#cbd5e1" />
                        </div>
                        <PhotoGrid urls={issue.afterPhotos} onZoom={setZoomedImage} label="改善後（AFTER）" />
                      </div>
                    </div>

                    {/* ★ 承認・差し戻しボタン（常に表示、ステータスに応じて有効/無効） */}
                    <div style={{ padding: "12px 22px 18px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
                      <button
                        onClick={() => canReject && handleReject(issue)}
                        disabled={!canReject}
                        style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, cursor: canReject ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, transition: "all 0.15s", background: canReject ? "#fff" : "#f8fafc", color: canReject ? "#7c3aed" : "#cbd5e1", border: canReject ? "1.5px solid #7c3aed" : "1.5px solid #e2e8f0" }}>
                        <ThumbsDown size={14} /> 差し戻し
                      </button>
                      <button
                        onClick={() => canApprove && handleApprove(issue)}
                        disabled={!canApprove}
                        style={{ flex: 2, height: 44, borderRadius: 12, border: "none", fontWeight: 900, cursor: canApprove ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, transition: "all 0.15s", background: canApprove ? "#059669" : "#e2e8f0", color: canApprove ? "#fff" : "#94a3b8" }}>
                        <ThumbsUp size={14} /> 承認
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== 右：ステータスパネル（固定） ===== */}
        <div style={{ position: "sticky", top: 0, height: "100vh", background: "#fff", borderLeft: "1px solid #f1f5f9", display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* サマリー */}
          <div style={{ padding: "24px 18px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1e293b", marginBottom: 12, lineHeight: 1.4 }}>{selectedStore.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {(["pending", "submitted", "reviewing", "approved"] as CorrectionStatus[]).map(status => {
                const cfg = STATUS_CONFIG[status];
                const count = statusCounts[status] ?? 0;
                return (
                  <div key={status} style={{ background: cfg.bg, borderRadius: 10, padding: "10px 11px", border: `1px solid ${cfg.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: cfg.color }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: cfg.color, opacity: 0.8, marginTop: 1 }}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 縦ステータスタイムライン */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 14 }}>是正フロー</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {STATUS_STEPS.map((step, i) => {
                const count = statusCounts[step.key] ?? 0;
                const total = issues.length || 1;
                const pct = Math.round((count / total) * 100);
                const cfg = STATUS_CONFIG[step.key];
                const isActive = count > 0;
                return (
                  <div key={step.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: isActive ? cfg.bg : "#f8fafc", border: `2px solid ${isActive ? cfg.color : "#e2e8f0"}`, display: "grid", placeItems: "center" }}>
                        {isActive && <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color }} />}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ width: 2, height: 32, background: isActive ? cfg.color : "#e2e8f0", margin: "2px 0", opacity: 0.35 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < STATUS_STEPS.length - 1 ? 20 : 0, paddingTop: 1, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? 4 : 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? cfg.color : "#94a3b8" }}>{step.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: isActive ? cfg.color : "#94a3b8" }}>{count}件</span>
                      </div>
                      {isActive && (
                        <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 2 }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 指摘一覧 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 8 }}>指摘一覧</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {issues.map(issue => {
                const cfg = STATUS_CONFIG[issue.correctionStatus] ?? STATUS_CONFIG.pending;
                return (
                  <div key={issue.id} style={{ padding: "7px 10px", borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.category}</div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: cfg.color, flexShrink: 0 }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div onClick={() => setZoomedImage(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 40 }}>
          <button onClick={() => setZoomedImage(null)}
            style={{ position: "absolute", top: 24, right: 24, background: "#fff", border: "none", borderRadius: "50%", width: 52, height: 52, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
            <X size={24} />
          </button>
          <img src={zoomedImage} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 20, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", objectFit: "contain" }} onClick={e => e.stopPropagation()} alt="" />
        </div>
      )}

      <Sheet sheet={sheet} setSheet={setSheet} />
    </main>
  );
}
