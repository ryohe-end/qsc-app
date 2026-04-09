"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Camera, Trash2, Clock, CheckCircle2,
  Building2, Loader2, AlertCircle, ImageOff, X, CheckCheck,
  ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, Send,
} from "lucide-react";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

/* ========================= Types ========================= */
type CorrectionStatus = "pending" | "submitted" | "reviewing" | "approved" | "rejected";

type UploadedPhoto = { id?: string; key?: string; url?: string; contentType?: string };

type NgIssue = {
  id: string;
  sectionIndex: number;
  category: string;
  question: string;
  inspectorNote: string;
  deadline: string;
  beforePhoto: string;
  comment: string;
  isSubmitting?: boolean;
  resultPk: string;
  resultSk: string;
  resultId?: string;
  inspectionDate?: string;
  correctionStatus: CorrectionStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  storeId?: string;
  storeName?: string;
  afterPhotoFile?: File;
  afterPhotoPreviewUrl?: string;
};

type NgStore = {
  id?: string; storeId?: string; PK?: string; pk?: string;
  resultPk?: string; storePk?: string; resultId?: string;
  name?: string; storeName?: string; pending?: number;
  inspectionDate?: string; userName?: string;
};

/* ========================= Status Config ========================= */
const STATUS_CONFIG: Record<CorrectionStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  pending:   { label: "未対応",   color: "#dc2626", bg: "#fef2f2", border: "#fee2e2", icon: <AlertCircle size={13} /> },
  submitted: { label: "報告済み", color: "#d97706", bg: "#fffbeb", border: "#fef3c7", icon: <Send size={13} /> },
  reviewing: { label: "確認中",   color: "#2563eb", bg: "#eff6ff", border: "#dbeafe", icon: <RotateCcw size={13} /> },
  approved:  { label: "承認済み", color: "#059669", bg: "#f0fdf4", border: "#d1fae5", icon: <CheckCheck size={13} /> },
  rejected:  { label: "差し戻し", color: "#7c3aed", bg: "#f5f3ff", border: "#ede9fe", icon: <RotateCcw size={13} /> },
};

/* ========================= Helpers ========================= */
function stripStorePrefix(v?: string) {
  return v ? String(v).replace(/^STORE#/, "").trim() || undefined : undefined;
}
function resolveStoreId(s: NgStore) {
  return stripStorePrefix(s.storeId) || stripStorePrefix(s.id) || stripStorePrefix(s.PK) ||
    stripStorePrefix(s.pk) || stripStorePrefix(s.resultPk) || stripStorePrefix(s.storePk);
}
function resolveStoreName(s: NgStore) { return s.name || s.storeName || "店舗"; }
function normalizeNgStores(json: unknown): NgStore[] {
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
    return String(o.url || o.previewUrl || o.src || o.key || "").trim();
  }
  return "";
}
function cleanupPreviewUrl(url?: string) { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); }
function isDisplayable(url?: string) {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("data:image/") ||
    url.startsWith("http") || url.startsWith("/");
}
function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

/* ========================= API helpers ========================= */
async function uploadAfterPhoto(target: NgIssue): Promise<UploadedPhoto[]> {
  if (!target.afterPhotoFile) return [];
  const form = new FormData();
  form.append("file", target.afterPhotoFile);
  form.append("pk", target.resultPk);
  form.append("sk", target.resultSk);
  form.append("itemId", target.id);
  form.append("sectionIndex", String(target.sectionIndex));
  const res = await fetch("/api/check/results/upload-after-photo", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "After画像アップロード失敗");
  return json?.photo ? [json.photo] : [];
}

async function patchIssue(target: NgIssue, newStatus: CorrectionStatus = "submitted") {
  const afterPhotos = await uploadAfterPhoto(target);
  const res = await fetch("/api/check/results/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pk: target.resultPk, sk: target.resultSk,
      sectionIndex: target.sectionIndex, itemIndex: target.id,
      correction: target.comment, status: newStatus, afterPhotos,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "更新失敗");
}

async function patchCorrectionStatus(
  target: NgIssue,
  correctionStatus: CorrectionStatus,
  reviewNote?: string
) {
  const res = await fetch("/api/check/results/update-correction-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pk: target.resultPk, sk: target.resultSk,
      sectionIndex: target.sectionIndex, itemIndex: target.id,
      correctionStatus, reviewNote: reviewNote ?? "",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "ステータス更新失敗");
}

/* ========================= SafeImage ========================= */
function SafeImage({ src, alt, style, onClick }: {
  src?: string; alt: string; style?: React.CSSProperties; onClick?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!isDisplayable(src) || failed) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: 12 }}>
        <ImageOff size={22} /><span style={{ fontSize: 11 }}>画像なし</span>
      </div>
    );
  }
  return <img src={src} alt={alt} style={{ ...style, borderRadius: 12, objectFit: "cover" }} onError={() => setFailed(true)} onClick={onClick} />;
}

/* ========================= StatusBadge ========================= */
function StatusBadge({ status }: { status: CorrectionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 8, fontSize: 11, fontWeight: 900,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
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
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0", margin: "0 auto 8px" }} />
        {sheet.title && <div style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>{sheet.title}</div>}
        {sheet.message && <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>{sheet.message}</div>}
        {sheet.inputLabel && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{sheet.inputLabel}</div>
            <textarea
              value={sheet.inputValue ?? ""}
              onChange={e => sheet.onInputChange?.(e.target.value)}
              placeholder="コメントを入力..."
              style={{ width: "100%", boxSizing: "border-box", minHeight: 80, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "10px 12px", fontSize: 14, fontWeight: 600, outline: "none", resize: "none" }}
            />
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

/* ========================= Issue Card ========================= */
function IssueCard({
  issue, isAdmin, fileInputRef,
  onUpdateIssue, onSubmit, onApprove, onReject, onSetActiveId,
  isBulkSubmitting,
}: {
  issue: NgIssue; isAdmin: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpdateIssue: (id: string, patch: Partial<NgIssue>) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSetActiveId: (id: string) => void;
  isBulkSubmitting: boolean;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const cfg = STATUS_CONFIG[issue.correctionStatus] ?? STATUS_CONFIG.pending;
  const isApproved = issue.correctionStatus === "approved";
  const canSubmit = !isAdmin && !isApproved && !!issue.comment?.trim() && !issue.isSubmitting && !isBulkSubmitting;
  const canApprove = isAdmin && (issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing");
  const canReject  = isAdmin && (issue.correctionStatus === "submitted" || issue.correctionStatus === "reviewing" || issue.correctionStatus === "approved");

  return (
    <>
      <div style={{
        background: "#fff", borderRadius: 20,
        border: `1.5px solid ${isApproved ? "#d1fae5" : cfg.border}`,
        overflow: "hidden",
        opacity: isApproved ? 0.7 : 1,
      }}>
        {/* カードヘッダー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 7, background: "#f1f5f9", color: "#64748b" }}>{issue.category}</span>
            <StatusBadge status={issue.correctionStatus} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
            <Clock size={12} /> {issue.deadline}まで
          </div>
        </div>

        <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 設問 */}
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", lineHeight: 1.45 }}>{issue.question}</div>

          {/* 指摘内容 */}
          <div style={{ background: "#fff7f7", borderLeft: "3px solid #dc2626", borderRadius: "0 10px 10px 0", padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#dc2626", marginBottom: 3 }}>指摘内容</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", lineHeight: 1.4 }}>{issue.inspectorNote || "（コメントなし）"}</div>
          </div>

          {/* 写真エリア */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>指摘時の写真</div>
              <SafeImage src={issue.beforePhoto} alt="Before" style={{ width: "100%", height: 120, cursor: issue.beforePhoto ? "zoom-in" : "default" }}
                onClick={issue.beforePhoto ? () => setPreviewSrc(issue.beforePhoto) : undefined}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>改善後の写真</div>
              {issue.afterPhotoPreviewUrl ? (
                <div style={{ position: "relative" }}>
                  <SafeImage src={issue.afterPhotoPreviewUrl} alt="After" style={{ width: "100%", height: 120, cursor: "zoom-in" }}
                    onClick={() => setPreviewSrc(issue.afterPhotoPreviewUrl!)}
                  />
                  {!isApproved && !isAdmin && (
                    <button onClick={() => { cleanupPreviewUrl(issue.afterPhotoPreviewUrl); onUpdateIssue(issue.id, { afterPhotoFile: undefined, afterPhotoPreviewUrl: undefined }); }}
                      style={{ position: "absolute", top: 5, right: 5, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={() => { onSetActiveId(issue.id); fileInputRef.current?.click(); }}
                  disabled={isApproved || isAdmin}
                  style={{ width: "100%", height: 120, border: "2px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: isApproved || isAdmin ? "default" : "pointer" }}>
                  <Camera size={24} color="#94a3b8" />
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>撮影する</span>
                </button>
              )}
            </div>
          </div>

          {/* 改善対策コメント */}
          {!isAdmin && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>実施した改善対策</div>
              <textarea
                value={issue.comment}
                onChange={e => onUpdateIssue(issue.id, { comment: e.target.value })}
                disabled={isApproved}
                placeholder="例：清掃を実施しました。備品を交換しました。"
                style={{ width: "100%", boxSizing: "border-box", minHeight: 72, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, fontWeight: 600, outline: "none", resize: "none", background: isApproved ? "#f8fafc" : "#fff" }}
              />
            </div>
          )}

          {/* 店舗のコメント表示（admin向け） */}
          {isAdmin && issue.comment && (
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", marginBottom: 4 }}>店舗の改善コメント</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.4 }}>{issue.comment}</div>
            </div>
          )}

          {/* 差し戻しコメント表示 */}
          {issue.correctionStatus === "rejected" && issue.reviewNote && (
            <div style={{ background: "#f5f3ff", borderLeft: "3px solid #7c3aed", borderRadius: "0 10px 10px 0", padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", marginBottom: 3 }}>差し戻し理由</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4c1d95" }}>{issue.reviewNote}</div>
              {issue.reviewedBy && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{issue.reviewedBy} · {formatDate(issue.reviewedAt)}</div>}
            </div>
          )}

          {/* 承認済み表示 */}
          {issue.correctionStatus === "approved" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f0fdf4", borderRadius: 12 }}>
              <CheckCheck size={16} color="#059669" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#059669" }}>承認済み</div>
                {issue.reviewedBy && <div style={{ fontSize: 11, color: "#94a3b8" }}>{issue.reviewedBy} · {formatDate(issue.reviewedAt)}</div>}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* 店舗ユーザー：送信ボタン */}
            {!isAdmin && !isApproved && (
              <button onClick={() => onSubmit(issue.id)} disabled={!canSubmit}
                style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "none", background: canSubmit ? "#1e293b" : "#e2e8f0", color: canSubmit ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: 900, cursor: canSubmit ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {issue.isSubmitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><Send size={14} /> 改善報告を送信</>}
              </button>
            )}

            {/* admin：承認・差し戻しボタン */}
            {isAdmin && (
              <>
                {canApprove && (
                  <button onClick={() => onApprove(issue.id)}
                    style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "none", background: "#059669", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ThumbsUp size={14} /> 承認
                  </button>
                )}
                {canReject && (
                  <button onClick={() => onReject(issue.id)}
                    style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1.5px solid #7c3aed", background: "#fff", color: "#7c3aed", fontSize: 14, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ThumbsDown size={14} /> 差し戻し
                  </button>
                )}
                {!canApprove && !canReject && (
                  <div style={{ flex: 1, padding: "13px 0", borderRadius: 14, background: "#f8fafc", color: "#94a3b8", fontSize: 13, fontWeight: 800, textAlign: "center" }}>
                    対応待ち
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 画像プレビューモーダル */}
      {previewSrc && (
        <div onClick={() => setPreviewSrc(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <button onClick={() => setPreviewSrc(null)} style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <X size={20} />
          </button>
          <img src={previewSrc} alt="preview" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

/* ========================= Store Ng View ========================= */
function StoreNgView({ storeName, storeId, isAdmin, onBack }: {
  storeName: string; storeId: string; isAdmin: boolean; onBack?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [issues, setIssues] = useState<NgIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [rejectNote, setRejectNote] = useState("");
  const [filter, setFilter] = useState<CorrectionStatus | "all">("all");

  useEffect(() => {
    const cleanId = String(storeId).replace(/^STORE#/, "");
    if (!cleanId || cleanId === "undefined") {
      setError("店舗IDが取得できませんでした");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/check/results/ng-list?storeId=${encodeURIComponent(cleanId)}&t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        const raw = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
        setIssues(raw.map((item: Record<string, unknown>) => ({
          id: String(item.id || ""),
          sectionIndex: Number(item.sectionIndex ?? 0),
          category: String(item.category || "カテゴリ不明"),
          question: String(item.question || ""),
          inspectorNote: String(item.inspectorNote || ""),
          deadline: String(item.deadline || "期限なし"),
          beforePhoto: normalizeImageUrl(item.beforePhoto || item.beforePhotos || item.photos || ""),
          comment: String(item.comment || ""),
          isSubmitting: false,
          resultPk: String(item.resultPk || ""),
          resultSk: String(item.resultSk || ""),
          resultId: item.resultId ? String(item.resultId) : undefined,
          inspectionDate: item.inspectionDate ? String(item.inspectionDate) : undefined,
          correctionStatus: (item.correctionStatus as CorrectionStatus) || "pending",
          reviewNote: item.reviewNote ? String(item.reviewNote) : undefined,
          reviewedBy: item.reviewedBy ? String(item.reviewedBy) : undefined,
          reviewedAt: item.reviewedAt ? String(item.reviewedAt) : undefined,
          storeId: item.storeId ? String(item.storeId) : undefined,
          storeName: item.storeName ? String(item.storeName) : undefined,
        })));
      })
      .catch(e => { console.error(e); setError("データの読み込みに失敗しました"); })
      .finally(() => setLoading(false));
  }, [storeId]);

  const updateIssue = useCallback((id: string, patch: Partial<NgIssue>) => {
    setIssues(prev => prev.map(iss => iss.id !== id ? iss : { ...iss, ...patch }));
  }, []);

  const handleSubmit = useCallback((issueId: string) => {
    const target = issues.find(i => i.id === issueId);
    if (!target) return;
    setSheet({
      open: true, title: "改善報告を送信", message: "この内容で改善報告を送信しますか？",
      primaryText: "送信する", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        updateIssue(issueId, { isSubmitting: true });
        try {
          await patchIssue(target, "submitted");
          cleanupPreviewUrl(target.afterPhotoPreviewUrl);
          updateIssue(issueId, { correctionStatus: "submitted", isSubmitting: false, afterPhotoFile: undefined, afterPhotoPreviewUrl: undefined });
        } catch (e) {
          console.error(e);
          updateIssue(issueId, { isSubmitting: false });
          setSheet({ open: true, title: "エラー", message: "送信に失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
        }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [issues, updateIssue]);

  const handleApprove = useCallback((issueId: string) => {
    const target = issues.find(i => i.id === issueId);
    if (!target) return;
    setSheet({
      open: true, title: "承認する", message: "この改善報告を承認しますか？",
      primaryText: "承認する", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        updateIssue(issueId, { isSubmitting: true });
        try {
          await patchCorrectionStatus(target, "approved");
          updateIssue(issueId, { correctionStatus: "approved", isSubmitting: false });
        } catch (e) {
          console.error(e);
          updateIssue(issueId, { isSubmitting: false });
          setSheet({ open: true, title: "エラー", message: "承認に失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
        }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [issues, updateIssue]);

  const handleReject = useCallback((issueId: string) => {
    const target = issues.find(i => i.id === issueId);
    if (!target) return;
    setRejectNote("");
    setSheet({
      open: true, title: "差し戻し", message: "差し戻し理由を入力してください。",
      inputLabel: "差し戻し理由", inputValue: "", onInputChange: v => { setRejectNote(v); setSheet(s => ({ ...s, inputValue: v })); },
      primaryText: "差し戻す", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        updateIssue(issueId, { isSubmitting: true });
        try {
          await patchCorrectionStatus(target, "rejected", rejectNote);
          updateIssue(issueId, { correctionStatus: "rejected", reviewNote: rejectNote, isSubmitting: false });
        } catch (e) {
          console.error(e);
          updateIssue(issueId, { isSubmitting: false });
          setSheet({ open: true, title: "エラー", message: "差し戻しに失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
        }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [issues, updateIssue, rejectNote]);

  const handleBulkSubmit = useCallback(() => {
    const targets = issues.filter(i => !i.isSubmitting && i.correctionStatus !== "approved" && i.comment?.trim());
    if (targets.length === 0) {
      setSheet({ open: true, title: "送信対象なし", message: "改善対策コメントを入力してください", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      return;
    }
    setSheet({
      open: true, title: `${targets.length}件をまとめて送信`, message: "入力済みの改善報告をまとめて送信します。",
      primaryText: `${targets.length}件送信する`, cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        setIsBulkSubmitting(true);
        let success = 0;
        for (const t of targets) {
          try {
            await patchIssue(t, "submitted");
            cleanupPreviewUrl(t.afterPhotoPreviewUrl);
            updateIssue(t.id, { correctionStatus: "submitted", afterPhotoFile: undefined, afterPhotoPreviewUrl: undefined });
            success++;
          } catch (e) { console.error(e); }
        }
        setIsBulkSubmitting(false);
        setSheet({ open: true, title: "完了", message: `${success}件送信しました${success < targets.length ? `（${targets.length - success}件失敗）` : ""}`, cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [issues, updateIssue]);

  // フィルタリング・集計
  const statusCounts = issues.reduce((acc, i) => {
    acc[i.correctionStatus] = (acc[i.correctionStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filter === "all" ? issues : issues.filter(i => i.correctionStatus === filter);
  const bulkCount = issues.filter(i => i.correctionStatus !== "approved" && i.comment?.trim()).length;

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 80, color: "#94a3b8" }}>
      <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 700 }}>取得中...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <AlertCircle size={40} color="#dc2626" style={{ marginBottom: 12 }} />
      <p style={{ fontWeight: 700, color: "#1e293b" }}>{error}</p>
      {onBack && <button onClick={onBack} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer" }}>戻る</button>}
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } } @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 100 }}>
        {/* 戻るボタン */}
        {onBack ? (
          <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <ChevronLeft size={18} /> 戻る
          </button>
        ) : (
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", textDecoration: "none" }}>
            <ChevronLeft size={18} /> ホームへ
          </Link>
        )}

        {/* ヒーローカード */}
        <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 24, padding: "20px", color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>是正管理</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>{storeName}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {(["pending","submitted","reviewing","approved","rejected"] as CorrectionStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = statusCounts[s] ?? 0;
              return (
                <div key={s} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: count > 0 ? cfg.color : "rgba(255,255,255,0.3)" }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 一括送信ボタン（店舗ユーザーのみ） */}
        {!isAdmin && bulkCount > 0 && (
          <button onClick={handleBulkSubmit} disabled={isBulkSubmitting}
            style={{ width: "100%", padding: 16, borderRadius: 16, border: "none", background: "#059669", color: "#fff", fontSize: 15, fontWeight: 900, cursor: isBulkSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {isBulkSubmitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <><Send size={16} /> {bulkCount}件をまとめて送信</>}
          </button>
        )}

        {/* フィルタータブ */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
          {([["all", "すべて"], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => {
            const count = key === "all" ? issues.length : (statusCounts[key] ?? 0);
            const isActive = filter === key;
            const cfg = key !== "all" ? STATUS_CONFIG[key as CorrectionStatus] : null;
            return (
              <button key={key} onClick={() => setFilter(key as typeof filter)}
                style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", border: "1.5px solid", borderColor: isActive ? "#1e293b" : "#e2e8f0", background: isActive ? "#1e293b" : "#fff", color: isActive ? "#fff" : (cfg?.color ?? "#64748b"), transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {label} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Issue リスト */}
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "#94a3b8" }}>
            <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {filter === "all" ? "対応が必要な指摘はありません" : `${STATUS_CONFIG[filter as CorrectionStatus]?.label}の項目はありません`}
            </span>
          </div>
        ) : (
          filtered.map(issue => (
            <div key={`${issue.resultPk}-${issue.resultSk}-${issue.id}`} style={{ animation: "fadeUp 0.3s ease both" }}>
              {/* チェック日グループヘッダー */}
              {issue.inspectionDate && (
                <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8", marginBottom: 8, paddingLeft: 4 }}>
                  点検日: {issue.inspectionDate}
                </div>
              )}
              <IssueCard
                issue={issue} isAdmin={isAdmin} fileInputRef={fileInputRef}
                onUpdateIssue={updateIssue} onSubmit={handleSubmit}
                onApprove={handleApprove} onReject={handleReject}
                onSetActiveId={setActiveIssueId} isBulkSubmitting={isBulkSubmitting}
              />
            </div>
          ))
        )}
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file || !activeIssueId) return;
          const url = URL.createObjectURL(file);
          setIssues(prev => prev.map(iss => {
            if (iss.id !== activeIssueId) return iss;
            cleanupPreviewUrl(iss.afterPhotoPreviewUrl);
            return { ...iss, afterPhotoFile: file, afterPhotoPreviewUrl: url };
          }));
          e.target.value = "";
        }}
      />
      <Sheet sheet={sheet} setSheet={setSheet} />
    </>
  );
}

/* ========================= Admin Dashboard ========================= */
function AdminNgDashboard({ onSelect }: { onSelect: (store: { id: string; name: string }) => void }) {
  const [stores, setStores] = useState<NgStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/check/results/ng-stores", { cache: "no-store" })
      .then(r => r.ok ? r.json() : {})
      .then(json => setStores(normalizeNgStores(json)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 24, padding: "20px", color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>NG MANAGEMENT</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>是正状況一覧</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{stores.length}店舗に指摘が残っています</div>
      </div>

      {stores.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "#94a3b8" }}>
          <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 800 }}>是正待ちの店舗はありません</span>
        </div>
      ) : (
        stores.map((store, i) => {
          const sid = resolveStoreId(store);
          const sname = resolveStoreName(store);
          return (
            <button key={sid ?? i} onClick={() => { if (!sid) return; onSelect({ id: sid, name: sname }); }}
              style={{ width: "100%", textAlign: "left", padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", animation: "fadeUp 0.3s ease both", animationDelay: `${i * 0.04}s` }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#f1f5f9", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Building2 size={20} color="#64748b" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sname}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#dc2626" }}>未対応 {store.pending ?? 0}件</span>
                  {store.inspectionDate && <span style={{ fontSize: 11, color: "#94a3b8" }}>{store.inspectionDate}</span>}
                  {store.userName && <span style={{ fontSize: 11, color: "#94a3b8" }}>{store.userName}</span>}
                </div>
              </div>
              <ChevronRight size={18} color="#cbd5e1" />
            </button>
          );
        })
      )}
    </div>
  );
}

/* ========================= Main ========================= */
export default function NgPage() {
  const { session, loading } = useSession();
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string } | null>(null);

  if (loading) return null;

  const role = String(session?.role ?? "");
  const isAdmin = role === "admin";
  const isStore = role === "manager" || role === "store";
  const storeId = String((session as Record<string, unknown>)?.storeId ?? (session as Record<string, unknown>)?.assignedStoreId ?? "");

  // 店舗ユーザー → 自店舗の是正画面
  if (isStore && storeId) {
    return <StoreNgView storeName={session?.name ?? "自店舗"} storeId={storeId} isAdmin={false} />;
  }

  // admin で店舗選択済み → 店舗の是正画面
  if (isAdmin && selectedStore) {
    return <StoreNgView storeName={selectedStore.name} storeId={selectedStore.id} isAdmin={true} onBack={() => setSelectedStore(null)} />;
  }

  // admin → 一覧
  return <AdminNgDashboard onSelect={setSelectedStore} />;
}
