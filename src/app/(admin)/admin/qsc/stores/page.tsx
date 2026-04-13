"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { StoreBulkUploadModal } from "@/app/(admin)/admin/qsc/stores/StoreBulkUploadModal";
import Link from "next/link";
import {
  Store, Search, Plus, Pencil, X, Home, FileStack, Check,
  Trash2, ChevronRight, Mail, Loader2, UserSearch, Upload,
} from "lucide-react";

/* ========================= Types ========================= */
type StoreStatus = "active" | "inactive" | "archived";
type FilterAssetType = "all" | "assigned" | "unassigned";
type FilterMailType = "all" | "hasMail" | "noMail";

type StoreRow = {
  storeId: string; clubCode: number; name: string;
  brandId?: string; brandName: string; businessTypeName: string;
  companyName: string; corpId?: string; corporateName: string;
  status: StoreStatus; assetId?: string;
  email: string;           // 通知先メール（1件・編集用）
  emails?: string[];       // 通知先メール（API返却値・配列）
  managers: { email: string; name: string }[]; // 担当者（複数）
  updatedAt?: string; version?: number;
};

type AssetRow = { assetId: string; name: string; description?: string; isActive?: boolean };
type UserRow = { email: string; name: string; role: string; storeId: string };

const EMPTY_DRAFT: StoreRow = {
  storeId: "", clubCode: 0, name: "", brandId: "", brandName: "",
  businessTypeName: "", companyName: "", corpId: "", corporateName: "",
  status: "active", assetId: undefined,
  email: "", managers: [],
  updatedAt: "", version: 0,
};

/* ========================= Utils ========================= */
function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function normalizeEmail(email: string) { return (email || "").trim(); }
async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  try { return await res.json(); } catch { return null; }
}
async function assertOk(res: Response, fallbackMessage: string) {
  const json = await safeJson(res);
  if (!res.ok) throw new Error((json as { error?: string })?.error || fallbackMessage);
  return json;
}

/* ========================= Chip ========================= */
function Chip({ children, tone = "muted" }: {
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
    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.text, border: `1px solid ${s.bd}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
    </span>
  );
}

/* ========================= SelectBox ========================= */
function SelectBox({ label, options, value, onChange, placeholder = "選択...", optionLabelMap }: {
  label: string; options: string[]; value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string; optionLabelMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isMulti = Array.isArray(value);
  const getLabel = (v: string) => optionLabelMap?.[v] ?? v;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>{label}</div>
      <div onClick={() => setOpen(!open)} style={{ minHeight: 48, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, cursor: "pointer", alignItems: "center" }}>
        {!isMulti && !value && <span style={{ color: "#94a3b8", fontSize: 14 }}>{placeholder}</span>}
        {!isMulti && !!value && <span style={{ fontSize: 14, fontWeight: 700 }}>{getLabel(String(value))}</span>}
        {isMulti && (value.length === 0
          ? <span style={{ color: "#cbd5e1", fontSize: 13 }}>すべて表示</span>
          : (value as string[]).map(v => (
            <span key={v} style={{ background: "#4f46e5", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
              {getLabel(v)} <X size={12} onClick={e => { e.stopPropagation(); onChange((value as string[]).filter(x => x !== v)); }} />
            </span>
          ))
        )}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 150, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
          {options.map(opt => {
            const isSel = isMulti ? (value as string[]).includes(opt) : value === opt;
            return (
              <div key={opt} onClick={() => {
                onChange(isMulti ? (isSel ? (value as string[]).filter(x => x !== opt) : [...(value as string[]), opt]) : opt);
                if (!isMulti) setOpen(false);
              }} style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", background: isSel ? "#f5f3ff" : "transparent", color: isSel ? "#4f46e5" : "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

/* ========================= ManagerSearchInput（担当者複数選択） ========================= */
function ManagerSearchInput({ selected, onChange }: {
  selected: { email: string; name: string }[];
  onChange: (v: { email: string; name: string }[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        setUsers(Array.isArray(json?.items) ? json.items : []);
        setOpen(true);
      } catch { setUsers([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (v.length >= 1) search(v);
    else { setUsers([]); setOpen(false); }
  };

  const addManager = (user: UserRow) => {
    if (!selected.find(m => m.email === user.email)) {
      onChange([...selected, { email: user.email, name: user.name }]);
    }
    setQuery(""); setUsers([]); setOpen(false);
  };

  const removeManager = (email: string) => {
    onChange(selected.filter(m => m.email !== email));
  };

  const filteredUsers = users.filter(u => !selected.find(m => m.email === u.email));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>担当者</label>

      {/* 選択済み担当者 */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {selected.map(m => (
            <div key={m.email} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e0e7ff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: "#4f46e5" }}>
                {m.name?.charAt(0) || "?"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.email}</div>
              </div>
              <button type="button" onClick={() => removeManager(m.email)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "grid", placeItems: "center" }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 検索インプット */}
      <div ref={wrapRef} style={{ position: "relative" }}>
        <div style={{ position: "relative" }}>
          <UserSearch size={16} style={{ position: "absolute", left: 12, top: 15, color: "#94a3b8" }} />
          <input
            value={query}
            onChange={handleInput}
            onFocus={() => { if (query.length >= 1) setOpen(true); }}
            placeholder="名前またはメールアドレスで検索..."
            style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 12, border: "1px solid #e2e8f0", paddingLeft: 38, paddingRight: 12, fontSize: 14, fontWeight: 600, outline: "none" }}
          />
          {loading && <Loader2 size={16} style={{ position: "absolute", right: 12, top: 15, color: "#94a3b8", animation: "spin 1s linear infinite" }} />}
        </div>
        {open && (
          <div style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 200, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxHeight: 240, overflowY: "auto", padding: 6 }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>
                {loading ? "検索中..." : "該当するユーザーがいません"}
              </div>
            ) : filteredUsers.map(user => (
              <button key={user.email} type="button" onClick={() => addManager(user)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ff", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 13, fontWeight: 900, color: "#4f46e5" }}>
                  {user.name?.charAt(0) || "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{user.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{user.email}</div>
                </div>
                <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                  <Chip tone={user.role === "admin" ? "indigo" : user.role === "manager" ? "blue" : "muted"}>{user.role}</Chip>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= Page ========================= */
export default function AdminStoresPage() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [brandMaster, setBrandMaster] = useState<{ brandId: string; brandName: string }[]>([]);
  const [bizMaster, setBizMaster] = useState<{ bizId: string; bizName: string }[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filterBusinessType, setFilterBusinessType] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCorporate, setFilterCorporate] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAsset, setFilterAsset] = useState<FilterAssetType>("all");
  const [filterMail, setFilterMail] = useState<FilterMailType>("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchAssetId, setBatchAssetId] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<StoreRow>(EMPTY_DRAFT);

  const [saving, setSaving] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  const reloadStores = async () => {
    const res = await fetch("/api/admin/qsc/stores", { cache: "no-store" });
    const json = await assertOk(res, "店舗一覧の再取得に失敗しました") as { items?: StoreRow[]; brands?: { brandId: string; brandName: string }[]; bizTypes?: { bizId: string; bizName: string }[] };
    setRows(Array.isArray(json?.items) ? json.items : []);
    if (Array.isArray(json?.brands)) setBrandMaster(json.brands);
    if (Array.isArray(json?.bizTypes)) setBizMaster(json.bizTypes);
  };

  const reloadAssets = async () => {
    const res = await fetch("/api/admin/qsc/assets", { cache: "no-store" });
    const json = await assertOk(res, "アセット一覧の取得に失敗しました");
    setAssets(Array.isArray((json as { items?: AssetRow[] })?.items) ? (json as { items: AssetRow[] }).items : []);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setRowsLoading(true);
        const res = await fetch("/api/admin/qsc/stores", { cache: "no-store" });
        const json = await assertOk(res, "店舗一覧の取得に失敗しました") as { items?: StoreRow[]; brands?: { brandId: string; brandName: string }[]; bizTypes?: { bizId: string; bizName: string }[] };
        if (!cancelled) {
          setRows(Array.isArray(json?.items) ? json.items : []);
          if (Array.isArray(json?.brands)) setBrandMaster(json.brands);
          if (Array.isArray(json?.bizTypes)) setBizMaster(json.bizTypes);
        }
      } catch (e) { console.error(e); if (!cancelled) setRows([]); }
      finally { if (!cancelled) setRowsLoading(false); }
    };
    const loadA = async () => {
      try {
        setAssetsLoading(true);
        const res = await fetch("/api/admin/qsc/assets", { cache: "no-store" });
        const json = await assertOk(res, "アセット一覧の取得に失敗しました");
        if (!cancelled) setAssets(Array.isArray((json as { items?: AssetRow[] })?.items) ? (json as { items: AssetRow[] }).items : []);
      } catch (e) { console.error(e); if (!cancelled) setAssets([]); }
      finally { if (!cancelled) setAssetsLoading(false); }
    };
    load(); loadA();
    return () => { cancelled = true; };
  }, []);

  const assetLabelMap = useMemo(() => Object.fromEntries(assets.map(a => [a.assetId, a.name || a.assetId])), [assets]);
  const brandLabelMap = useMemo(() => brandMaster.length > 0 ? Object.fromEntries(brandMaster.map(b => [b.brandId, b.brandName])) : Object.fromEntries(rows.filter(r => r.brandId).map(r => [String(r.brandId), r.brandName || String(r.brandId)])), [rows, brandMaster]);
  const corpLabelMap  = useMemo(() => Object.fromEntries(rows.filter(r => r.corpId).map(r => [String(r.corpId), r.corporateName || String(r.corpId)])), [rows]);
  const businessTypeOptions = useMemo(() => bizMaster.length > 0 ? bizMaster.map(b => b.bizName).sort((a, b) => a.localeCompare(b, "ja")) : Array.from(new Set(rows.map(r => String(r.businessTypeName || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja")), [rows, bizMaster]);
  const brandOptions        = useMemo(() => brandMaster.length > 0 ? brandMaster.map(b => b.brandName).sort((a, b) => a.localeCompare(b, "ja")) : Array.from(new Set(rows.map(r => String(r.brandName || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja")), [rows, brandMaster]);
  const corporateOptions    = useMemo(() => Array.from(new Set(rows.map(r => String(r.corporateName || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja")), [rows]);
  const brandIdOptions      = useMemo(() => brandMaster.length > 0 ? brandMaster.map(b => b.brandId).sort((a, b) => a.localeCompare(b, "ja")) : Array.from(new Set(rows.map(r => String(r.brandId || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja")), [rows, brandMaster]);
  const corpIdOptions       = useMemo(() => Array.from(new Set(rows.map(r => String(r.corpId || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja")), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    const hasMail = !!normalizeEmail(r.email) || !!(r.emails?.length);
    const matchQ = !q || [r.name, String(r.clubCode), r.brandName, r.corporateName, r.companyName, r.businessTypeName, r.status, r.email, ...(r.managers || []).map(m => m.email + ' ' + m.name)].filter(Boolean).some(f => String(f).toLowerCase().includes(q.toLowerCase()));
    return matchQ &&
      (filterBusinessType === "all" || r.businessTypeName === filterBusinessType) &&
      (filterBrand === "all" || r.brandName === filterBrand) &&
      (filterCorporate === "all" || r.corporateName === filterCorporate) &&
      (filterStatus === "all" || r.status === filterStatus) &&
      (filterAsset === "all" || (filterAsset === "assigned" && !!r.assetId) || (filterAsset === "unassigned" && !r.assetId)) &&
      (filterMail === "all" || (filterMail === "hasMail" && hasMail) || (filterMail === "noMail" && !hasMail));
  }), [rows, q, filterBusinessType, filterBrand, filterCorporate, filterStatus, filterAsset, filterMail]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.storeId));

  const openCreateSheet = () => { setSheetMode("create"); setDraft({ ...EMPTY_DRAFT, status: "active", email: "", managers: [] }); setSheetOpen(true); };
  const openEditSheet = (row: StoreRow) => { setSheetMode("edit"); setDraft({ ...EMPTY_DRAFT, ...row, email: row.email || (row.emails?.[0] ?? ""), managers: row.managers || [] }); setSheetOpen(true); };
  const closeSheet = (force = false) => { if (!force && (saving || deleting)) return; setSheetOpen(false); setDraft(EMPTY_DRAFT); };
  const toggleSelectAllFiltered = () => {
    const ids = filtered.map(r => r.storeId);
    if (allFilteredSelected) setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    else setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const validateDraft = () => {
    if (!draft.name.trim()) throw new Error("店舗名は必須です");
    if (!draft.clubCode || Number.isNaN(Number(draft.clubCode))) throw new Error("クラブコードは必須です");
    if (!draft.corpId) throw new Error("運営法人を選択してください");
    if (!draft.brandId) throw new Error("所属ブランドを選択してください");
    const email = normalizeEmail(draft.email);
    if (email && !isValidEmail(email)) throw new Error(`メールアドレスの形式が不正です: ${email}`);
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
        email: normalizeEmail(draft.email),
        managers: draft.managers || [],
        updatedAt: new Date().toISOString(),
        version: sheetMode === "create" ? 1 : draft.version || 0,
        storeId: sheetMode === "create" ? (draft.storeId || `S_${Date.now()}`) : draft.storeId,
        corpId: draft.corpId || "",
        brandId: draft.brandId || "",
        corporateName: corpLabelMap[draft.corpId || ""] || draft.corporateName || "",
        brandName: brandLabelMap[draft.brandId || ""] || draft.brandName || "",
      };
      const storeRes = await fetch("/api/admin/qsc/stores", { method: sheetMode === "create" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const storeJson = await assertOk(storeRes, sheetMode === "create" ? "店舗の新規登録に失敗しました" : "店舗の更新に失敗しました");
      const savedStore: StoreRow = { ...payload, ...((storeJson as { item?: StoreRow })?.item || {}) };
      const savedStoreId = savedStore.storeId || payload.storeId;
      if (payload.assetId) {
        const assetRes = await fetch("/api/admin/qsc/store-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: savedStoreId, assetId: payload.assetId, isActive: true }) });
        await assertOk(assetRes, "アセット紐付けの保存に失敗しました");
      }
      setRows(prev => sheetMode === "create" ? [{ ...savedStore, assetId: payload.assetId }, ...prev] : prev.map(r => r.storeId === savedStore.storeId ? { ...savedStore, assetId: payload.assetId } : r));
      await reloadStores();
      closeSheet(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      alert(msg);
    } finally { setSaving(false); }
  };

  const deleteStore = async (storeId: string) => {
    if (!storeId || !confirm("削除しますか？")) return;
    try {
      setDeleting(true);
      await assertOk(await fetch(`/api/admin/qsc/stores/${encodeURIComponent(storeId)}`, { method: "DELETE" }), "店舗の削除に失敗しました");
      setRows(prev => prev.filter(r => r.storeId !== storeId));
      setSelectedIds(prev => prev.filter(id => id !== storeId));
      closeSheet(true);
      await reloadStores();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    finally { setDeleting(false); }
  };

  const openBatchModal = async () => {
    setBatchAssetId(""); setBatchModalOpen(true); setAssetsLoading(true);
    try { await reloadAssets(); } catch (e: unknown) { setAssets([]); alert(e instanceof Error ? e.message : "アセット取得失敗"); } finally { setAssetsLoading(false); }
  };

  const applyBatchAsset = async () => {
    if (!batchAssetId) { alert("適用するアセットを選択してください"); return; }
    if (selectedIds.length === 0) { alert("対象店舗が選択されていません"); return; }
    try {
      setBatchSaving(true);
      await Promise.all(selectedIds.map(async storeId => {
        await assertOk(await fetch("/api/admin/qsc/store-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, assetId: batchAssetId, isActive: true }) }), `店舗 ${storeId} のアセット適用に失敗しました`);
      }));
      setRows(prev => prev.map(r => selectedIds.includes(r.storeId) ? { ...r, assetId: batchAssetId } : r));
      setBatchModalOpen(false); setBatchAssetId(""); setSelectedIds([]);
      await reloadStores();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "一括適用に失敗しました"); }
    finally { setBatchSaving(false); }
  };

  const resetFilters = () => { setQ(""); setFilterBusinessType("all"); setFilterBrand("all"); setFilterCorporate("all"); setFilterStatus("all"); setFilterAsset("all"); setFilterMail("all"); };

  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.08) 0%, transparent 60%), #f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 32 }}>

        {/* ヘッダー */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
              <Home size={14} /> <span>Dashboard</span>
            </Link>
            <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
            <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>店舗マスター管理</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 18, display: "grid", placeItems: "center", color: "#fff" }}>
                <Store size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>店舗マスター管理</h1>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>拠点の紐付け設定</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBulkUploadOpen(true)} style={{ height: 48, padding: "0 20px", borderRadius: 16, background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={18} /> CSV一括登録
              </button>
              <button onClick={openCreateSheet} style={{ height: 48, padding: "0 24px", borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={22} /> 店舗を追加
              </button>
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div style={{ background: "#fff", borderRadius: 28, padding: 24, border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: 13, color: "#94a3b8" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="店舗名・コード・業態・ブランド・法人・ステータス・メールで検索..." style={{ width: "100%", height: 44, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 42, outline: "none", fontSize: 14, fontWeight: 700 }} />
          </div>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <SelectBox label="業態" options={["all", ...businessTypeOptions]} value={filterBusinessType} onChange={v => setFilterBusinessType(v as string)} placeholder="すべて" optionLabelMap={{ all: "すべて" }} />
            <SelectBox label="ブランド" options={["all", ...brandOptions]} value={filterBrand} onChange={v => setFilterBrand(v as string)} placeholder="すべて" optionLabelMap={{ all: "すべて" }} />
            <SelectBox label="法人" options={["all", ...corporateOptions]} value={filterCorporate} onChange={v => setFilterCorporate(v as string)} placeholder="すべて" optionLabelMap={{ all: "すべて" }} />
            <SelectBox label="ステータス" options={["all", "active", "inactive", "archived"]} value={filterStatus} onChange={v => setFilterStatus(v as string)} placeholder="すべて" optionLabelMap={{ all: "すべて", active: "稼働中", inactive: "停止中", archived: "アーカイブ" }} />
            <SelectBox label="アセット" options={["all", "assigned", "unassigned"]} value={filterAsset} onChange={v => setFilterAsset(v as FilterAssetType)} placeholder="すべて" optionLabelMap={{ all: "すべて", assigned: "設定あり", unassigned: "未設定" }} />
            <SelectBox label="通知先メール" options={["all", "hasMail", "noMail"]} value={filterMail} onChange={v => setFilterMail(v as FilterMailType)} placeholder="すべて" optionLabelMap={{ all: "すべて", hasMail: "設定あり", noMail: "未設定" }} />
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>絞り込み結果: {filtered.length}件</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={resetFilters} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 900, cursor: "pointer" }}>フィルターをクリア</button>
              <button type="button" onClick={toggleSelectAllFiltered} disabled={filtered.length === 0} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #c7d2fe", background: allFilteredSelected ? "#4f46e5" : "#eef2ff", color: allFilteredSelected ? "#fff" : "#4338ca", fontWeight: 900, cursor: filtered.length === 0 ? "default" : "pointer", opacity: filtered.length === 0 ? 0.5 : 1 }}>
                {allFilteredSelected ? "絞り込み結果の選択解除" : "絞り込み結果を全て選択"}
              </button>
            </div>
          </div>
        </div>

        {/* 店舗リスト */}
        <div style={{ display: "grid", gap: 12, paddingBottom: 100 }}>
          {rowsLoading ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, color: "#64748b", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> 読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, color: "#64748b", fontWeight: 800 }}>該当する店舗がありません</div>
          ) : filtered.map(r => {
            const isSelected = selectedIds.includes(r.storeId);
            const asset = assets.find(a => a.assetId === r.assetId);
            return (
              <div key={r.storeId} onClick={() => openEditSheet(r)} style={{ background: isSelected ? "#f5f3ff" : "#fff", border: `2px solid ${isSelected ? "#4f46e5" : "#e2e8f0"}`, borderRadius: 24, padding: "20px 24px", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 20, cursor: "pointer" }}>
                <div onClick={e => { e.stopPropagation(); setSelectedIds(prev => isSelected ? prev.filter(id => id !== r.storeId) : [...prev, r.storeId]); }} style={{ width: 28, height: 28, borderRadius: 8, border: "2px solid #e2e8f0", background: isSelected ? "#4f46e5" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>
                  {isSelected && <Check size={18} />}
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>{r.name}</h3>
                    <Chip tone="indigo">{r.brandName || "未設定"}</Chip>
                    <Chip>{r.businessTypeName || "業態未設定"}</Chip>
                    <Chip>Code:{r.clubCode}</Chip>
                    <Chip tone={r.status === "active" ? "green" : r.status === "inactive" ? "red" : "muted"}>
                      {r.status === "active" ? "稼働中" : r.status === "inactive" ? "停止中" : "アーカイブ"}
                    </Chip>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                    <span>{r.corporateName || "未設定"}</span>
                    <span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileStack size={14} /> {asset?.name || "未設定"}</span>
                    <span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={14} /> {r.email || r.emails?.[0] || "未設定"}</span>
                  </div>
                </div>
                <Pencil size={18} style={{ color: "#cbd5e1" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 一括選択バー */}
      {selectedIds.length > 0 && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#1e293b", padding: "12px 24px", borderRadius: 20, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{selectedIds.length}件選択中</span>
          <button onClick={openBatchModal} style={{ background: "#4f46e5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>アセット一括適用</button>
          <X size={20} style={{ color: "#94a3b8", cursor: "pointer" }} onClick={() => setSelectedIds([])} />
        </div>
      )}

      {/* 編集シート */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ flex: 1 }} onClick={() => closeSheet()} />
          <div style={{ width: "100%", maxWidth: 600, background: "#fff", height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontWeight: 950 }}>{sheetMode === "create" ? "店舗新規登録" : "店舗編集"}</h2>
              <X onClick={() => closeSheet()} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ padding: 32, overflowY: "auto", display: "grid", gap: 24, alignContent: "start" }}>

              <SelectBox label="適用アセット" options={assets.map(a => a.assetId)} value={draft.assetId || ""} onChange={v => setDraft(prev => ({ ...prev, assetId: (v as string) || undefined }))} placeholder={assetsLoading ? "読み込み中..." : "選択..."} optionLabelMap={assetLabelMap} />

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>店舗名</label>
                <input value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800, fontSize: 14 }} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>クラブコード</label>
                <input type="number" value={draft.clubCode || ""} onChange={e => setDraft(prev => ({ ...prev, clubCode: Number(e.target.value) }))} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800, fontSize: 14 }} />
              </div>

              <SelectBox label="運営法人" options={corpIdOptions} value={draft.corpId || ""} onChange={v => setDraft(prev => ({ ...prev, corpId: v as string, corporateName: corpLabelMap[v as string] || "" }))} placeholder="法人を選択..." optionLabelMap={corpLabelMap} />
              <SelectBox label="所属ブランド" options={brandIdOptions} value={draft.brandId || ""} onChange={v => setDraft(prev => ({ ...prev, brandId: v as string, brandName: brandLabelMap[v as string] || "" }))} placeholder="ブランドを選択..." optionLabelMap={brandLabelMap} />

              {/* ① 業態をプルダウンに変更 */}
              <SelectBox
                label="業態"
                options={businessTypeOptions.length > 0 ? businessTypeOptions : []}
                value={draft.businessTypeName || ""}
                onChange={v => setDraft(prev => ({ ...prev, businessTypeName: v as string }))}
                placeholder="業態を選択..."
              />

              <SelectBox label="ステータス" options={["active", "inactive", "archived"]} value={draft.status} onChange={v => setDraft(prev => ({ ...prev, status: v as StoreStatus }))} placeholder="ステータスを選択..." optionLabelMap={{ active: "稼働中", inactive: "停止中", archived: "アーカイブ" }} />

              {/* 通知先メール（1件直打ち） */}
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>通知先メール</label>
                <input
                  value={draft.email || ""}
                  onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="mail@example.com"
                  style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 14, fontWeight: 600, outline: "none" }}
                />
              </div>

              {/* 担当者（ユーザー検索・複数選択） */}
              <ManagerSearchInput
                selected={draft.managers || []}
                onChange={managers => setDraft(prev => ({ ...prev, managers }))}
              />

              {sheetMode === "edit" && (
                <button type="button" onClick={() => deleteStore(draft.storeId)} disabled={deleting} style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2", padding: 12, borderRadius: 12, fontWeight: 800, cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={16} />} 店舗を削除
                </button>
              )}
            </div>
            <div style={{ padding: 24, background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", gap: 12 }}>
              <button onClick={() => closeSheet()} disabled={saving || deleting} style={{ flex: 1, height: 50, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: saving || deleting ? "default" : "pointer", opacity: saving || deleting ? 0.7 : 1 }}>キャンセル</button>
              <button onClick={saveStore} disabled={saving || deleting} style={{ flex: 2, height: 50, borderRadius: 12, background: "#1e293b", color: "#fff", fontWeight: 900, cursor: saving || deleting ? "default" : "pointer", opacity: saving || deleting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none" }}>
                {saving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />} 保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括適用モーダル */}
      {batchModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 48px)", borderRadius: 24, padding: 24, display: "grid", gridTemplateRows: "auto auto minmax(0,1fr) auto", gap: 16, overflow: "hidden" }}>
            <h3 style={{ margin: 0, textAlign: "center", fontWeight: 950 }}>アセットを一括適用</h3>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, textAlign: "center" }}>選択中の {selectedIds.length} 店舗に適用するアセットを選んでください</div>
            <div style={{ display: "grid", gap: 10, overflowY: "auto", minHeight: 120, paddingRight: 4, alignContent: "start" }}>
              {assetsLoading ? (
                <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", color: "#64748b", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> 読み込み中...
                </div>
              ) : assets.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", color: "#94a3b8", fontWeight: 700, textAlign: "center" }}>アセットがありません</div>
              ) : assets.map(a => (
                <button key={a.assetId} type="button" onClick={() => setBatchAssetId(a.assetId)} style={{ padding: 16, borderRadius: 12, border: `2px solid ${batchAssetId === a.assetId ? "#4f46e5" : "#e2e8f0"}`, background: batchAssetId === a.assetId ? "#f5f3ff" : "#fff", textAlign: "left", cursor: "pointer", fontWeight: 800, display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14 }}>{a.name || a.assetId}</span>
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{a.assetId}</span>
                  {a.description && <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{a.description}</span>}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button type="button" onClick={() => { if (!batchSaving) { setBatchModalOpen(false); setBatchAssetId(""); } }} disabled={batchSaving} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: batchSaving ? "default" : "pointer", opacity: batchSaving ? 0.7 : 1 }}>戻る</button>
              <button type="button" onClick={applyBatchAsset} disabled={batchSaving || !batchAssetId} style={{ height: 46, borderRadius: 12, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 900, cursor: batchSaving || !batchAssetId ? "default" : "pointer", opacity: batchSaving || !batchAssetId ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {batchSaving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />} 適用する
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkUploadOpen && (
        <StoreBulkUploadModal
          onClose={() => setBulkUploadOpen(false)}
          onComplete={() => { setBulkUploadOpen(false); reloadStores(); }}
        />
      )}
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </main>
  );
}
