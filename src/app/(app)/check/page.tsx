"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Store,
  CheckCircle2,
  PauseCircle,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Search,
  Loader2,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* =========================
   Types
   ========================= */
type StoreStatus = "new" | "draft" | "done";

type StoreRow = {
  companyId: string;
  companyName: string;
  bizId: string;
  bizName: string;
  brandId: string;
  brandName: string;
  areaId: string;
  areaName: string;
  storeId: string;
  storeName: string;
  status: StoreStatus;
};

type ResultHistoryItem = {
  pk: string;
  sk: string;
  resultId: string;
  storeId: string;
  storeName: string;
  submittedAt: string;
  status: string;
  userName: string; // [追加]
};

/* =========================
   Helpers
   ========================= */
function uniqBy<T>(arr: T[], keyFn: (v: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of arr) {
    const k = keyFn(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

function todayParts() {
  const d = new Date();
  return {
    mmdd: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`,
    yyyy: d.getFullYear(),
    dow: ["日", "月", "火", "水", "木", "金", "土"][d.getDay()],
    quarter: Math.floor(d.getMonth() / 3) + 1,
  };
}

// [修正] submittedAt は string (非 optional) なので引数の型を合わせる
function formatResultDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function normalizeStoreId(id?: string) {
  return String(id ?? "").replace(/^STORE#/, "");
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    done: "完了",
    draft: "途中保存",
    pending: "途中保存",
  };
  return map[status] ?? status;
}

/* =========================
   Main Component
   ========================= */
export default function CheckPage() {
  const router = useRouter();
  const { mmdd, yyyy, dow, quarter } = useMemo(() => todayParts(), []);

  const [storeMaster, setStoreMaster] = useState<StoreRow[]>([]);
  const [doneStoreIds, setDoneStoreIds] = useState<string[]>([]);
  const [draftStoreIds, setDraftStoreIds] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const [companyId, setCompanyId] = useState("");
  const [bizIds, setBizIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<StoreStatus[]>([]);
  const [storeQuery, setStoreQuery] = useState("");

  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resultHistory, setResultHistory] = useState<ResultHistoryItem[]>([]);

  // [修正] localStorage の draft を読み込むロジックを関数化して再利用可能にする
  const loadDraftStoreIds = useCallback(() => {
    if (typeof window === "undefined") return;
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith("qsc_draft_"))
      .map((k) => k.replace("qsc_draft_", ""));
    setDraftStoreIds(keys);
  }, []);

  // 初期データ取得
  useEffect(() => {
    async function init() {
      try {
        setLoadingStores(true);

        const [resM, resD] = await Promise.all([
          fetch("/api/check/stores", { cache: "no-store" }),
          fetch("/api/check/results/summary", { cache: "no-store" }),
        ]);

        if (!resM.ok) throw new Error(`stores API error: ${resM.status}`);
        if (!resD.ok) throw new Error(`summary API error: ${resD.status}`);

        const m = await resM.json();
        const d = await resD.json();

        const stores = Array.isArray(m?.items) ? m.items : Array.isArray(m) ? m : [];
        setStoreMaster(stores);

        const normalizedDoneIds = (Array.isArray(d?.doneStoreIds) ? d.doneStoreIds : [])
          .map((id: string) => String(id).replace(/^STORE#/, ""))
          .filter(Boolean);
        setDoneStoreIds(normalizedDoneIds);
      } catch (error) {
        console.error(error);
        setStoreMaster([]);
        setDoneStoreIds([]);
      } finally {
        setLoadingStores(false);
      }
    }

    init();
  }, []);

  // [修正] 初回マウント時の localStorage 読み込み
  useEffect(() => {
    loadDraftStoreIds();
  }, [loadDraftStoreIds]);

  // [修正] ページにフォーカスが戻ったとき（他画面でドラフト保存後など）に再読み込み
  useEffect(() => {
    window.addEventListener("focus", loadDraftStoreIds);
    return () => window.removeEventListener("focus", loadDraftStoreIds);
  }, [loadDraftStoreIds]);

  // [修正] useCallback でメモ化し、依存配列を明示する
  const getDynamicStatus = useCallback(
    (id?: string): StoreStatus => {
      const cleanId = String(id ?? "").replace(/^STORE#/, "");
      if (!cleanId) return "new";
      if (doneStoreIds.includes(cleanId)) return "done";
      if (draftStoreIds.includes(cleanId)) return "draft";
      return "new";
    },
    [doneStoreIds, draftStoreIds]
  );

  const companies = useMemo(() => {
    return uniqBy(storeMaster, (r) => r.companyId).map((r) => ({
      id: r.companyId,
      name: r.companyName,
    }));
  }, [storeMaster]);

  const companyScopedRows = useMemo(() => {
    return storeMaster.filter((r) => !companyId || r.companyId === companyId);
  }, [storeMaster, companyId]);

  const bizOptions = useMemo(() => {
    return uniqBy(companyScopedRows, (r) => r.bizId).map((r) => ({
      bizId: r.bizId,
      bizName: r.bizName,
    }));
  }, [companyScopedRows]);

  const bizScopedRows = useMemo(() => {
    return companyScopedRows.filter((r) => {
      if (bizIds.length === 0) return true;
      return bizIds.includes(r.bizId);
    });
  }, [companyScopedRows, bizIds]);

  const brandOptions = useMemo(() => {
    return uniqBy(bizScopedRows, (r) => r.brandId).map((r) => ({
      brandId: r.brandId,
      brandName: r.brandName,
    }));
  }, [bizScopedRows]);

  const brandScopedRows = useMemo(() => {
    return bizScopedRows.filter((r) => {
      if (brandIds.length === 0) return true;
      return brandIds.includes(r.brandId);
    });
  }, [bizScopedRows, brandIds]);

  const areaOptions = useMemo(() => {
    return uniqBy(brandScopedRows, (r) => r.areaId).map((r) => ({
      areaId: r.areaId,
      areaName: r.areaName,
    }));
  }, [brandScopedRows]);

  const storeList = useMemo(() => {
    if (!Array.isArray(storeMaster)) return [];

    const k = storeQuery.trim().toLowerCase();

    return storeMaster
      .map((s) => {
        const normalizedStoreId = String(s.storeId ?? "").replace(/^STORE#/, "");
        return {
          ...s,
          storeId: normalizedStoreId,
          status: getDynamicStatus(normalizedStoreId),
        };
      })
      .filter((r) => {
        if (statusFilters.length > 0 && !statusFilters.includes(r.status)) return false;
        if (companyId && r.companyId !== companyId) return false;
        if (bizIds.length > 0 && !bizIds.includes(r.bizId)) return false;
        if (brandIds.length > 0 && !brandIds.includes(r.brandId)) return false;
        if (areaIds.length > 0 && !areaIds.includes(r.areaId)) return false;

        if (k) {
          const target = `${r.storeName} ${r.storeId} ${r.brandName} ${r.areaName}`.toLowerCase();
          if (!target.includes(k)) return false;
        }

        return true;
      })
      .sort((a, b) => (a.storeName || "").localeCompare(b.storeName || "", "ja"));
  }, [
    storeMaster,
    getDynamicStatus, // [修正] useCallback化したので依存配列に追加（doneStoreIds/draftStoreIdsの変化を捕捉）
    companyId,
    bizIds,
    brandIds,
    areaIds,
    statusFilters,
    storeQuery,
  ]);

  const selectedStore = useMemo(() => {
    return storeList.find((s) => s.storeId === selectedStoreId) || null;
  }, [selectedStoreId, storeList]);

  // [修正] 不使用だった第2引数 `_list` を削除
  const toggleMultiValue = (
    value: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleStatus = (value: StoreStatus) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const resetFilters = () => {
    setCompanyId("");
    setBizIds([]);
    setBrandIds([]);
    setAreaIds([]);
    setStatusFilters([]);
    setStoreQuery("");
  };

  // [修正] モーダルを閉じるときに選択状態もリセット
  const closeDoneModal = () => {
    setIsDoneModalOpen(false);
    setSelectedStoreId("");
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedStoreId("");
  };

  async function openHistoryModal(storeId: string) {
    // [修正] 先にモーダルを開いてローディング表示→フリーズ感を解消
    setLoadingHistory(true);
    setResultHistory([]);
    setIsHistoryModalOpen(true);

    try {
      const res = await fetch(
        `/api/check/results/history?storeId=${encodeURIComponent(storeId)}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error(`history API error: ${res.status}`);

      const data = await res.json();
      setResultHistory(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      setResultHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  const onRunAction = async (mode: "new" | "edit") => {
    if (!selectedStore) return;

    if (mode === "new") {
      setIsDoneModalOpen(false);

      if (typeof window !== "undefined") {
        localStorage.removeItem(`qsc_draft_${selectedStore.storeId}`);
        setDraftStoreIds((prev) => prev.filter((id) => id !== selectedStore.storeId));
      }

      router.push(`/check/run?storeId=${selectedStore.storeId}&mode=new`);
      return;
    }

    setIsDoneModalOpen(false);
    await openHistoryModal(selectedStore.storeId);
  };

  function onSelectHistory(item: ResultHistoryItem) {
    setIsHistoryModalOpen(false);
    router.push(
      `/check/run?storeId=${encodeURIComponent(
        normalizeStoreId(item.storeId)
      )}&mode=edit&resultId=${encodeURIComponent(item.resultId)}`
    );
  }

  const activeFilterCount =
    (companyId ? 1 : 0) +
    bizIds.length +
    brandIds.length +
    areaIds.length +
    statusFilters.length +
    (storeQuery.trim() ? 1 : 0);

  return (
    <div
      style={{
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      {/* Date Card */}
      <div style={{ display: "flex", gap: "12px", padding: "20px 20px 10px" }}>
        <div
          style={{
            flex: 1,
            background: "#fff",
            padding: "18px",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "17px",
              fontWeight: 900,
              color: "#1e293b",
            }}
          >
            <CalendarDays size={18} color="#6366f1" /> {mmdd}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#94a3b8",
              marginTop: "4px",
            }}
          >
            {yyyy} • {dow} / Q{quarter}
          </div>
        </div>
      </div>

      {/* Header */}
      <header style={{ padding: "10px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "#64748b",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ChevronLeft size={18} /> HOME
          </Link>
          <span
            style={{
              background: "#f1f5f9",
              padding: "5px 12px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 950,
              color: "#475569",
            }}
          >
            AUDIT v2
          </span>
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: 950,
            color: "#1e293b",
            marginTop: "16px",
            letterSpacing: "-0.04em",
          }}
        >
          店舗を選択
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: selectedStore ? "#10b981" : "#e2e8f0",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: selectedStore ? "#1e293b" : "#94a3b8",
            }}
          >
            {selectedStore ? `選択中: ${selectedStore.storeName}` : "対象をタップしてください"}
          </span>
        </div>
      </header>

      {/* Filter Summary Card */}
      <section style={{ padding: "0 20px 20px" }}>
        <div
          style={{
            background: "#1e293b",
            borderRadius: "24px",
            padding: "20px",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 20px 25px -5px rgba(30, 41, 59, 0.2)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 900,
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              Master List
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "2px" }}>
              {storeList.length}店舗を表示中
            </div>
            {activeFilterCount > 0 && (
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  marginTop: "6px",
                }}
              >
                フィルター適用中: {activeFilterCount}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: "14px",
              fontSize: "13px",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <SlidersHorizontal size={16} /> 条件
          </button>
        </div>
      </section>

      {/* Search Box */}
      <section style={{ padding: "0 20px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "56px",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: "0 16px",
          }}
        >
          <Search size={18} color="#94a3b8" />
          <input
            value={storeQuery}
            onChange={(e) => setStoreQuery(e.target.value)}
            placeholder="店舗名で検索"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "15px",
              fontWeight: 700,
              color: "#1e293b",
            }}
          />
          {!!storeQuery && (
            <button
              onClick={() => setStoreQuery("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              クリア
            </button>
          )}
        </div>
      </section>

      {/* Store List */}
      <section style={{ padding: "0 20px 140px" }}>
        {loadingStores ? (
          <div style={{ textAlign: "center", padding: "40px", fontWeight: 800, color: "#cbd5e1" }}>
            Loading Master...
          </div>
        ) : storeList.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              padding: "32px 20px",
              textAlign: "center",
              color: "#94a3b8",
              fontWeight: 800,
            }}
          >
            条件に一致する店舗がありません
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {storeList.map((s) => (
              <button
                key={s.storeId}
                onClick={() => {
                  setSelectedStoreId(s.storeId);
                  if (s.status === "done") {
                    setIsDoneModalOpen(true);
                  }
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "20px",
                  background: "#fff",
                  borderRadius: "24px",
                  border: "1px solid",
                  borderColor: selectedStoreId === s.storeId ? "#1e293b" : "#e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "0.2s",
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "16px",
                      background:
                        s.status === "done"
                          ? "#d1fae5"
                          : s.status === "draft"
                          ? "#ffedd5"
                          : "#f8fafc",
                      display: "grid",
                      placeItems: "center",
                      color:
                        s.status === "done"
                          ? "#10b981"
                          : s.status === "draft"
                          ? "#f59e0b"
                          : "#cbd5e1",
                    }}
                  >
                    {s.status === "done" ? (
                      <CheckCircle2 size={26} />
                    ) : s.status === "draft" ? (
                      <PauseCircle size={26} />
                    ) : (
                      <Store size={26} />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "17px", fontWeight: 900, color: "#1e293b" }}>
                      {s.storeName}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#94a3b8",
                        marginTop: "2px",
                      }}
                    >
                      {s.companyName} • {s.bizName} • {s.brandName} • {s.areaName}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {s.status === "done" && (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: "#d1fae5",
                        color: "#059669",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      完了
                    </span>
                  )}
                  {s.status === "draft" && (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: "#ffedd5",
                        color: "#d97706",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      途中
                    </span>
                  )}
                  <ChevronRight size={18} color="#cbd5e1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Action Modal */}
      {isDoneModalOpen && selectedStore && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={closeDoneModal}
        >
          <div
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: "32px 32px 0 0",
              padding: "32px 24px 48px",
              animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "22px", fontWeight: 950, color: "#1e293b" }}>
                {selectedStore.storeName}
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#64748b", marginTop: "8px" }}>
                完了済みの店舗です。アクションを選択
              </p>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <button
                onClick={() => onRunAction("edit")}
                disabled={loadingHistory}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "22px",
                  borderRadius: "22px",
                  border: "1px solid #e2e8f0",
                  background: loadingHistory ? "#f8fafc" : "#fff",
                  textAlign: "left",
                  opacity: loadingHistory ? 0.7 : 1,
                  transition: "0.15s",
                }}
              >
                {loadingHistory
                  ? <Loader2 size={24} color="#94a3b8" style={{ animation: "spin 1s linear infinite" }} />
                  : <RotateCcw size={24} color="#6366f1" />
                }
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 900 }}>
                    {loadingHistory ? "履歴を読み込み中..." : "前回の内容を修正"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>
                    点検履歴から修正対象を選択
                  </div>
                </div>
              </button>

              <button
                onClick={() => onRunAction("new")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "22px",
                  borderRadius: "22px",
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  textAlign: "left",
                }}
              >
                <Sparkles size={24} color="#f59e0b" />
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 900 }}>新しく開始</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>
                    履歴を引き継がず新規作成
                  </div>
                </div>
              </button>
            </div>

            {/* [修正] closeDoneModal で選択状態もリセット */}
            <button
              onClick={closeDoneModal}
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background: "#f1f5f9",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedStore && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(10px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={closeHistoryModal}
        >
          <div
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: "32px 32px 0 0",
              padding: "32px 24px 48px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "22px", fontWeight: 950, color: "#1e293b" }}>
                {selectedStore.storeName}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#64748b",
                  marginTop: "8px",
                }}
              >
                修正する点検日を選択してください
              </p>
            </div>

            {loadingHistory ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#94a3b8",
                  fontWeight: 800,
                }}
              >
                履歴を読み込み中...
              </div>
            ) : resultHistory.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#94a3b8",
                  fontWeight: 800,
                  background: "#f8fafc",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                }}
              >
                修正できる過去結果がありません
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {resultHistory.map((item) => {
                  const isDone = item.status === "done";
                  return (
                    <button
                      key={item.resultId}
                      onClick={() => onSelectHistory(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "18px 20px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* ステータスアイコン */}
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            background: isDone ? "#d1fae5" : "#ffedd5",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isDone
                            ? <CheckCircle2 size={20} color="#10b981" />
                            : <PauseCircle size={20} color="#f59e0b" />
                          }
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ fontSize: "15px", fontWeight: 900, color: "#1e293b" }}>
                              {formatResultDate(item.submittedAt)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 900,
                                background: isDone ? "#d1fae5" : "#ffedd5",
                                color: isDone ? "#059669" : "#d97706",
                              }}
                            >
                              {formatStatus(item.status)}
                            </span>
                            {item.userName && (
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>
                                {item.userName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#cbd5e1" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* [修正] closeHistoryModal で選択状態もリセット */}
            <button
              onClick={closeHistoryModal}
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background: "#f1f5f9",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Filter Sheet */}
      {isFilterOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.4)" }}
            onClick={() => setIsFilterOpen(false)}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#fff",
              borderRadius: "32px 32px 0 0",
              padding: "24px 24px 40px",
              maxHeight: "84vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: 950 }}>絞り込み条件</div>
              <button
                onClick={() => setIsFilterOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  padding: "10px",
                  borderRadius: "14px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "28px" }}>
              {/* 店舗検索 */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  店舗検索
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    height: "56px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    padding: "0 16px",
                  }}
                >
                  <Search size={18} color="#94a3b8" />
                  <input
                    value={storeQuery}
                    onChange={(e) => setStoreQuery(e.target.value)}
                    placeholder="店舗名・店舗ID・ブランド・エリアで検索"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  />
                </div>
              </div>

              {/* ステータス */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  ステータス
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {[
                    { value: "new" as StoreStatus, label: "未着手" },
                    { value: "draft" as StoreStatus, label: "途中保存" },
                    { value: "done" as StoreStatus, label: "完了" },
                  ].map((o) => (
                    <button
                      key={o.value}
                      onClick={() => toggleStatus(o.value)}
                      style={{
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: statusFilters.includes(o.value) ? "#1e293b" : "#e2e8f0",
                        background: statusFilters.includes(o.value) ? "#1e293b" : "#fff",
                        color: statusFilters.includes(o.value) ? "#fff" : "#64748b",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 企業 */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  企業
                </label>
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setBizIds([]);
                    setBrandIds([]);
                    setAreaIds([]);
                  }}
                  style={{
                    width: "100%",
                    height: "56px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    padding: "0 16px",
                    fontSize: "16px",
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  <option value="">すべて表示</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 業態 */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  業態
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {bizOptions.map((o) => (
                    <button
                      key={o.bizId}
                      // [修正] 第2引数 (_list) を削除した toggleMultiValue に合わせる
                      onClick={() => toggleMultiValue(o.bizId, setBizIds)}
                      style={{
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: bizIds.includes(o.bizId) ? "#1e293b" : "#e2e8f0",
                        background: bizIds.includes(o.bizId) ? "#1e293b" : "#fff",
                        color: bizIds.includes(o.bizId) ? "#fff" : "#64748b",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {o.bizName}
                    </button>
                  ))}
                </div>
              </div>

              {/* ブランド */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  ブランド
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {brandOptions.map((o) => (
                    <button
                      key={o.brandId}
                      onClick={() => toggleMultiValue(o.brandId, setBrandIds)}
                      style={{
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: brandIds.includes(o.brandId) ? "#1e293b" : "#e2e8f0",
                        background: brandIds.includes(o.brandId) ? "#1e293b" : "#fff",
                        color: brandIds.includes(o.brandId) ? "#fff" : "#64748b",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {o.brandName}
                    </button>
                  ))}
                </div>
              </div>

              {/* エリア */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  エリア
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {areaOptions.map((o) => (
                    <button
                      key={o.areaId}
                      onClick={() => toggleMultiValue(o.areaId, setAreaIds)}
                      style={{
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: areaIds.includes(o.areaId) ? "#1e293b" : "#e2e8f0",
                        background: areaIds.includes(o.areaId) ? "#1e293b" : "#fff",
                        color: areaIds.includes(o.areaId) ? "#fff" : "#64748b",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {o.areaName}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={resetFilters}
                style={{
                  width: "100%",
                  height: "56px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  border: "none",
                  borderRadius: "18px",
                  fontSize: "15px",
                  fontWeight: 900,
                }}
              >
                条件をリセット
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {selectedStore && !isDoneModalOpen && !isHistoryModalOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: 0,
            right: 0,
            padding: "0 24px",
            zIndex: 900,
          }}
        >
          <button
            onClick={() =>
              onRunAction(getDynamicStatus(selectedStore.storeId) === "draft" ? "edit" : "new")
            }
            style={{
              width: "100%",
              height: "72px",
              background: "#1e293b",
              color: "#fff",
              border: "none",
              borderRadius: "24px",
              fontSize: "19px",
              fontWeight: 950,
              boxShadow: "0 15px 35px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            {getDynamicStatus(selectedStore.storeId) === "draft" ? (
              <>
                <PauseCircle size={22} color="#f59e0b" /> 再開する
              </>
            ) : (
              <>
                <Sparkles size={22} color="#f59e0b" /> 点検開始
              </>
            )}
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
