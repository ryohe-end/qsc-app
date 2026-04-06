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
} from "lucide-react";
import styles from "./NgPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

/* =========================================
   Types
   ========================================= */
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
  isSubmitting?: boolean;
  resultPk: string;
  resultSk: string;
  correctionStatus: string;
};

type NgStore = {
  id?: string;
  storeId?: string;
  PK?: string;
  name?: string;
  storeName?: string;
  pending?: number;
};

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
        console.log("StoreNgView storeId =", storeId);
        console.log("cleanId =", cleanId);

        const res = await fetch(
          `/api/check/results/ng-list?storeId=${encodeURIComponent(cleanId)}&t=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error(`エラー: ${res.status}`);
        }

        const json = await res.json();
        console.log("フロントで受信したNGデータ:", json);

        if (Array.isArray(json)) {
          setIssues(json);
        } else if (Array.isArray(json?.items)) {
          setIssues(json.items);
        } else {
          setIssues([]);
        }
      } catch (err) {
        console.error("データ取得失敗:", err);
        setError("データの読み込みに失敗しました。");
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storeId]);

  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    issueId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId ? { ...iss, afterPhoto: dataUrl } : iss
        )
      );
    };
    reader.readAsDataURL(file);
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
        }),
      });

      if (!res.ok) {
        throw new Error("更新失敗");
      }

      alert("報告を送信しました");
      setIssues((prev) => prev.filter((iss) => iss.id !== issueId));
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
                  <img
                    src={issue.beforePhoto || "/no-image.png"}
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                    alt="Before"
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
                    {issue.afterPhoto ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <img
                          src={issue.afterPhoto}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          alt="After"
                        />
                        <button
                          onClick={() =>
                            setIssues((prev) =>
                              prev.map((iss) =>
                                iss.id === issue.id
                                  ? { ...iss, afterPhoto: undefined }
                                  : iss
                              )
                            )
                          }
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            background: "rgba(0,0,0,0.5)",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px",
                            color: "white",
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
                disabled={issue.isSubmitting || !issue.comment}
                onClick={() => handleSingleSubmit(issue.id)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "14px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  fontSize: "16px",
                  background:
                    issue.isSubmitting || !issue.comment ? "#cbd5e1" : "#2563eb",
                  color: "white",
                  border: "none",
                  cursor:
                    issue.isSubmitting || !issue.comment
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
        console.log("ng-stores response =", json);
        setStores(Array.isArray(json) ? json : []);
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
            key={store.id || store.storeId || store.PK || i}
            onClick={() => {
              const resolvedId =
                store.storeId ??
                store.id ??
                (typeof store.PK === "string"
                  ? store.PK.replace(/^STORE#/, "")
                  : undefined);

              const resolvedName = store.name ?? store.storeName ?? "店舗";

              console.log("selected store raw =", store);
              console.log("resolvedId =", resolvedId);

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
                  {store.name ?? store.storeName ?? "店舗名未設定"}
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

  if (role === "manager" && storeIdFromSession) {
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