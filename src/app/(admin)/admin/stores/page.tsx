"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Store,
  Search,
  Plus,
  SlidersHorizontal,
  Pencil,
  CheckCircle2,
  XCircle,
  Archive,
  X,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

/** =========================
 * Types
 * ========================= */
type StoreStatus = "active" | "inactive" | "archived";
type BrandName = "JOYFIT" | "FIT365";

type StoreRow = {
  storeId: string; // ✅ 自動採番
  clubCode: number; // ✅ 数値のみ
  name: string;

  brandName: BrandName;
  businessTypeName: string;
  companyName: string;
  corporateName: string;

  status: StoreStatus;

  updatedAt?: string;
  updatedBy?: string;
  version?: number;
};

/** =========================
 * Masters (mock)
 * 本番はDBで管理
 * ========================= */
const BRANDS: BrandName[] = ["JOYFIT", "FIT365"];
const BUSINESS_TYPES_BY_BRAND: Record<BrandName, string[]> = {
  JOYFIT: ["JOYFIT24", "JOYFIT LITE", "JOYFIT+", "JOYFIT24 WOMEN"],
  FIT365: ["FIT365", "FIT365 Premium", "FIT365 Express"],
};
const COMPANIES = ["第1カンパニー", "第2カンパニー", "HQカンパニー", "デジタルソリューションズ"];
const CORPORATES = ["株式会社オカモト", "株式会社ヤマウチ", "株式会社〇〇", "株式会社△△"];

/** =========================
 * Mock data
 * ========================= */
const MOCK: StoreRow[] = [
  {
    storeId: "S001",
    clubCode: 306,
    name: "札幌大通",
    brandName: "JOYFIT",
    businessTypeName: "JOYFIT24",
    companyName: "第1カンパニー",
    corporateName: "株式会社オカモト",
    status: "active",
    version: 1,
  },
  {
    storeId: "S002",
    clubCode: 216,
    name: "仙台駅前",
    brandName: "JOYFIT",
    businessTypeName: "JOYFIT24",
    companyName: "第2カンパニー",
    corporateName: "株式会社ヤマウチ",
    status: "active",
    version: 1,
  },
  {
    storeId: "S003",
    clubCode: 565,
    name: "新宿西口",
    brandName: "FIT365",
    businessTypeName: "FIT365",
    companyName: "HQカンパニー",
    corporateName: "株式会社〇〇",
    status: "inactive",
    version: 2,
  },
];

/** =========================
 * Utils
 * ========================= */
function nowISO() {
  return new Date().toISOString();
}

function lockBodyScroll(lock: boolean) {
  const body = document.body;
  if (lock) {
    const scrollY = window.scrollY;
    body.dataset.scrollY = String(scrollY);
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  } else {
    const y = Number(body.dataset.scrollY || "0");
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    delete body.dataset.scrollY;
    window.scrollTo(0, y);
  }
}

function statusMeta(s: StoreStatus) {
  if (s === "active") return { label: "有効", sub: "表示中", bg: "rgba(52,199,89,.12)", icon: <CheckCircle2 size={16} /> };
  if (s === "inactive") return { label: "無効", sub: "非表示", bg: "rgba(255,59,48,.10)", icon: <XCircle size={16} /> };
  return { label: "保管", sub: "アーカイブ", bg: "rgba(142,142,147,.14)", icon: <Archive size={16} /> };
}

/** 店舗ID自動採番：S001, S002 ... の最大+1 */
function generateNextStoreId(existing: StoreRow[]) {
  let max = 0;
  for (const r of existing) {
    const m = r.storeId.match(/^S(\d+)$/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  return "S" + String(next).padStart(3, "0");
}

/** =========================
 * UI Primitives
 * ========================= */
const cardStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(15,17,21,.08)",
  background: "rgba(255,255,255,.82)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 24px 60px rgba(15,17,21,.10)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 16,
  border: "1px solid rgba(15,17,21,.10)",
  background: "rgba(255,255,255,.92)",
  padding: "0 12px",
  fontWeight: 850,
  outline: "none",
};

const softButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(15,17,21,.10)",
  background: "rgba(255,255,255,.80)",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

function Chip(props: { children: React.ReactNode; tone?: "default" | "muted" }) {
  const muted = props.tone === "muted";
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(15,17,21,.10)",
        background: muted ? "rgba(15,17,21,.04)" : "rgba(255,255,255,.80)",
        opacity: 0.92,
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {props.children}
    </div>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.7 }}>{props.label}</div>
        {props.hint && <div style={{ fontSize: 11, fontWeight: 850, opacity: 0.45 }}>{props.hint}</div>}
      </div>
      {props.children}
    </label>
  );
}

function SectionCard(props: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 22,
        border: "1px solid rgba(15,17,21,.08)",
        background: "rgba(255,255,255,.82)",
        boxShadow: "0 16px 40px rgba(15,17,21,.08)",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>{props.title}</div>
        {props.desc && <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>{props.desc}</div>}
      </div>
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </section>
  );
}

/** =========================
 * Search Select (Combobox)
 * - クリックで候補表示
 * - 入力で絞り込み
 * - 候補クリックで確定
 * ========================= */
function SearchSelect(props: {
  label: string;
  hint?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const { label, hint, value, options, placeholder, onChange } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = options;
    if (!t) return base.slice(0, 30);
    return base.filter((x) => x.toLowerCase().includes(t)).slice(0, 30);
  }, [q, options]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  return (
    <Field label={label} hint={hint}>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => {
            setOpen((p) => !p);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            ...inputStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            cursor: "pointer",
          }}
          aria-expanded={open}
        >
          <div style={{ minWidth: 0, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ opacity: value ? 1 : 0.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value || placeholder || "選択してください"}
            </div>
          </div>
          <ChevronRight size={16} style={{ opacity: 0.45 }} aria-hidden />
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              zIndex: 80,
              left: 0,
              right: 0,
              top: 50,
              borderRadius: 18,
              border: "1px solid rgba(15,17,21,.10)",
              background: "rgba(255,255,255,.96)",
              boxShadow: "0 24px 60px rgba(15,17,21,.16)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 10, borderBottom: "1px solid rgba(15,17,21,.08)" }}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="検索して選択"
                style={{
                  ...inputStyle,
                  height: 40,
                  borderRadius: 14,
                  padding: "0 10px",
                }}
              />
            </div>

            <div style={{ maxHeight: 260, overflow: "auto", padding: 6 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, fontWeight: 850, opacity: 0.65 }}>候補がありません</div>
              ) : (
                filtered.map((opt) => {
                  const active = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => pick(opt)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 10px",
                        borderRadius: 14,
                        border: "1px solid transparent",
                        background: active ? "rgba(47,140,230,.10)" : "transparent",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}

/** =========================
 * Left Sheet (Brand navigator / filters)
 * ブランドごとに分かれる、ここが「左シート」
 * ========================= */
function LeftBrandSheet(props: {
  open: boolean;
  brands: BrandName[];
  countsByBrand: Record<BrandName, number>;
  currentBrand: BrandName | "all";
  currentStatus: StoreStatus | "all";
  onChangeBrand: (b: BrandName | "all") => void;
  onChangeStatus: (s: StoreStatus | "all") => void;
  onClose: () => void;
}) {
  const { open, brands, countsByBrand, currentBrand, currentStatus, onChangeBrand, onChangeStatus, onClose } = props;

  useEffect(() => {
    if (!open) return;
    lockBodyScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lockBodyScroll(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pickBrand = (b: BrandName | "all") => {
    onChangeBrand(b);
    onClose();
  };

  const pickStatus = (s: StoreStatus | "all") => {
    onChangeStatus(s);
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 55 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "min(420px, 92vw)",
          background: "rgba(255,255,255,.92)",
          borderRight: "1px solid rgba(15,17,21,.10)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "24px 0 60px rgba(15,17,21,.18)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>フィルター</div>
            <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>ブランド別ナビ + 状態</div>
          </div>

          <button type="button" onClick={onClose} style={softButton}>
            <X size={16} />
            閉じる
          </button>
        </div>

        <div style={{ padding: "0 14px 14px", overflow: "auto", display: "grid", gap: 12 }}>
          <SectionCard title="ブランド" desc="ブランドごとに分けて表示">
            <BrandItem
              label="すべて"
              selected={currentBrand === "all"}
              count={Object.values(countsByBrand).reduce((a, b) => a + b, 0)}
              onClick={() => pickBrand("all")}
            />
            {brands.map((b) => (
              <BrandItem
                key={b}
                label={b}
                selected={currentBrand === b}
                count={countsByBrand[b] ?? 0}
                onClick={() => pickBrand(b)}
              />
            ))}
          </SectionCard>

          <SectionCard title="状態" desc="一覧の表示状態を切り替え">
            <PillRow
              items={[
                { key: "all", label: "すべて" },
                { key: "active", label: "有効" },
                { key: "inactive", label: "無効" },
                { key: "archived", label: "保管" },
              ]}
              value={currentStatus}
              onChange={(k) => pickStatus(k as any)}
            />
          </SectionCard>
        </div>

        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(15,17,21,.10)",
            background: "rgba(255,255,255,.86)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChangeBrand("all");
              onChangeStatus("all");
              onClose();
            }}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 16,
              border: "1px solid rgba(15,17,21,.10)",
              background: "rgba(15,17,21,.04)",
              cursor: "pointer",
              fontWeight: 950,
            }}
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandItem(props: { label: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 12px",
        borderRadius: 18,
        border: "1px solid rgba(15,17,21,.10)",
        background: props.selected ? "rgba(47,140,230,.10)" : "rgba(255,255,255,.70)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        fontWeight: 950,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, background: props.selected ? "rgba(47,140,230,.70)" : "rgba(15,17,21,.18)" }} />
        {props.label}
      </div>
      <Chip tone="muted">{props.count}</Chip>
    </button>
  );
}

function PillRow(props: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {props.items.map((it) => {
        const active = it.key === props.value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => props.onChange(it.key)}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(15,17,21,.10)",
              background: active ? "rgba(47,140,230,.12)" : "rgba(255,255,255,.72)",
              cursor: "pointer",
              fontWeight: 950,
            }}
            aria-pressed={active}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** =========================
 * Right Sheet (Create/Edit)
 * - 店舗IDは自動採番（Create時にプレビュー）
 * - セレクタは検索で選択
 * ========================= */
type SheetMode = "create" | "edit";
type StoreDraft = {
  clubCode: string;
  name: string;
  brandName: BrandName;
  businessTypeName: string;
  companyName: string;
  corporateName: string;
  status: StoreStatus;
};

function toDraft(row?: StoreRow): StoreDraft {
  if (!row) {
    return {
      clubCode: "",
      name: "",
      brandName: "JOYFIT",
      businessTypeName: BUSINESS_TYPES_BY_BRAND.JOYFIT[0],
      companyName: COMPANIES[0],
      corporateName: CORPORATES[0],
      status: "active",
    };
  }
  return {
    clubCode: String(row.clubCode),
    name: row.name,
    brandName: row.brandName,
    businessTypeName: row.businessTypeName,
    companyName: row.companyName,
    corporateName: row.corporateName,
    status: row.status,
  };
}

function validateDraft(d: StoreDraft, existing: StoreRow[], mode: SheetMode, editingStoreId?: string) {
  const errors: string[] = [];
  const ccRaw = d.clubCode.trim();
  if (!ccRaw) errors.push("クラブコードは必須です");
  if (ccRaw && !/^\d+$/.test(ccRaw)) errors.push("クラブコードは数値のみです");
  const cc = ccRaw ? Number(ccRaw) : NaN;
  if (ccRaw && Number.isFinite(cc) && cc <= 0) errors.push("クラブコードは正の数にしてください");

  const name = d.name.trim();
  if (!name) errors.push("店舗名は必須です");

  // 重複（clubCode）
  const clubCodeDup =
    ccRaw &&
    existing.some((r) => r.clubCode === cc && (mode === "create" ? true : r.storeId !== editingStoreId));
  if (clubCodeDup) errors.push("クラブコードが既に存在します");

  return errors;
}

function RightStoreSheet(props: {
  open: boolean;
  mode: SheetMode;
  initial?: StoreRow;
  existing: StoreRow[];
  onClose: () => void;
  onSave: (row: StoreRow) => Promise<void> | void;
}) {
  const { open, mode, initial, existing, onClose, onSave } = props;

  const [draft, setDraft] = useState<StoreDraft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  // Create時の「自動採番プレビュー」
  const previewId = useMemo(() => {
    if (mode === "edit" && initial) return initial.storeId;
    return generateNextStoreId(existing);
  }, [mode, initial, existing]);

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(initial));
    setTouched(false);
    setSaving(false);
    lockBodyScroll(true);

    setTimeout(() => firstRef.current?.focus(), 0);
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      lockBodyScroll(false);
    };
  }, [open, initial, onClose]);

  // ブランドが変わったら業態のデフォルトをそのブランドの先頭に寄せる
  useEffect(() => {
    const list = BUSINESS_TYPES_BY_BRAND[draft.brandName];
    if (!list.includes(draft.businessTypeName)) {
      setDraft((p) => ({ ...p, businessTypeName: list[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.brandName]);

  if (!open) return null;

  const errors = touched ? validateDraft(draft, existing, mode, initial?.storeId) : [];
  const canSave = errors.length === 0 && !saving;

  const set = (patch: Partial<StoreDraft>) => {
    setTouched(true);
    setDraft((p) => ({ ...p, ...patch }));
  };

  const submit = async () => {
    setTouched(true);
    const errs = validateDraft(draft, existing, mode, initial?.storeId);
    if (errs.length) return;

    const row: StoreRow = {
      storeId: mode === "edit" && initial ? initial.storeId : previewId, // ✅ 自動採番
      clubCode: Number(draft.clubCode.trim()),
      name: draft.name.trim(),
      brandName: draft.brandName,
      businessTypeName: draft.businessTypeName,
      companyName: draft.companyName,
      corporateName: draft.corporateName,
      status: draft.status,
      updatedAt: nowISO(),
      updatedBy: "admin",
      version: (initial?.version ?? 0) + 1,
    };

    setSaving(true);
    try {
      await onSave(row);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "店舗を追加" : "店舗を編集";
  const sub = mode === "create" ? `新規作成（ID: ${previewId}）` : `編集：${initial?.name ?? ""}`;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(560px, 100vw)",
          background: "rgba(255,255,255,.92)",
          borderLeft: "1px solid rgba(15,17,21,.10)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "-24px 0 60px rgba(15,17,21,.18)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* header */}
        <div style={{ padding: "14px 14px 10px", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>{title}</div>
              <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>{sub}</div>
            </div>

            <button type="button" onClick={onClose} style={softButton}>
              <X size={16} />
              閉じる
            </button>
          </div>

          {/* ID preview pill */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone="muted">店舗ID：{previewId}</Chip>
            <Chip tone="muted">更新：{mode === "edit" ? "上書き" : "新規追加"}</Chip>
          </div>

          {touched && errors.length > 0 && (
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,59,48,.22)",
                background: "rgba(255,59,48,.06)",
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 850,
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 6 }}>入力を確認してください</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4, opacity: 0.9 }}>
                {errors.slice(0, 4).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {errors.length > 4 && <li>ほか {errors.length - 4} 件</li>}
              </ul>
            </div>
          )}
        </div>

        {/* body */}
        <div style={{ padding: "0 14px 14px", overflow: "auto" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <SectionCard title="必須" desc="店舗を特定する基本情報">
              <Field label="クラブコード" hint="数値のみ（例：306）">
                <input
                  ref={firstRef}
                  inputMode="numeric"
                  pattern="\d*"
                  value={draft.clubCode}
                  onChange={(e) => set({ clubCode: e.target.value })}
                  placeholder="306"
                  style={inputStyle}
                />
              </Field>

              <Field label="店舗名" hint="表示名">
                <input
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="札幌大通"
                  style={inputStyle}
                />
              </Field>
            </SectionCard>

            <SectionCard title="分類" desc="検索や集計に効く（検索付きセレクタ）">
              <SearchSelect
                label="ブランド"
                value={draft.brandName}
                options={BRANDS}
                onChange={(v) => set({ brandName: v as BrandName })}
              />

              <SearchSelect
                label="業態"
                value={draft.businessTypeName}
                options={BUSINESS_TYPES_BY_BRAND[draft.brandName]}
                onChange={(v) => set({ businessTypeName: v })}
              />

              <SearchSelect
                label="カンパニー名"
                value={draft.companyName}
                options={COMPANIES}
                onChange={(v) => set({ companyName: v })}
              />

              <SearchSelect
                label="企業名"
                value={draft.corporateName}
                options={CORPORATES}
                onChange={(v) => set({ corporateName: v })}
              />
            </SectionCard>

            <SectionCard title="状態" desc="表示/非表示/保管">
              <PillRow
                items={[
                  { key: "active", label: "有効" },
                  { key: "inactive", label: "無効" },
                  { key: "archived", label: "保管" },
                ]}
                value={draft.status}
                onChange={(k) => set({ status: k as StoreStatus })}
              />
            </SectionCard>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(15,17,21,.10)",
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,.86)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.6 }}>
            店舗IDは自動採番（{previewId}）
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ ...softButton, height: 44 }}>
              キャンセル
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!canSave}
              style={{
                height: 44,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(15,17,21,.10)",
                background: "rgba(47,140,230,.14)",
                cursor: canSave ? "pointer" : "not-allowed",
                fontWeight: 950,
                opacity: canSave ? 1 : 0.55,
                minWidth: 120,
              }}
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** =========================
 * Page
 * ========================= */
export default function AdminStoresPage() {
  const [rows, setRows] = useState<StoreRow[]>(MOCK);

  // header search
  const [q, setQ] = useState("");

  // left sheet filters
  const [leftOpen, setLeftOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState<BrandName | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StoreStatus | "all">("all");

  // right sheet (create/edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<StoreRow | undefined>(undefined);

  const countsByBrand = useMemo(() => {
    const base: Record<BrandName, number> = { JOYFIT: 0, FIT365: 0 };
    for (const r of rows) base[r.brandName] += 1;
    return base;
  }, [rows]);

  const openCreate = () => {
    setSheetMode("create");
    setEditing(undefined);
    setSheetOpen(true);
  };

  const openEdit = (row: StoreRow) => {
    setSheetMode("edit");
    setEditing(row);
    setSheetOpen(true);
  };

  const filtered = useMemo(() => {
    let out = rows.slice();

    // left filters
    if (brandFilter !== "all") out = out.filter((r) => r.brandName === brandFilter);
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);

    // search
    const t = q.trim().toLowerCase();
    if (!t) return out;
    return out.filter((r) => {
      return (
        r.storeId.toLowerCase().includes(t) ||
        String(r.clubCode).includes(t) ||
        r.name.toLowerCase().includes(t) ||
        r.brandName.toLowerCase().includes(t) ||
        r.businessTypeName.toLowerCase().includes(t) ||
        r.companyName.toLowerCase().includes(t) ||
        r.corporateName.toLowerCase().includes(t)
      );
    });
  }, [rows, brandFilter, statusFilter, q]);

  const saveRow = async (row: StoreRow) => {
    // 本番はここを API（POST/PUT）に差し替え
    if (sheetMode === "create") {
      // 競合防止：保存時点で同じstoreIdが居たら再採番
      let storeId = row.storeId;
      if (rows.some((r) => r.storeId === storeId)) {
        storeId = generateNextStoreId(rows);
      }
      setRows((prev) => [{ ...row, storeId }, ...prev]);
      return;
    }
    setRows((prev) => prev.map((r) => (r.storeId === row.storeId ? { ...r, ...row } : r)));
  };

  const toggleActiveQuick = (storeId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.storeId !== storeId) return r;
        const next: StoreStatus =
          r.status === "active" ? "inactive" : r.status === "inactive" ? "active" : "inactive";
        return { ...r, status: next, updatedAt: nowISO(), version: (r.version ?? 0) + 1 };
      })
    );
  };

  return (
    <main
      style={{
        minHeight: "100svh",
        padding: "18px 14px 28px",
        background:
          "radial-gradient(1200px 800px at 10% 0%, rgba(47,140,230,.10) 0%, transparent 55%)," +
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(245,247,250,1) 100%)",
      }}
    >
      <LeftBrandSheet
        open={leftOpen}
        brands={BRANDS}
        countsByBrand={countsByBrand}
        currentBrand={brandFilter}
        currentStatus={statusFilter}
        onChangeBrand={setBrandFilter}
        onChangeStatus={setStatusFilter}
        onClose={() => setLeftOpen(false)}
      />

      <RightStoreSheet
        open={sheetOpen}
        mode={sheetMode}
        initial={editing}
        existing={rows}
        onClose={() => setSheetOpen(false)}
        onSave={saveRow}
      />

      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        {/* Header card */}
        <section style={cardStyle}>
          <div
            style={{
              padding: "14px 14px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,.90)",
                  border: "1px solid rgba(15,17,21,.10)",
                }}
                aria-hidden
              >
                <Store size={18} />
              </div>

              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>店舗管理</div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7 }}>
                  {filtered.length} / {rows.length}
                  {brandFilter !== "all" && <> • {brandFilter}</>}
                  {statusFilter !== "all" && <> • {statusMeta(statusFilter).label}</>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setLeftOpen(true)} style={softButton} aria-label="フィルターを開く">
                <SlidersHorizontal size={16} />
                フィルター
              </button>

              <button type="button" onClick={openCreate} style={softButton}>
                <Plus size={16} />
                店舗を追加
              </button>
            </div>
          </div>

          {/* search */}
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                }}
                aria-hidden
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="検索（店舗ID / クラブコード / 店舗名 / ブランド / 業態 / カンパニー / 企業名）"
                style={{ ...inputStyle, padding: "0 12px 0 38px" }}
              />
            </div>
          </div>
        </section>

        {/* List card */}
        <section style={cardStyle}>
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 800 }}>該当する店舗がありません</div>
            ) : (
              filtered.map((r) => {
                const meta = statusMeta(r.status);
                return (
                  <button
                    key={r.storeId}
                    type="button"
                    onClick={() => openEdit(r)} // ✅ 行クリックで編集
                    style={{
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 12px",
                      borderRadius: 18,
                      border: "1px solid rgba(15,17,21,.08)",
                      background: "rgba(255,255,255,.75)",
                      cursor: "pointer",
                    }}
                    aria-label={`${r.name} を編集`}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* title row */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 950 }}>{r.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>{r.storeId}</div>
                        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>club:{r.clubCode}</div>
                      </div>

                      {/* chips */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <Chip>{r.brandName}</Chip>
                        <Chip>{r.businessTypeName}</Chip>
                        <Chip>{r.companyName}</Chip>
                        <Chip>{r.corporateName}</Chip>
                      </div>

                      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(15,17,21,.10)",
                            background: meta.bg,
                            fontWeight: 950,
                            fontSize: 12,
                          }}
                        >
                          {meta.icon}
                          {meta.label} • {meta.sub}
                        </div>

                        {r.updatedAt && (
                          <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.55 }}>
                            更新: {new Date(r.updatedAt).toLocaleString("ja-JP")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* actions */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEdit(r);
                        }}
                        style={softButton}
                        aria-label="編集"
                      >
                        <Pencil size={16} />
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleActiveQuick(r.storeId);
                        }}
                        style={{
                          ...softButton,
                          background: meta.bg,
                        }}
                        aria-label={r.status === "active" ? "無効化" : "有効化"}
                      >
                        {meta.icon}
                        {r.status === "active" ? "無効" : "有効"}
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
