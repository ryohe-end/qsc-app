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
  Building2,
  FileStack,
  Check,
  Filter,
  Trash2,
  Layers,
  ChevronRight,
  Mail,
} from "lucide-react";

/** =========================
 * Types & Masters
 * ========================= */
type StoreStatus = "active" | "inactive" | "archived";
type BrandName = "JOYFIT" | "FIT365";

type StoreRow = {
  storeId: string;
  clubCode: number;
  name: string;
  brandName: BrandName;
  businessTypeName: string;
  companyName: string;
  corporateName: string;
  status: StoreStatus;
  assetId?: string;
  emails: string[]; // ✅ 追加
  updatedAt?: string;
  version?: number;
};

const BRANDS: BrandName[] = ["JOYFIT", "FIT365"];
const CORPORATES = ["株式会社オカモト", "株式会社ヤマウチ", "株式会社〇〇"];

const ASSET_MASTER = [
  { assetId: "A001", name: "JOYFIT_直営_標準", questionCount: 12 },
  { assetId: "A002", name: "FIT365_FC_ライト", questionCount: 8 },
  { assetId: "A003", name: "巡回専用特化アセット", questionCount: 25 },
];

const MOCK: StoreRow[] = [
  { 
    storeId: "S001", clubCode: 306, name: "札幌大通", brandName: "JOYFIT", 
    businessTypeName: "JOYFIT24", companyName: "第1カンパニー", 
    corporateName: "株式会社オカモト", status: "active", assetId: "A001", 
    emails: ["sapporo@test.com"], updatedAt: new Date().toISOString(), version: 1 
  },
  { 
    storeId: "S002", clubCode: 565, name: "新宿西口", brandName: "FIT365", 
    businessTypeName: "FIT365", companyName: "HQカンパニー", 
    corporateName: "株式会社〇〇", status: "inactive", assetId: undefined, 
    emails: ["shinjuku@test.com", "manager@test.com"], updatedAt: new Date().toISOString(), version: 2 
  },
];

/** =========================
 * Sub-Components
 * ========================= */
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "blue" | "green" | "red" | "indigo" }) {
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

function SelectBox({ label, options, value, onChange, placeholder = "選択..." }: any) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isMulti = Array.isArray(value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>{label}</div>
      <div onClick={() => setOpen(!open)} style={{ minHeight: 48, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, cursor: "pointer", alignItems: "center" }}>
        {!isMulti && !value && <span style={{ color: "#94a3b8", fontSize: 14 }}>{placeholder}</span>}
        {!isMulti && value && <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>}
        {isMulti && (value.length === 0 ? <span style={{ color: "#cbd5e1", fontSize: 13 }}>すべて表示</span> : (value as string[]).map(v => (
          <span key={v} style={{ background: "#4f46e5", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
            {v} <X size={12} onClick={(e) => { e.stopPropagation(); onChange((value as string[]).filter(x => x !== v)); }} />
          </span>
        )))}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 150, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: 6, maxHeight: 200, overflowY: "auto" }}>
          {options.map((opt: string) => {
            const isSel = isMulti ? (value as string[]).includes(opt) : value === opt;
            return (
              <div key={opt} onClick={() => { onChange(isMulti ? (isSel ? (value as string[]).filter(x => x !== opt) : [...(value as string[]), opt]) : opt); if(!isMulti) setOpen(false); }} style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", background: isSel ? "#f5f3ff" : "transparent", color: isSel ? "#4f46e5" : "#1e293b", display: "flex", justifyContent: "space-between" }}>
                {opt} {isSel && <Check size={14} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** =========================
 * Main Component
 * ========================= */
export default function AdminStoresPage() {
  const [rows, setRows] = useState<StoreRow[]>(MOCK);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchAssetId, setBatchAssetId] = useState<string | undefined>(undefined);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<Partial<StoreRow>>({ emails: [""] });

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchQ = !q || [r.name, String(r.clubCode)].some(f => f.toLowerCase().includes(q.toLowerCase()));
      return matchQ;
    });
  }, [rows, q]);

  // ✅ メールアドレス入力操作
  const addEmailField = () => {
    setDraft({ ...draft, emails: [...(draft.emails || []), ""] });
  };
  const removeEmailField = (index: number) => {
    const next = [...(draft.emails || [])];
    next.splice(index, 1);
    setDraft({ ...draft, emails: next });
  };
  const updateEmail = (index: number, val: string) => {
    const next = [...(draft.emails || [])];
    next[index] = val;
    setDraft({ ...draft, emails: next });
  };

  const saveStore = () => {
    if (!draft.name || !draft.clubCode) return alert("名称とコードは必須です");
    // 空欄のメールを除外
    const validEmails = (draft.emails || []).filter(em => em.trim() !== "");
    const next = { 
      ...(draft as StoreRow), 
      emails: validEmails,
      updatedAt: new Date().toISOString(), 
      version: (draft.version || 0) + 1 
    };
    
    if (sheetMode === "create") {
      setRows([{ ...next, storeId: `S${Date.now()}` }, ...rows]);
    } else {
      setRows(rows.map(r => r.storeId === draft.storeId ? next : r));
    }
    setSheetOpen(false);
  };

  const applyBatchAsset = () => {
    if (!batchAssetId) return;
    setRows(rows.map(r => selectedIds.includes(r.storeId) ? { ...r, assetId: batchAssetId } : r));
    setBatchModalOpen(false);
    setSelectedIds([]);
  };

  const deleteStore = (id: string) => {
    if (confirm("削除しますか？")) {
      setRows(rows.filter(r => r.storeId !== id));
      setSheetOpen(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.08) 0%, transparent 60%), #f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 32 }}>
        
        {/* Header with Breadcrumbs */}
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
              <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 18, display: "grid", placeItems: "center", color: "#fff" }}><Store size={26} /></div>
              <div><h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>店舗マスター管理</h1><p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>拠点の紐付け設定</p></div>
            </div>
            <button onClick={() => { setSheetMode("create"); setDraft({ brandName: "JOYFIT", status: "active", emails: [""] }); setSheetOpen(true); }} style={{ height: 48, padding: "0 24px", borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><Plus size={22} />店舗を追加</button>
          </div>
        </div>

        {/* Filter Panel */}
        <div style={{ background: "#fff", borderRadius: 28, padding: "24px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: 13, color: "#94a3b8" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="店舗名・コードで検索..." style={{ width: "100%", height: 44, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 42, outline: "none", fontSize: 14, fontWeight: 700 }} />
          </div>
        </div>

        {/* List */}
        <div style={{ display: "grid", gap: 12, paddingBottom: 100 }}>
          {filtered.map(r => {
            const isSelected = selectedIds.includes(r.storeId);
            const asset = ASSET_MASTER.find(a => a.assetId === r.assetId);
            return (
              <div key={r.storeId} onClick={() => { setSheetMode("edit"); setDraft(r); setSheetOpen(true); }} style={{ background: isSelected ? "#f5f3ff" : "#fff", border: `2px solid ${isSelected ? "#4f46e5" : "#e2e8f0"}`, borderRadius: 24, padding: "20px 24px", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 20, cursor: "pointer" }}>
                <div onClick={(e) => { e.stopPropagation(); setSelectedIds(isSelected ? selectedIds.filter(id => id !== r.storeId) : [...selectedIds, r.storeId]); }} style={{ width: 28, height: 28, borderRadius: 8, border: "2px solid #e2e8f0", background: isSelected ? "#4f46e5" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>
                  {isSelected && <Check size={18} />}
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>{r.name}</h3>
                    <Chip tone="indigo">{r.brandName}</Chip>
                    <Chip>Code:{r.clubCode}</Chip>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                    <span>{r.corporateName}</span><span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileStack size={14}/> {asset?.name || "未設定"}</span><span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={14}/> {r.emails?.length || 0}件の連絡先</span>
                  </div>
                </div>
                <Pencil size={18} style={{ color: "#cbd5e1" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#1e293b", padding: "12px 24px", borderRadius: 20, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{selectedIds.length}件選択中</span>
          <button onClick={() => setBatchModalOpen(true)} style={{ background: "#4f46e5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>アセット一括適用</button>
          <X size={20} style={{ color: "#94a3b8", cursor: "pointer" }} onClick={() => setSelectedIds([])} />
        </div>
      )}

      {/* Edit Sheet */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ flex: 1 }} onClick={() => setSheetOpen(false)} />
          <div style={{ width: "100%", maxWidth: 600, background: "#fff", height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontWeight: 950 }}>{sheetMode === "create" ? "店舗新規登録" : "店舗編集"}</h2>
              <X onClick={() => setSheetOpen(false)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ padding: "32px", overflowY: "auto", display: "grid", gap: 24, alignContent: "start" }}>
              
              <SelectBox label="適用アセット" options={ASSET_MASTER.map(a => a.name)} value={ASSET_MASTER.find(a => a.assetId === draft.assetId)?.name || ""} onChange={(val: string) => setDraft({...draft, assetId: ASSET_MASTER.find(a => a.name === val)?.assetId})} />
              
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>店舗名</label>
                <input value={draft.name || ""} onChange={e => setDraft({...draft, name: e.target.value})} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800 }} />
              </div>
              
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900 }}>クラブコード</label>
                <input type="number" value={draft.clubCode || ""} onChange={e => setDraft({...draft, clubCode: Number(e.target.value)})} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", fontWeight: 800 }} />
              </div>

              {/* ✅ メールアドレス複数追加セクション */}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 12, fontWeight: 900 }}>通知先メールアドレス</label>
                  <button onClick={addEmailField} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Plus size={14} /> 追加
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(draft.emails || []).map((email, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Mail size={16} style={{ position: "absolute", left: 12, top: 15, color: "#94a3b8" }} />
                        <input 
                          type="email" 
                          value={email} 
                          onChange={e => updateEmail(idx, e.target.value)} 
                          placeholder="store@example.com"
                          style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid #e2e8f0", paddingLeft: 38, paddingRight: 12, fontWeight: 700, fontSize: 14 }} 
                        />
                      </div>
                      {/* 1つ目のフィールドかつ唯一のフィールドでなければ削除可能 */}
                      <button 
                        onClick={() => removeEmailField(idx)} 
                        disabled={(draft.emails || []).length === 1 && idx === 0}
                        style={{ width: 46, height: 46, borderRadius: 12, border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", display: "grid", placeItems: "center", cursor: "pointer" }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <SelectBox label="所属ブランド" options={BRANDS} value={draft.brandName} onChange={(v: any) => setDraft({...draft, brandName: v})} />
              <SelectBox label="運営法人" options={CORPORATES} value={draft.corporateName} onChange={(v: any) => setDraft({...draft, corporateName: v})} />
              
              {sheetMode === "edit" && (
                <button onClick={() => deleteStore(draft.storeId!)} style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2", padding: "12px", borderRadius: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}><Trash2 size={16}/> 店舗を削除</button>
              )}
            </div>
            <div style={{ padding: "24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", gap: 12 }}>
              <button onClick={() => setSheetOpen(false)} style={{ flex: 1, height: 50, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer" }}>キャンセル</button>
              <button onClick={saveStore} style={{ flex: 2, height: 50, borderRadius: 12, background: "#1e293b", color: "#fff", fontWeight: 900, cursor: "pointer" }}>保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {batchModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center" }}>
          <div style={{ background: "#fff", width: 400, borderRadius: 24, padding: "32px", display: "grid", gap: 20 }}>
            <h3 style={{ margin: 0, textAlign: "center", fontWeight: 950 }}>アセットを一括適用</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {ASSET_MASTER.map(a => (
                <button key={a.assetId} onClick={() => setBatchAssetId(a.assetId)} style={{ padding: "16px", borderRadius: 12, border: "2px solid", borderColor: batchAssetId === a.assetId ? "#4f46e5" : "#f1f5f9", background: batchAssetId === a.assetId ? "#f5f3ff" : "#fff", textAlign: "left", cursor: "pointer", fontWeight: 800 }}>{a.name}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setBatchModalOpen(false)} style={{ height: 46, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer" }}>戻る</button>
              <button onClick={applyBatchAsset} style={{ height: 46, borderRadius: 12, background: "#4f46e5", color: "#fff", fontWeight: 900, cursor: "pointer" }}>適用する</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}