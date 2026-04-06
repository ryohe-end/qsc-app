"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  Plus,
  Pencil,
  X,
  Home,
  FileStack,
  Check,
  Trash2,
  ChevronRight,
  Mail,
  Loader2,
} from "lucide-react";

/** =========================
 * Types
 * ========================= */
type StoreStatus = "active" | "inactive" | "archived";
type FilterAssetType = "all" | "assigned" | "unassigned";
type FilterMailType = "all" | "hasMail" | "noMail";

type StoreRow = {
  storeId: string;
  clubCode: number;
  name: string;
  brandId?: string;
  brandName: string;
  businessTypeName: string;
  companyName: string;
  corpId?: string;
  corporateName: string;
  status: StoreStatus;
  assetId?: string;
  emails: string[];
  updatedAt?: string;
  version?: number;
};

type AssetRow = {
  assetId: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

const EMPTY_DRAFT: StoreRow = {
  storeId: "",
  clubCode: 0,
  name: "",
  brandId: "",
  brandName: "",
  businessTypeName: "",
  companyName: "",
  corpId: "",
  corporateName: "",
  status: "active",
  assetId: undefined,
  emails: [""],
  updatedAt: "",
  version: 0,
};

/** =========================
 * Utils
 * ========================= */
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmails(emails: string[]) {
  return emails.map((v) => v.trim()).filter(Boolean);
}

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function assertOk(res: Response, fallbackMessage: string) {
  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error((json as any)?.error || fallbackMessage);
  }
  return json;
}

/** =========================
 * UI Parts
 * ========================= */
function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "blue" | "green" | "red" | "indigo";
}) {
  const s = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  }[tone];

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: "4px 10px",
        borderRadius: 8,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.bd}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </span>
  );
}

function SelectBox({
  label,
  options,
  value,
  onChange,
  placeholder = "選択...",
  optionLabelMap,
}: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  optionLabelMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isMulti = Array.isArray(value);

  const getLabel = (v: string) => optionLabelMap?.[v] ?? v;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>
        {label}
      </div>

      <div
        onClick={() => setOpen(!open)}
        style={{
          minHeight: 48,
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          background: "#fff",
          padding: "6px 12px",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          cursor: "pointer",
          alignItems: "center",
        }}
      >
        {!isMulti && !value && (
          <span style={{ color: "#94a3b8", fontSize: 14 }}>{placeholder}</span>
        )}
        {!isMulti && !!value && (
          <span style={{ fontSize: 14, fontWeight: 700 }}>{getLabel(String(value))}</span>
        )}
        {isMulti &&
          (value.length === 0 ? (
            <span style={{ color: "#cbd5e1", fontSize: 13 }}>すべて表示</span>
          ) : (
            (value as string[]).map((v) => (
              <span
                key={v}
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {getLabel(v)}
                <X
                  size={12}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange((value as string[]).filter((x) => x !== v));
                  }}
                />
              </span>
            ))
          ))}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            zIndex: 150,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            padding: 6,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const isSel = isMulti ? (value as string[]).includes(opt) : value === opt;
            return (
              <div
                key={opt}
                onClick={() => {
                  onChange(
                    isMulti
                      ? isSel
                        ? (value as string[]).filter((x) => x !== opt)
                        : [...(value as string[]), opt]
                      : opt
                  );
                  if (!isMulti) setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: isSel ? "#f5f3ff" : "transparent",
                  color: isSel ? "#4f46e5" : "#1e293b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{getLabel(opt)}</span>
                {isSel && <Check size={14} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** =========================
 * Page
 * ========================= */
export default function AdminStoresPage() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filterBusinessType, setFilterBusinessType] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterCorporate, setFilterCorporate] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAsset, setFilterAsset] = useState<FilterAssetType>("all");
  const [filterMail, setFilterMail] = useState<FilterMailType>("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchAssetId, setBatchAssetId] = useState<string>("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<StoreRow>(EMPTY_DRAFT);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  const reloadStores = async () => {
    const res = await fetch("/api/admin/qsc/stores", {
      method: "GET",
      cache: "no-store",
    });
    const json = await assertOk(res, "店舗一覧の再取得に失敗しました");
    setRows(Array.isArray((json as any)?.items) ? (json as any).items : []);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      try {
        setRowsLoading(true);
        const res = await fetch("/api/admin/qsc/stores", {
          method: "GET",
          cache: "no-store",
        });
        const json = await assertOk(res, "店舗一覧の取得に失敗しました");
        if (!cancelled) {
          setRows(Array.isArray((json as any)?.items) ? (json as any).items : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    }

    async function loadAssets() {
      try {
        setAssetsLoading(true);
        const res = await fetch("/api/admin/qsc/assets", {
          method: "GET",
          cache: "no-store",
        });
        const json = await assertOk(res, "アセット一覧の取得に失敗しました");
        if (!cancelled) {
          setAssets(Array.isArray((json as any)?.items) ? (json as any).items : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setAssets([]);
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    }

    loadStores();
    loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  const assetLabelMap = useMemo(
    () => Object.fromEntries(assets.map((a) => [a.assetId, a.name])),
    [assets]
  );

  const brandLabelMap = useMemo(() => {
    const entries = rows
      .filter((r) => r.brandId)
      .map((r) => [String(r.brandId), r.brandName || String(r.brandId)] as const);
    return Object.fromEntries(entries);
  }, [rows]);

  const corpLabelMap = useMemo(() => {
    const entries = rows
      .filter((r) => r.corpId)
      .map((r) => [String(r.corpId), r.corporateName || String(r.corpId)] as const);
    return Object.fromEntries(entries);
  }, [rows]);

  const businessTypeOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => String(r.businessTypeName || "")).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const brandOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => String(r.brandName || "")).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const corporateOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => String(r.corporateName || "")).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const brandIdOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => String(r.brandId || "")).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "ja")
    );
  }, [rows]);

  const corpIdOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => String(r.corpId || "")).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "ja")
    );
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const emails = normalizeEmails(r.emails || []);
      const hasMail = emails.length > 0;

      const matchQ =
        !q ||
        [
          r.name,
          String(r.clubCode),
          r.brandName,
          r.corporateName,
          r.companyName,
          r.businessTypeName,
          r.status,
          ...(r.emails || []),
        ]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q.toLowerCase()));

      const matchBusinessType =
        filterBusinessType === "all" || r.businessTypeName === filterBusinessType;

      const matchBrand = filterBrand === "all" || r.brandName === filterBrand;

      const matchCorporate =
        filterCorporate === "all" || r.corporateName === filterCorporate;

      const matchStatus = filterStatus === "all" || r.status === filterStatus;

      const matchAsset =
        filterAsset === "all" ||
        (filterAsset === "assigned" && !!r.assetId) ||
        (filterAsset === "unassigned" && !r.assetId);

      const matchMail =
        filterMail === "all" ||
        (filterMail === "hasMail" && hasMail) ||
        (filterMail === "noMail" && !hasMail);

      return (
        matchQ &&
        matchBusinessType &&
        matchBrand &&
        matchCorporate &&
        matchStatus &&
        matchAsset &&
        matchMail
      );
    });
  }, [
    rows,
    q,
    filterBusinessType,
    filterBrand,
    filterCorporate,
    filterStatus,
    filterAsset,
    filterMail,
  ]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.storeId));

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
  };

  const openCreateSheet = () => {
    setSheetMode("create");
    setDraft({
      ...EMPTY_DRAFT,
      status: "active",
      emails: [""],
    });
    setSheetOpen(true);
  };

  const openEditSheet = (row: StoreRow) => {
    setSheetMode("edit");
    setDraft({
      ...EMPTY_DRAFT,
      ...row,
      emails: row.emails?.length ? row.emails : [""],
    });
    setSheetOpen(true);
  };

  const closeSheet = (force = false) => {
    if (!force && (saving || deleting)) return;
    setSheetOpen(false);
    resetDraft();
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filtered.map((r) => r.storeId);
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const addEmailField = () => {
    setDraft((prev) => ({ ...prev, emails: [...prev.emails, ""] }));
  };

  const removeEmailField = (index: number) => {
    setDraft((prev) => {
      const next = [...prev.emails];
      next.splice(index, 1);
      return {
        ...prev,
        emails: next.length > 0 ? next : [""],
      };
    });
  };

  const updateEmail = (index: number, val: string) => {
    setDraft((prev) => {
      const next = [...prev.emails];
      next[index] = val;
      return { ...prev, emails: next };
    });
  };

  const validateDraft = () => {
    if (!draft.name.trim()) {
      throw new Error("店舗名は必須です");
    }
    if (!draft.clubCode || Number.isNaN(Number(draft.clubCode))) {
      throw new Error("クラブコードは必須です");
    }
    if (!draft.corpId) {
      throw new Error("運営法人を選択してください");
    }
    if (!draft.brandId) {
      throw new Error("所属ブランドを選択してください");
    }

    const emails = normalizeEmails(draft.emails);
    const invalid = emails.find((email) => !isValidEmail(email));
    if (invalid) {
      throw new Error(`メールアドレスの形式が不正です: ${invalid}`);
    }
  };

  const saveStore = async () => {
    try {
      validateDraft();
      setSaving(true);

      const payload: StoreRow = {
        ...draft,
        clubCode: Number(draft.clubCode),
        name: draft.name.trim(),
        businessTypeName: draft.businessTypeName?.trim?.() || "",
        companyName: draft.companyName?.trim?.() || "",
        emails: normalizeEmails(draft.emails),
        updatedAt: new Date().toISOString(),
        version: sheetMode === "create" ? 1 : draft.version || 0,
        storeId:
          sheetMode === "create"
            ? draft.storeId || `S_${Date.now()}`
            : draft.storeId,
        corpId: draft.corpId || "",
        brandId: draft.brandId || "",
        corporateName: corpLabelMap[draft.corpId || ""] || draft.corporateName || "",
        brandName: brandLabelMap[draft.brandId || ""] || draft.brandName || "",
      };

      // 1. 店舗本体を保存
      const storeRes = await fetch("/api/admin/qsc/stores", {
        method: sheetMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const storeJson = await assertOk(
        storeRes,
        sheetMode === "create"
          ? "店舗の新規登録に失敗しました"
          : "店舗の更新に失敗しました"
      );

      const returnedItem = (storeJson as any)?.item || {};
      const savedStore: StoreRow = {
        ...payload,
        ...returnedItem,
      };

      const savedStoreId = savedStore.storeId || payload.storeId;

      // 2. アセットが選択されている場合は紐付け保存
      if (payload.assetId) {
        const assetRes = await fetch("/api/admin/qsc/store-assets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeId: savedStoreId,
            assetId: payload.assetId,
            isActive: true,
          }),
        });

        await assertOk(assetRes, "アセット紐付けの保存に失敗しました");
      }

      // 3. 画面反映
      setRows((prev) => {
        if (sheetMode === "create") {
          return [{ ...savedStore, assetId: payload.assetId }, ...prev];
        }
        return prev.map((r) =>
          r.storeId === savedStore.storeId
            ? { ...savedStore, assetId: payload.assetId }
            : r
        );
      });

      await reloadStores();
      closeSheet(true);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!storeId) return;
    if (!confirm("削除しますか？")) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/admin/qsc/stores/${encodeURIComponent(storeId)}`, {
        method: "DELETE",
      });

      await assertOk(res, "店舗の削除に失敗しました");

      setRows((prev) => prev.filter((r) => r.storeId !== storeId));
      setSelectedIds((prev) => prev.filter((id) => id !== storeId));
      closeSheet(true);
      await reloadStores();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  const applyBatchAsset = async () => {
    if (!batchAssetId) {
      alert("適用するアセットを選択してください");
      return;
    }
    if (selectedIds.length === 0) {
      alert("対象店舗が選択されていません");
      return;
    }

    try {
      setBatchSaving(true);

      const targetStoreIds = [...selectedIds];

      await Promise.all(
        targetStoreIds.map(async (storeId) => {
          const res = await fetch("/api/admin/qsc/store-assets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              storeId,
              assetId: batchAssetId,
              isActive: true,
            }),
          });

          await assertOk(res, `店舗 ${storeId} のアセット適用に失敗しました`);
        })
      );

      setRows((prev) =>
        prev.map((r) =>
          targetStoreIds.includes(r.storeId) ? { ...r, assetId: batchAssetId } : r
        )
      );

      setBatchModalOpen(false);
      setBatchAssetId("");
      setSelectedIds([]);
      await reloadStores();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "一括適用に失敗しました");
    } finally {
      setBatchSaving(false);
    }
  };

  const resetFilters = () => {
    setQ("");
    setFilterBusinessType("all");
    setFilterBrand("all");
    setFilterCorporate("all");
    setFilterStatus("all");
    setFilterAsset("all");
    setFilterMail("all");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background:
          "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.08) 0%, transparent 60%), #f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 32 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/admin"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#64748b",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <Home size={14} /> <span>Dashboard</span>
            </Link>
            <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
            <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>
              店舗マスター管理
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                <Store size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>店舗マスター管理</h1>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>拠点の紐付け設定</p>
              </div>
            </div>

            <button
              onClick={openCreateSheet}
              style={{
                height: 48,
                padding: "0 24px",
                borderRadius: 16,
                background: "#1e293b",
                color: "#fff",
                border: "none",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={22} />
              店舗を追加
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 28,
            padding: "24px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{ position: "absolute", left: 14, top: 13, color: "#94a3b8" }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="店舗名・コード・業態・ブランド・法人・ステータス・メールで検索..."
              style={{
                width: "100%",
                height: 44,
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                paddingLeft: 42,
                outline: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <SelectBox
              label="業態"
              options={["all", ...businessTypeOptions]}
              value={filterBusinessType}
              onChange={setFilterBusinessType}
              placeholder="すべて"
              optionLabelMap={{ all: "すべて" }}
            />

            <SelectBox
              label="ブランド"
              options={["all", ...brandOptions]}
              value={filterBrand}
              onChange={setFilterBrand}
              placeholder="すべて"
              optionLabelMap={{ all: "すべて" }}
            />

            <SelectBox
              label="法人"
              options={["all", ...corporateOptions]}
              value={filterCorporate}
              onChange={setFilterCorporate}
              placeholder="すべて"
              optionLabelMap={{ all: "すべて" }}
            />

            <SelectBox
              label="ステータス"
              options={["all", "active", "inactive", "archived"]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="すべて"
              optionLabelMap={{
                all: "すべて",
                active: "稼働中",
                inactive: "停止中",
                archived: "アーカイブ",
              }}
            />

            <SelectBox
              label="アセット"
              options={["all", "assigned", "unassigned"]}
              value={filterAsset}
              onChange={setFilterAsset}
              placeholder="すべて"
              optionLabelMap={{
                all: "すべて",
                assigned: "設定あり",
                unassigned: "未設定",
              }}
            />

            <SelectBox
              label="通知先メール"
              options={["all", "hasMail", "noMail"]}
              value={filterMail}
              onChange={setFilterMail}
              placeholder="すべて"
              optionLabelMap={{
                all: "すべて",
                hasMail: "設定あり",
                noMail: "未設定",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>
              絞り込み結果: {filtered.length}件
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                フィルターをクリア
              </button>

              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                disabled={filtered.length === 0}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid #c7d2fe",
                  background: allFilteredSelected ? "#4f46e5" : "#eef2ff",
                  color: allFilteredSelected ? "#fff" : "#4338ca",
                  fontWeight: 900,
                  cursor: filtered.length === 0 ? "default" : "pointer",
                  opacity: filtered.length === 0 ? 0.5 : 1,
                }}
              >
                {allFilteredSelected ? "絞り込み結果の選択解除" : "絞り込み結果を全て選択"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, paddingBottom: 100 }}>
          {rowsLoading ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: "24px",
                color: "#64748b",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: "24px",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              該当する店舗がありません
            </div>
          ) : (
            filtered.map((r) => {
              const isSelected = selectedIds.includes(r.storeId);
              const asset = assets.find((a) => a.assetId === r.assetId);

              return (
                <div
                  key={r.storeId}
                  onClick={() => openEditSheet(r)}
                  style={{
                    background: isSelected ? "#f5f3ff" : "#fff",
                    border: `2px solid ${isSelected ? "#4f46e5" : "#e2e8f0"}`,
                    borderRadius: 24,
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 20,
                    cursor: "pointer",
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== r.storeId)
                          : [...prev, r.storeId]
                      );
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "2px solid #e2e8f0",
                      background: isSelected ? "#4f46e5" : "#fff",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                    }}
                  >
                    {isSelected && <Check size={18} />}
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>{r.name}</h3>
                      <Chip tone="indigo">{r.brandName || "未設定"}</Chip>
                      <Chip>{r.businessTypeName || "業態未設定"}</Chip>
                      <Chip>Code:{r.clubCode}</Chip>
                      <Chip
                        tone={
                          r.status === "active"
                            ? "green"
                            : r.status === "inactive"
                            ? "red"
                            : "muted"
                        }
                      >
                        {r.status === "active"
                          ? "稼働中"
                          : r.status === "inactive"
                          ? "停止中"
                          : "アーカイブ"}
                      </Chip>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        fontSize: 12,
                        color: "#94a3b8",
                        fontWeight: 700,
                      }}
                    >
                      <span>{r.corporateName || "未設定"}</span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <FileStack size={14} /> {asset?.name || "未設定"}
                      </span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={14} /> {normalizeEmails(r.emails || []).length}件の連絡先
                      </span>
                    </div>
                  </div>

                  <Pencil size={18} style={{ color: "#cbd5e1" }} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "#1e293b",
            padding: "12px 24px",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>
            {selectedIds.length}件選択中（現在の絞り込みのみ一括選択可）
          </span>
          <button
            onClick={() => setBatchModalOpen(true)}
            style={{
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 10,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            アセット一括適用
          </button>
          <X
            size={20}
            style={{ color: "#94a3b8", cursor: "pointer" }}
            onClick={() => setSelectedIds([])}
          />
        </div>
      )}

      {sheetOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ flex: 1 }} onClick={() => closeSheet()} />
          <div
            style={{
              width: "100%",
              maxWidth: 600,
              background: "#fff",
              height: "100%",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontWeight: 950 }}>
                {sheetMode === "create" ? "店舗新規登録" : "店舗編集"}
              </h2>
              <X onClick={() => closeSheet()} style={{ cursor: "pointer" }} />
            </div>

            <div
              style={{
                padding: "32px",
                overflowY: "auto",
                display: "grid",
                gap: 24,
                alignContent: "start",
              }}
            >
              <SelectBox
                label="適用アセット"
                options={assets.map((a) => a.assetId)}
                value={draft.assetId || ""}
                onChange={(val: string) =>
                  setDraft((prev) => ({
                    ...prev,
                    assetId: val || undefined,
                  }))
                }
                placeholder={assetsLoading ? "読み込み中..." : "選択..."}
                optionLabelMap={assetLabelMap}
              />

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>店舗名</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  style={{
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: "0 12px",
                    fontWeight: 800,
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>クラブコード</label>
                <input
                  type="number"
                  value={draft.clubCode || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      clubCode: Number(e.target.value),
                    }))
                  }
                  style={{
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: "0 12px",
                    fontWeight: 800,
                  }}
                />
              </div>

              <SelectBox
                label="運営法人"
                options={corpIdOptions}
                value={draft.corpId || ""}
                onChange={(v: string) =>
                  setDraft((prev) => ({
                    ...prev,
                    corpId: v,
                    corporateName: corpLabelMap[v] || "",
                  }))
                }
                placeholder="法人を選択..."
                optionLabelMap={corpLabelMap}
              />

              <SelectBox
                label="所属ブランド"
                options={brandIdOptions}
                value={draft.brandId || ""}
                onChange={(v: string) =>
                  setDraft((prev) => ({
                    ...prev,
                    brandId: v,
                    brandName: brandLabelMap[v] || "",
                  }))
                }
                placeholder="ブランドを選択..."
                optionLabelMap={brandLabelMap}
              />

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>業態</label>
                <input
                  value={draft.businessTypeName || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      businessTypeName: e.target.value,
                    }))
                  }
                  style={{
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: "0 12px",
                    fontWeight: 800,
                  }}
                />
              </div>

              <SelectBox
                label="ステータス"
                options={["active", "inactive", "archived"]}
                value={draft.status}
                onChange={(v: StoreStatus) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: v,
                  }))
                }
                placeholder="ステータスを選択..."
                optionLabelMap={{
                  active: "稼働中",
                  inactive: "停止中",
                  archived: "アーカイブ",
                }}
              />

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>通知先メール</label>
                <div style={{ display: "grid", gap: 8 }}>
                  {draft.emails.map((email, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="mail@example.com"
                        style={{
                          height: 46,
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          padding: "0 12px",
                          fontWeight: 700,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEmailField}
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: "1px dashed #cbd5e1",
                      background: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + メールを追加
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "24px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                {sheetMode === "edit" && (
                  <button
                    type="button"
                    onClick={() => deleteStore(draft.storeId)}
                    disabled={deleting || saving}
                    style={{
                      height: 46,
                      padding: "0 18px",
                      borderRadius: 12,
                      border: "1px solid #fecaca",
                      background: "#fff1f2",
                      color: "#be123c",
                      fontWeight: 900,
                      cursor: deleting || saving ? "default" : "pointer",
                      opacity: deleting || saving ? 0.6 : 1,
                    }}
                  >
                    {deleting ? "削除中..." : "削除"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={saving || deleting}
                  style={{
                    height: 46,
                    padding: "0 18px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#334155",
                    fontWeight: 900,
                    cursor: saving || deleting ? "default" : "pointer",
                    opacity: saving || deleting ? 0.6 : 1,
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  onClick={saveStore}
                  disabled={saving || deleting}
                  style={{
                    height: 46,
                    padding: "0 18px",
                    borderRadius: 12,
                    border: "none",
                    background: "#1e293b",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: saving || deleting ? "default" : "pointer",
                    opacity: saving || deleting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {batchModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: 400,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 48px)",
              borderRadius: 24,
              padding: "32px",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 20,
              overflow: "hidden",
            }}
          >
            <h3 style={{ margin: 0, textAlign: "center", fontWeight: 950 }}>
              アセットを一括適用
            </h3>

            <div style={{ overflowY: "auto" }}>
              <SelectBox
                label="適用アセット"
                options={assets.map((a) => a.assetId)}
                value={batchAssetId}
                onChange={setBatchAssetId}
                placeholder={assetsLoading ? "読み込み中..." : "選択..."}
                optionLabelMap={assetLabelMap}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  if (batchSaving) return;
                  setBatchModalOpen(false);
                }}
                disabled={batchSaving}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  fontWeight: 800,
                  cursor: batchSaving ? "default" : "pointer",
                  opacity: batchSaving ? 0.7 : 1,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={applyBatchAsset}
                disabled={batchSaving}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: batchSaving ? "default" : "pointer",
                  opacity: batchSaving ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {batchSaving && <Loader2 size={16} className="animate-spin" />}
                適用する
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}