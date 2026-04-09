"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Camera,
  Trash2,
  Clock,
  CheckCircle,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  ImageOff,
  X,
} from "lucide-react";
import styles from "./NgPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

/* =========================================
   Types
   ========================================= */
type UploadedPhoto = {
  id?: string;
  key?: string;
  url?: string;
  contentType?: string;
};

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
  correctionStatus: string;
  resultId?: string;
  storeId?: string;
  storeName?: string;
  afterPhotoFile?: File;
  afterPhotoPreviewUrl?: string;
};

type NgStore = {
  id?: string;
  storeId?: string;
  PK?: string;
  pk?: string;
  resultPk?: string;
  storePk?: string;
  resultId?: string;
  name?: string;
  storeName?: string;
  pending?: number;
  inspectionDate?: string;
  userName?: string;
};

type BatchUpdateResult = {
  pk: string;
  sk: string;
  ok: boolean;
  updatedCount?: number;
  error?: string;
};

/* =========================================
   Helpers
   ========================================= */
function stripStorePrefix(value?: string) {
  if (!value) return undefined;
  return String(value).replace(/^STORE#/, "").trim() || undefined;
}

function resolveStoreId(store: NgStore): string | undefined {
  return (
    stripStorePrefix(store.storeId) ||
    stripStorePrefix(store.id) ||
    stripStorePrefix(store.PK) ||
    stripStorePrefix(store.pk) ||
    stripStorePrefix(store.resultPk) ||
    stripStorePrefix(store.storePk)
  );
}

function resolveStoreName(store: NgStore): string {
  return store.name || store.storeName || "店舗";
}

function normalizeNgStoresPayload(json: any): NgStore[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.stores)) return json.stores;
  return [];
}

function normalizeImageUrl(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = normalizeImageUrl(entry);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && obj.url.trim()) return obj.url.trim();
    if (typeof obj.previewUrl === "string" && obj.previewUrl.trim()) return obj.previewUrl.trim();
    if (typeof obj.src === "string" && obj.src.trim()) return obj.src.trim();
    if (typeof obj.key === "string" && obj.key.trim()) return obj.key.trim();
  }

  return "";
}

function cleanupPreviewUrl(url?: string) {
  if (!url) return;
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function isImageProbablyDisplayable(url?: string) {
  if (!url) return false;
  if (url.startsWith("blob:")) return true;
  if (url.startsWith("data:image/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("/")) return true;
  return false;
}

/* =========================================
   API helpers
   ========================================= */
async function uploadAfterPhoto(target: NgIssue): Promise<UploadedPhoto[]> {
  if (!target.afterPhotoFile) return [];

  const form = new FormData();
  form.append("file", target.afterPhotoFile);
  form.append("pk", target.resultPk);
  form.append("sk", target.resultSk);
  form.append("itemId", target.id);
  form.append("sectionIndex", String(target.sectionIndex));

  const res = await fetch("/api/check/results/upload-after-photo", {
    method: "POST",
    body: form,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "After画像アップロード失敗");
  }

  return json?.photo ? [json.photo] : [];
}

async function patchSingleIssue(target: NgIssue) {
  const afterPhotos = await uploadAfterPhoto(target);

  const res = await fetch("/api/check/results/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pk: target.resultPk,
      sk: target.resultSk,
      sectionIndex: target.sectionIndex,
      itemIndex: target.id,
      correction: target.comment,
      status: "done",
      afterPhotos,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "更新失敗");
  }
}

async function patchBatchIssues(targets: NgIssue[]) {
  const updates = [];

  for (const target of targets) {
    const afterPhotos = await uploadAfterPhoto(target);

    updates.push({
      pk: target.resultPk,
      sk: target.resultSk,
      sectionIndex: target.sectionIndex,
      itemIndex: target.id,
      correction: target.comment,
      status: "done",
      afterPhotos,
    });
  }

  const res = await fetch("/api/check/results/update-batch", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "一括更新失敗");
  }

  return json as {
    ok: boolean;
    successGroups: number;
    failedGroups: number;
    results: BatchUpdateResult[];
  };
}

/* =========================================
   Image component
   ========================================= */
function SafeImage({
  src,
  alt,
  className,
  style,
  onClick,
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const validSrc = isImageProbablyDisplayable(src) ? src : "";

  if (!validSrc || failed) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          color: "#94a3b8",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <ImageOff size={24} />
        <span style={{ fontSize: "12px" }}>画像なし</span>
      </div>
    );
  }

  return (
    <img
      src={validSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
      onClick={onClick}
    />
  );
}

/* =========================================
   1. Store Detail View
   ========================================= */
function StoreNgView({
  storeName,
  storeId,
  onBack,
}: {
  storeName: string;
  storeId: string;
  onBack?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [issues, setIssues] = useState<NgIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!storeId || storeId === "undefined" || storeId === "null") {
        console.error("❌ storeId不正:", storeId);
        setIssues([]);
        setError("店舗IDが取得できませんでした。");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const cleanId = String(storeId).replace(/^STORE#/, "");

        const res = await fetch(
          `/api/check/results/ng-list?storeId=${encodeURIComponent(cleanId)}&t=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error(`エラー: ${res.status}`);
        }

        const json = await res.json();

        const rawItems = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        const normalizedItems: NgIssue[] = rawItems.map((item: any) => ({
          id: String(item.id || ""),
          sectionIndex: Number(item.sectionIndex ?? 0),
          category: String(item.category || "カテゴリ不明"),
          question: String(item.question || ""),
          inspectorNote: String(item.inspectorNote || ""),
          deadline: String(item.deadline || "期限なし"),
          beforePhoto: normalizeImageUrl(
            item.beforePhoto || item.beforePhotos || item.photos || ""
          ),
          comment: String(item.comment || ""),
          isSubmitting: false,
          resultPk: String(item.resultPk || ""),
          resultSk: String(item.resultSk || ""),
          correctionStatus: String(item.correctionStatus || "pending"),
          resultId: item.resultId ? String(item.resultId) : undefined,
          storeId: item.storeId ? String(item.storeId) : undefined,
          storeName: item.storeName ? String(item.storeName) : undefined,
          afterPhotoFile: undefined,
          afterPhotoPreviewUrl: undefined,
        }));

        setIssues(normalizedItems);
      } catch (err) {
        console.error("データ取得失敗:", err);
        setError("データの読み込みに失敗しました。");
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      setIssues((prev) => {
        prev.forEach((issue) => cleanupPreviewUrl(issue.afterPhotoPreviewUrl));
        return prev;
      });
    };
  }, [storeId]);

  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewImage(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    issueId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        cleanupPreviewUrl(iss.afterPhotoPreviewUrl);
        return {
          ...iss,
          afterPhotoFile: file,
          afterPhotoPreviewUrl: previewUrl,
        };
      })
    );

    e.target.value = "";
  };

  const removeAfterPhoto = (issueId: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        cleanupPreviewUrl(iss.afterPhotoPreviewUrl);
        return {
          ...iss,
          afterPhotoFile: undefined,
          afterPhotoPreviewUrl: undefined,
        };
      })
    );
  };

  const handleSingleSubmit = async (issueId: string) => {
    const target = issues.find((iss) => iss.id === issueId);
    if (!target) return;

    setIssues((prev) =>
      prev.map((iss) =>
        iss.id === issueId ? { ...iss, isSubmitting: true } : iss
      )
    );

    try {
      await patchSingleIssue(target);

      alert("報告を送信しました");

      setIssues((prev) => {
        const targetIssue = prev.find((iss) => iss.id === issueId);
        if (targetIssue?.afterPhotoPreviewUrl) {
          cleanupPreviewUrl(targetIssue.afterPhotoPreviewUrl);
        }
        return prev.filter((iss) => iss.id !== issueId);
      });
    } catch (err) {
      console.error("送信失敗:", err);
      alert("送信に失敗しました");
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId ? { ...iss, isSubmitting: false } : iss
        )
      );
    }
  };

  const handleBulkSubmit = async () => {
    const targets = issues.filter(
      (iss) =>
        !iss.isSubmitting &&
        iss.correctionStatus !== "approved" &&
        String(iss.comment || "").trim() !== ""
    );

    if (targets.length === 0) {
      alert("送信対象がありません。改善対策コメントを入力してください。");
      return;
    }

    const ok = window.confirm(
      `${targets.length}件の改善報告をまとめて送信します。よろしいですか？`
    );
    if (!ok) return;

    setIsBulkSubmitting(true);
    setIssues((prev) =>
      prev.map((iss) =>
        targets.some(
          (t) =>
            t.id === iss.id &&
            t.resultPk === iss.resultPk &&
            t.resultSk === iss.resultSk
        )
          ? { ...iss, isSubmitting: true }
          : iss
      )
    );

    try {
      const json = await patchBatchIssues(targets);

      const failedGroups = (json.results || []).filter((r) => !r.ok);
      const failedGroupKeys = new Set(
        failedGroups.map((r) => `${r.pk}__${r.sk}`)
      );

      const succeededTargets = targets.filter(
        (t) => !failedGroupKeys.has(`${t.resultPk}__${t.resultSk}`)
      );

      setIssues((prev) => {
        prev.forEach((iss) => {
          const matched = succeededTargets.some(
            (t) =>
              t.id === iss.id &&
              t.resultPk === iss.resultPk &&
              t.resultSk === iss.resultSk
          );
          if (matched && iss.afterPhotoPreviewUrl) {
            cleanupPreviewUrl(iss.afterPhotoPreviewUrl);
          }
        });

        return prev
          .filter(
            (iss) =>
              !succeededTargets.some(
                (t) =>
                  t.id === iss.id &&
                  t.resultPk === iss.resultPk &&
                  t.resultSk === iss.resultSk
              )
          )
          .map((iss) => {
            const groupFailed = failedGroupKeys.has(
              `${iss.resultPk}__${iss.resultSk}`
            );
            return groupFailed ? { ...iss, isSubmitting: false } : iss;
          });
      });

      const successCount = succeededTargets.length;
      const failCount = targets.length - successCount;

      if (failCount === 0) {
        alert(`${successCount}件の改善報告を送信しました。`);
      } else {
        alert(`${successCount}件送信しました。${failCount}件は失敗しました。`);
      }
    } catch (err) {
      console.error("一括送信失敗:", err);
      alert("一括送信に失敗しました");
      setIssues((prev) =>
        prev.map((iss) =>
          targets.some(
            (t) =>
              t.id === iss.id &&
              t.resultPk === iss.resultPk &&
              t.resultSk === iss.resultSk
          )
            ? { ...iss, isSubmitting: false }
            : iss
        )
      );
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const bulkTargetCount = issues.filter(
    (iss) =>
      iss.correctionStatus !== "approved" &&
      String(iss.comment || "").trim() !== ""
  ).length;

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: "center", padding: "100px" }}
      >
        <Loader2 className="animate-spin" size={32} />
        <p>取得中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: "center", padding: "100px" }}
      >
        <AlertCircle color="red" size={48} style={{ margin: "0 auto" }} />
        <p>{error}</p>
        {onBack ? (
          <button onClick={onBack} className="qsc-btn qsc-btn-secondary">
            戻る
          </button>
        ) : (
          <button onClick={() => window.location.reload()}>再試行</button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div style={{ marginBottom: "20px" }}>
          {onBack ? (
            <button onClick={onBack} className="qsc-btn qsc-btn-secondary">
              <ChevronLeft size={16} /> 戻る
            </button>
          ) : (
            <Link href="/" className="qsc-btn qsc-btn-secondary">
              <ChevronLeft size={16} /> ホーム
            </Link>
          )}
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>{storeName}</h1>
          <p className={styles.sub}>未対応の指摘事項: {issues.length}件</p>
        </div>

        {issues.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={handleBulkSubmit}
              disabled={isBulkSubmitting || bulkTargetCount === 0}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "16px",
                background:
                  isBulkSubmitting || bulkTargetCount === 0
                    ? "#cbd5e1"
                    : "#16a34a",
                color: "white",
                border: "none",
                cursor:
                  isBulkSubmitting || bulkTargetCount === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isBulkSubmitting ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Loader2 className="animate-spin" size={18} />
                  まとめて送信中...
                </span>
              ) : (
                `入力済み ${bulkTargetCount}件をまとめて改善報告`
              )}
            </button>
          </div>
        )}

        {issues.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle
              size={64}
              color="#10b981"
              strokeWidth={1}
              style={{ marginBottom: 16 }}
            />
            <p style={{ fontWeight: "bold" }}>
              現在、対応が必要な指摘はありません
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <section
              key={`${issue.resultPk}-${issue.resultSk}-${issue.id}`}
              className={styles.card}
            >
              <div className={styles.cardHead}>
                <span className={styles.category}>{issue.category}</span>
                <span className={styles.deadline}>
                  <Clock size={12} /> {issue.deadline}まで
                </span>
              </div>

              <div
                style={{
                  margin: "12px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1e293b",
                }}
              >
                {issue.question}
              </div>

              <div
                style={{
                  background: "#fff1f2",
                  padding: "12px",
                  borderRadius: "8px",
                  borderLeft: "4px solid #ef4444",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#ef4444",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  店舗への指摘内容:
                </div>
                <div style={{ fontSize: "14px", color: "#7f1d1d" }}>
                  {issue.inspectorNote || "（コメントなし）"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    指摘時の写真
                  </p>
                  <SafeImage
                    src={issue.beforePhoto}
                    alt="Before"
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      cursor: issue.beforePhoto ? "zoom-in" : "default",
                    }}
                    onClick={
                      issue.beforePhoto
                        ? () =>
                            setPreviewImage({
                              src: issue.beforePhoto,
                              alt: `${issue.question} - Before`,
                            })
                        : undefined
                    }
                  />
                </div>

                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    改善後の写真 (After)
                  </p>

                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      height: "140px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: "#f8fafc",
                    }}
                  >
                    {issue.afterPhotoPreviewUrl ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <SafeImage
                          src={issue.afterPhotoPreviewUrl}
                          alt="After"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            cursor: "zoom-in",
                          }}
                          onClick={() =>
                            setPreviewImage({
                              src: issue.afterPhotoPreviewUrl!,
                              alt: `${issue.question} - After`,
                            })
                          }
                        />
                        <button
                          onClick={() => removeAfterPhoto(issue.id)}
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            background: "rgba(0,0,0,0.55)",
                            border: "none",
                            borderRadius: "999px",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveIssueId(issue.id);
                          fileInputRef.current?.click();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Camera size={32} color="#94a3b8" />
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          撮影する
                        </span>
                      </button>
                    )}
                  </div>

                  {issue.afterPhotoFile && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {issue.afterPhotoFile.name}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  実施した改善対策:
                </p>
                <textarea
                  className={styles.commentArea}
                  placeholder="例：清掃を実施しました。備品を交換しました。"
                  value={issue.comment}
                  onChange={(e) =>
                    setIssues((prev) =>
                      prev.map((iss) =>
                        iss.id === issue.id
                          ? { ...iss, comment: e.target.value }
                          : iss
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "14px",
                  }}
                />
              </div>

              <button
                className={styles.submitSingleBtn}
                disabled={issue.isSubmitting || !issue.comment || isBulkSubmitting}
                onClick={() => handleSingleSubmit(issue.id)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "14px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  fontSize: "16px",
                  background:
                    issue.isSubmitting || !issue.comment || isBulkSubmitting
                      ? "#cbd5e1"
                      : "#2563eb",
                  color: "white",
                  border: "none",
                  cursor:
                    issue.isSubmitting || !issue.comment || isBulkSubmitting
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {issue.isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "改善報告を送信する"
                )}
              </button>
            </section>
          ))
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => activeIssueId && handlePhotoSelect(e, activeIssueId)}
      />

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={() => setPreviewImage(null)}
              aria-label="閉じる"
              style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                width: "40px",
                height: "40px",
                borderRadius: "999px",
                border: "none",
                background: "rgba(255,255,255,0.95)",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                zIndex: 2,
              }}
            >
              <X size={20} />
            </button>

            <img
              src={previewImage.src}
              alt={previewImage.alt}
              style={{
                maxWidth: "80vw",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}
            />

            <div
              style={{
                color: "white",
                fontSize: "12px",
                opacity: 0.85,
                textAlign: "center",
              }}
            >
              画像外タップ or × で閉じる
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================
   2. Admin Dashboard
   ========================================= */
function AdminNgDashboard({
  onSelect,
}: {
  onSelect: (store: { id: string; name: string }) => void;
}) {
  const [stores, setStores] = useState<NgStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch("/api/check/results/ng-stores", {
          cache: "no-store",
        });
        const json = await res.json();
        const normalizedStores = normalizeNgStoresPayload(json);
        setStores(normalizedStores);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadStores();
  }, []);

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: "center", padding: "100px" }}
      >
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>是正状況一覧</h1>
        <p className={styles.sub}>指摘が残っている店舗を選択してください</p>
      </div>

      {stores.length === 0 ? (
        <div className={styles.empty}>現在、是正待ちの店舗はありません</div>
      ) : (
        stores.map((store, i) => (
          <button
            key={
              store.id ||
              store.storeId ||
              store.PK ||
              store.pk ||
              store.resultPk ||
              store.storePk ||
              store.resultId ||
              i
            }
            onClick={() => {
              const resolvedId = resolveStoreId(store);
              const resolvedName = resolveStoreName(store);

              if (!resolvedId) {
                alert("storeIdが取れていません");
                return;
              }

              onSelect({
                id: resolvedId,
                name: resolvedName,
              });
            }}
            className={styles.card}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
              marginBottom: "12px",
              textAlign: "left",
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "12px",
                  borderRadius: "12px",
                }}
              >
                <Building2 color="#64748b" />
              </div>
              <div>
                <div style={{ fontWeight: "800", fontSize: "18px" }}>
                  {resolveStoreName(store)}
                </div>
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginTop: "4px",
                  }}
                >
                  未対応: {store.pending ?? 0}件
                </div>
                {(store.inspectionDate || store.userName) && (
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {store.inspectionDate || ""}
                    {store.inspectionDate && store.userName ? " / " : ""}
                    {store.userName || ""}
                  </div>
                )}
              </div>
            </div>
            <ChevronRight color="#cbd5e1" />
          </button>
        ))
      )}
    </div>
  );
}

/* =========================================
   MAIN ENTRY
   ========================================= */
export default function NgPage() {
  const { session, loading } = useSession();
  const [selectedStore, setSelectedStore] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (loading) return null;

  const role = session?.role || "viewer";
  const storeIdFromSession = session?.assignedStoreId || (session as any)?.storeId;

  if ((role as any) === "manager" && storeIdFromSession) {
    return (
      <StoreNgView
        storeName={session?.name || "自店舗"}
        storeId={String(storeIdFromSession)}
      />
    );
  }

  if (selectedStore) {
    return (
      <StoreNgView
        storeName={selectedStore.name}
        storeId={selectedStore.id}
        onBack={() => setSelectedStore(null)}
      />
    );
  }

  return <AdminNgDashboard onSelect={setSelectedStore} />;
}