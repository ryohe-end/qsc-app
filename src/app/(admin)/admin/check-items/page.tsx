// src/app/(admin)/admin/qsc/assets/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Plus,
  Search,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Home,
  Trash2,
  CheckCircle2,
  ChevronRight,
  PauseCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";

/** =========================
 * Types
 * ========================= */
type AnswerType = "okng" | "scale" | "yesno";

type QscQuestion = {
  questionId: string;

  /** ✅ 表形式にしたい */
  place: string; // 場所（館外/入口/マシン/トイレ…）
  no: number; // No（場所内の番号）

  category: "Q" | "S" | "C"; // QSC
  text: string; // 設問内容

  answerType: AnswerType;
  weight: number;
  required: boolean;

  photoRequired?: boolean;
  commentRequired?: boolean;

  targetScope: {
    brand?: string[];
    storeType?: string[];
    businessType?: string[];
  };

  isActive: boolean;
};

type AssetTarget = {
  corporate?: string;
  businessType?: string;
  brand?: string[]; // 複数
  storeType?: string[]; // 直営/FC
};

type Asset = {
  assetId: string;
  name: string;
  description?: string;
  isActive: boolean;
  target: AssetTarget;

  /** ✅ アセットは「採用する設問」だけ（順番はここで確定） */
  questionIds: string[];

  updatedAt: string;
};

/** =========================
 * Mock Masters
 * ========================= */
const BRAND_OPTIONS = ["JOYFIT", "FIT365"];
const STORETYPE_OPTIONS = ["直営", "FC"];
const BUSINESS_TYPE_OPTIONS = ["フィットネス", "24hジム", "クリニック", "その他"];
const CORPORATE_OPTIONS = ["山内グループ", "岡本グループ", "自社", "FC本部", "その他"];

const QUESTIONS_MASTER_MOCK: QscQuestion[] = [
  {
    questionId: "Q001",
    place: "館外",
    no: 1,
    category: "Q",
    text: "外壁/外灯/花壇/お客様動線などに破損箇所はないか",
    answerType: "okng",
    weight: 1,
    required: true,
    targetScope: { brand: ["JOYFIT", "FIT365"], storeType: ["直営", "FC"], businessType: ["フィットネス", "24hジム"] },
    isActive: true,
  },
  {
    questionId: "Q002",
    place: "館外",
    no: 2,
    category: "C",
    text: "入口周辺にゴミ・吸い殻・汚れはないか",
    answerType: "scale",
    weight: 2,
    required: true,
    photoRequired: false,
    commentRequired: false,
    targetScope: { brand: ["JOYFIT", "FIT365"], storeType: ["直営", "FC"], businessType: ["フィットネス"] },
    isActive: true,
  },
  {
    questionId: "Q003",
    place: "入口",
    no: 1,
    category: "S",
    text: "スタッフの挨拶がある",
    answerType: "yesno",
    weight: 2,
    required: true,
    targetScope: { brand: ["JOYFIT"], storeType: ["直営"], businessType: ["フィットネス"] },
    isActive: true,
  },
  {
    questionId: "Q004",
    place: "マシン",
    no: 1,
    category: "C",
    text: "マシンが拭き上げされている",
    answerType: "scale",
    weight: 3,
    required: true,
    targetScope: { brand: ["JOYFIT", "FIT365"], storeType: ["直営", "FC"], businessType: ["24hジム"] },
    isActive: true,
  },
  {
    questionId: "Q005",
    place: "トイレ",
    no: 1,
    category: "C",
    text: "トイレットペーパーが補充されている",
    answerType: "okng",
    weight: 1,
    required: false,
    targetScope: { brand: ["JOYFIT", "FIT365"], storeType: ["直営", "FC"], businessType: ["フィットネス", "24hジム"] },
    isActive: true,
  },
];

const ASSET_MOCK: Asset[] = [
  {
    assetId: "A001",
    name: "JOYFIT_直営_標準",
    description: "直営向けの標準QSCチェック（場所/カテゴリは設問マスタに従う）",
    isActive: true,
    target: { corporate: "自社", businessType: "フィットネス", brand: ["JOYFIT"], storeType: ["直営"] },
    questionIds: ["Q001", "Q002", "Q003", "Q005"],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

/** =========================
 * Utils
 * ========================= */
function nowISO() {
  return new Date().toISOString();
}
function fmtJP(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}
function genAssetId(existing: Asset[]) {
  let max = 0;
  for (const a of existing) {
    const m = a.assetId.match(/^A(\d+)$/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return "A" + String(max + 1).padStart(3, "0");
}
function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

/** =========================
 * UI Primitives
 * ========================= */
const pageBg: React.CSSProperties = {
  minHeight: "100svh",
  padding: "16px 14px 28px",
  background:
    "radial-gradient(1200px 800px at 10% 0%, rgba(47,140,230,.10) 0%, transparent 55%)," +
    "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(245,247,250,1) 100%)",
};

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,17,21,.08)",
  background: "rgba(255,255,255,.88)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 18px 50px rgba(15,17,21,.10)",
  overflow: "hidden",
};

const softBtn: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(15,17,21,.10)",
  background: "rgba(255,255,255,.86)",
  cursor: "pointer",
  fontWeight: 850,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const input: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,.12)",
  background: "#fff",
  padding: "0 12px",
  outline: "none",
  fontWeight: 800,
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 84,
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,.12)",
  background: "#fff",
  padding: "10px 12px",
  outline: "none",
  fontWeight: 800,
  lineHeight: 1.6,
  resize: "vertical",
};

function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "blue" | "green" | "red";
}) {
  const bg =
    tone === "blue"
      ? "rgba(59,130,246,.10)"
      : tone === "green"
      ? "rgba(52,199,89,.12)"
      : tone === "red"
      ? "rgba(255,59,48,.10)"
      : "rgba(15,17,21,.04)";

  const bd =
    tone === "blue"
      ? "rgba(59,130,246,.22)"
      : tone === "green"
      ? "rgba(52,199,89,.22)"
      : tone === "red"
      ? "rgba(255,59,48,.22)"
      : "rgba(15,17,21,.10)";

  const col = tone === "blue" ? "#1d4ed8" : tone === "red" ? "#be123c" : "#0f172a";

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        color: col,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, fontWeight: 850, opacity: 0.55 }}>{hint}</div>}
      </div>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...input,
        appearance: "none",
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, rgba(15,17,21,.55) 50%)," +
          "linear-gradient(135deg, rgba(15,17,21,.55) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 16px) calc(1em + 2px), calc(100% - 11px) calc(1em + 2px)",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** =========================
 * ✅ MultiSelect PillBox (画像っぽい：枠の中にピル)
 * ========================= */
function MultiSelectPillBox({
  label,
  options,
  value,
  onChange,
  placeholder = "検索して追加…",
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  const add = (v: string) => {
    if (value.includes(v)) return;
    onChange([...value, v]);
  };
  const clear = () => onChange([]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = options.filter((x) => !value.includes(x));
    if (!t) return list;
    return list.filter((x) => x.toLowerCase().includes(t));
  }, [q, options, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <Field label={label}>
      <div
        ref={wrapRef}
        style={{
          borderRadius: 14,
          border: "1px solid rgba(15,17,21,.12)",
          background: "rgba(255,255,255,.92)",
          padding: 10,
          display: "grid",
          gap: 8,
          position: "relative",
        }}
      >
        <div
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            minHeight: 46,
            borderRadius: 12,
            border: "1px solid rgba(15,17,21,.10)",
            background: "rgba(15,17,21,.02)",
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 0 }}>
            {value.map((v) => (
              <span
                key={v}
                style={{
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(59,130,246,.25)",
                  background: "rgba(59,130,246,.10)",
                  fontWeight: 900,
                  maxWidth: "100%",
                }}
                title={v}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "1px solid rgba(15,17,21,.10)",
                    background: "rgba(255,255,255,.75)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                  aria-label={`${v} を解除`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}

            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={value.length ? "" : placeholder}
              style={{
                flex: 1,
                minWidth: 140,
                height: 32,
                border: "none",
                outline: "none",
                background: "transparent",
                fontWeight: 900,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
                setQ("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid rgba(15,17,21,.10)",
                background: "rgba(255,255,255,.85)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                opacity: value.length ? 1 : 0.5,
              }}
              title="クリア"
              disabled={!value.length}
            >
              <X size={16} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid rgba(15,17,21,.10)",
                background: "rgba(255,255,255,.85)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
              title="候補を開く"
            >
              <ChevronRight
                size={16}
                style={{
                  transform: open ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .15s ease",
                  opacity: 0.8,
                }}
              />
            </button>
          </div>
        </div>

        {open && (
          <div
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              top: 70,
              zIndex: 50,
              borderRadius: 14,
              border: "1px solid rgba(15,17,21,.10)",
              background: "rgba(255,255,255,.98)",
              boxShadow: "0 18px 50px rgba(15,17,21,.18)",
              overflow: "hidden",
            }}
          >
            <div style={{ maxHeight: 240, overflow: "auto" }}>
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    add(opt);
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontWeight: 900,
                    borderBottom: "1px solid rgba(15,17,21,.06)",
                  }}
                >
                  {opt}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, fontWeight: 850, opacity: 0.65 }}>
                  追加できる候補がありません
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}

/** =========================
 * Question Picker Modal
 * - アセット側は「設問を選ぶだけ」
 * - 表示は 場所 / No / QSC / 設問内容
 * ========================= */
function QuestionPickerModal(props: {
  open: boolean;
  questions: QscQuestion[];
  pickedIds: string[];
  title: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { open, questions, pickedIds, title, onPick, onClose } = props;
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = questions.filter((x) => x.isActive);
    if (!t) return base;
    return base.filter((x) => {
      return (
        x.questionId.toLowerCase().includes(t) ||
        x.place.toLowerCase().includes(t) ||
        String(x.no).includes(t) ||
        x.category.toLowerCase().includes(t) ||
        x.text.toLowerCase().includes(t)
      );
    });
  }, [q, questions]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(980px, 94vw)",
          maxHeight: "82vh",
          background: "rgba(255,255,255,.96)",
          borderRadius: 18,
          border: "1px solid rgba(15,17,21,.10)",
          boxShadow: "0 28px 80px rgba(15,17,21,.22)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
        }}
      >
        <div
          style={{
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid rgba(15,17,21,.08)",
          }}
        >
          <div style={{ display: "grid", gap: 3 }}>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>検索して追加（追加済みは選べません）</div>
          </div>
          <button type="button" onClick={onClose} style={softBtn}>
            <X size={16} />
            閉じる
          </button>
        </div>

        <div style={{ padding: 14, borderBottom: "1px solid rgba(15,17,21,.08)" }}>
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
              placeholder="検索（場所 / No / QSC / 設問内容 / ID）"
              style={{ ...input, paddingLeft: 38 }}
            />
          </div>
        </div>

        <div style={{ padding: 12, overflow: "auto" }}>
          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(15,17,21,.10)",
              overflow: "hidden",
              background: "rgba(255,255,255,.90)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 70px 70px 1fr 120px",
                gap: 0,
                padding: "10px 12px",
                borderBottom: "1px solid rgba(15,17,21,.08)",
                fontSize: 12,
                fontWeight: 950,
                opacity: 0.75,
              }}
            >
              <div>場所</div>
              <div>No</div>
              <div>QSC</div>
              <div>設問内容</div>
              <div />
            </div>

            {filtered.map((qq) => {
              const already = pickedIds.includes(qq.questionId);
              return (
                <div
                  key={qq.questionId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 70px 70px 1fr 120px",
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(15,17,21,.06)",
                    alignItems: "center",
                    gap: 0,
                    opacity: already ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{qq.place}</div>
                  <div style={{ fontWeight: 950 }}>{qq.no}</div>
                  <div>
                    <Chip tone="blue">{qq.category}</Chip>
                  </div>
                  <div style={{ fontWeight: 900, lineHeight: 1.35 }}>
                    {qq.text}
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Chip tone="muted">{qq.questionId}</Chip>
                      <Chip tone="muted">{qq.answerType}</Chip>
                      <Chip tone="muted">w:{qq.weight}</Chip>
                      {qq.required && <Chip tone="green">必須</Chip>}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => !already && onPick(qq.questionId)}
                      style={{
                        ...softBtn,
                        height: 34,
                        padding: "0 10px",
                        background: already ? "rgba(15,17,21,.04)" : "rgba(47,140,230,.12)",
                        cursor: already ? "not-allowed" : "pointer",
                      }}
                    >
                      {already ? "追加済" : "追加"}
                      <ChevronRight size={16} style={{ opacity: 0.7 }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, fontWeight: 850, opacity: 0.65 }}>該当なし</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** =========================
 * Page
 * ========================= */
export default function AdminQscAssetsPage() {
  const [questions] = useState<QscQuestion[]>(() => QUESTIONS_MASTER_MOCK.slice());
  const [assets, setAssets] = useState<Asset[]>(() => ASSET_MOCK.slice());

  const [listQ, setListQ] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.assetId ?? null);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.assetId === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const [draft, setDraft] = useState<Asset | null>(selectedAsset ? structuredClone(selectedAsset) : null);
  const [dirty, setDirty] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);

  // D&D for asset question order
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedAsset) {
      setDraft(null);
      setDirty(false);
      return;
    }
    setDraft(structuredClone(selectedAsset) as Asset);
    setDirty(false);
  }, [selectedAssetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const questionMap = useMemo(() => {
    const m: Record<string, QscQuestion> = {};
    for (const q of questions) m[q.questionId] = q;
    return m;
  }, [questions]);

  const filteredAssets = useMemo(() => {
    const t = listQ.trim().toLowerCase();
    if (!t) return assets;
    return assets.filter((a) => {
      const corp = String(a.target.corporate || "").toLowerCase();
      const biz = String(a.target.businessType || "").toLowerCase();
      const brands = (a.target.brand || []).join(",").toLowerCase();
      const st = (a.target.storeType || []).join(",").toLowerCase();
      return (
        a.assetId.toLowerCase().includes(t) ||
        a.name.toLowerCase().includes(t) ||
        corp.includes(t) ||
        biz.includes(t) ||
        brands.includes(t) ||
        st.includes(t)
      );
    });
  }, [assets, listQ]);

  const setDraftPatch = (patch: Partial<Asset>) => {
    setDirty(true);
    setDraft((p) => (p ? ({ ...p, ...patch } as Asset) : p));
  };

  const setDraftTarget = (patch: Partial<AssetTarget>) => {
    setDirty(true);
    setDraft((p) => (p ? ({ ...p, target: { ...p.target, ...patch } } as Asset) : p));
  };

  const createNewAsset = () => {
    const id = genAssetId(assets);
    const base: Asset = {
      assetId: id,
      name: "",
      description: "",
      isActive: true,
      target: { corporate: "自社", businessType: "フィットネス", brand: [], storeType: [] },
      questionIds: [],
      updatedAt: nowISO(),
    };
    setAssets((prev) => [base, ...prev]);
    setSelectedAssetId(id);
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      alert("アセット名は必須です");
      return;
    }

    const normalized: Asset = {
      ...draft,
      name: draft.name.trim(),
      description: (draft.description || "").trim(),
      isActive: !!draft.isActive,
      target: {
        corporate: draft.target.corporate || "",
        businessType: draft.target.businessType || "",
        brand: uniq(draft.target.brand || []),
        storeType: uniq(draft.target.storeType || []),
      },
      questionIds: uniq(draft.questionIds || []),
      updatedAt: nowISO(),
    };

    setAssets((prev) => prev.map((a) => (a.assetId === normalized.assetId ? normalized : a)));
    setDirty(false);
  };

  const deleteAsset = (assetId: string) => {
    const ok = confirm("このアセットを削除しますか？（元に戻せません）");
    if (!ok) return;
    setAssets((prev) => prev.filter((a) => a.assetId !== assetId));
    if (selectedAssetId === assetId) {
      const next = assets.find((a) => a.assetId !== assetId)?.assetId ?? null;
      setSelectedAssetId(next);
    }
  };

  const toggleActive = () => {
    if (!draft) return;
    setDraftPatch({ isActive: !draft.isActive });
  };

  const addQuestion = (id: string) => {
    if (!draft) return;
    if (draft.questionIds.includes(id)) return;
    setDraftPatch({ questionIds: [...draft.questionIds, id] });
  };

  const removeQuestion = (id: string) => {
    if (!draft) return;
    setDraftPatch({ questionIds: draft.questionIds.filter((x) => x !== id) });
  };

  const reorder = (fromId: string, toId: string) => {
    if (!draft) return;
    if (fromId === toId) return;
    const list = draft.questionIds.slice();
    const from = list.indexOf(fromId);
    const to = list.indexOf(toId);
    if (from < 0 || to < 0) return;
    const [pick] = list.splice(from, 1);
    list.splice(to, 0, pick);
    setDraftPatch({ questionIds: list });
  };

  /** ✅ 表示用：アセットの順番通りに設問を解決 → 場所→No も併記 */
  const assetQuestions = useMemo(() => {
    if (!draft) return [];
    return (draft.questionIds || [])
      .map((id) => questionMap[id])
      .filter(Boolean)
      .map((q) => q as QscQuestion);
  }, [draft, questionMap]);

  /** ✅ プレビュー＆表：場所でグルーピング（表示は place -> no） */
  const groupedByPlace = useMemo(() => {
    const map = new Map<string, QscQuestion[]>();
    for (const q of assetQuestions) {
      const key = q.place || "未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    // within place: No asc
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.no ?? 9999) - (b.no ?? 9999));
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [assetQuestions]);

  const gridStyle: React.CSSProperties = {
    maxWidth: 1600,
    margin: "0 auto",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "340px minmax(560px, 1fr) 420px",
    alignItems: "start",
  };

  // run寄せの選択UI（プレビュー用）
  const previewChoice: React.CSSProperties = {
    height: 36,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(15,17,21,.10)",
    background: "rgba(255,255,255,.92)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 950,
    fontSize: 12,
  };

  return (
    <main style={pageBg}>
      {/* top bar */}
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto 12px",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: "1px solid rgba(15,17,21,.10)",
              background: "rgba(255,255,255,.86)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <LayoutGrid size={18} />
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>QSC アセット作成</div>
            <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>
              ※ 場所/カテゴリは設問マスタに保持（アセットでは選ばない）
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <button type="button" style={softBtn}>
              <Home size={16} />
              Home
            </button>
          </Link>
        </div>
      </div>

      <div style={gridStyle}>
        {/* LEFT */}
        <section style={{ ...card, height: "calc(100svh - 120px)", display: "grid", gridTemplateRows: "auto auto 1fr" }}>
          {/* ✅ 新規作成ボタンを「アセット一覧」に移動 */}
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(15,17,21,.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950 }}>アセット一覧</div>
              <Chip tone="muted">{filteredAssets.length}件</Chip>
            </div>

            <button
              type="button"
              onClick={createNewAsset}
              style={{ ...softBtn, height: 34, padding: "0 10px", background: "rgba(47,140,230,.12)" }}
              title="新規アセット"
            >
              <Plus size={16} />
              新規
            </button>
          </div>

          <div style={{ padding: 14, borderBottom: "1px solid rgba(15,17,21,.08)" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} aria-hidden />
              <input value={listQ} onChange={(e) => setListQ(e.target.value)} placeholder="検索（名前/企業/業態/ブランド/直営FC）" style={{ ...input, paddingLeft: 38 }} />
            </div>
          </div>

          <div style={{ padding: 12, overflow: "auto" }}>
            <div style={{ display: "grid", gap: 10 }}>
              {filteredAssets.map((a) => {
                const sel = a.assetId === selectedAssetId;
                const corp = a.target.corporate || "未設定";
                const biz = a.target.businessType || "未設定";
                const brands = (a.target.brand || []).length ? (a.target.brand || []).join(",") : "未設定";
                const st = (a.target.storeType || []).length ? (a.target.storeType || []).join(",") : "未設定";

                return (
                  <button
                    key={a.assetId}
                    type="button"
                    onClick={() => {
                      if (dirty) {
                        const ok = confirm("未保存の変更があります。切り替えますか？（変更は破棄されます）");
                        if (!ok) return;
                      }
                      setSelectedAssetId(a.assetId);
                    }}
                    style={{
                      textAlign: "left",
                      borderRadius: 16,
                      border: sel ? "1px solid rgba(59,130,246,.45)" : "1px solid rgba(15,17,21,.10)",
                      background: sel ? "rgba(239,246,255,.80)" : "rgba(255,255,255,.82)",
                      padding: 12,
                      cursor: "pointer",
                      boxShadow: sel ? "0 10px 28px rgba(59,130,246,.10)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name || "(無題)"}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Chip tone="muted">{a.assetId}</Chip>
                          <Chip tone="muted">{corp}</Chip>
                          <Chip tone="muted">{biz}</Chip>
                          <Chip tone="muted">{brands}</Chip>
                          <Chip tone="muted">{st}</Chip>
                        </div>
                      </div>
                      <Chip tone={a.isActive ? "green" : "red"}>{a.isActive ? "有効" : "無効"}</Chip>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 850, opacity: 0.6 }}>更新: {fmtJP(a.updatedAt)}</div>
                  </button>
                );
              })}

              {filteredAssets.length === 0 && <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65, padding: 10 }}>該当なし</div>}
            </div>
          </div>
        </section>

        {/* MIDDLE */}
        <section style={{ ...card, height: "calc(100svh - 120px)", display: "grid", gridTemplateRows: "auto 1fr" }}>
          {/* ✅ 保存ボタンを「編集カード上（MIDDLEヘッダー）」へ */}
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(15,17,21,.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 950 }}>アセット作成</div>
              <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>
                {draft ? (
                  <>
                    <Chip tone="muted">ID: {draft.assetId}</Chip>{" "}
                    {dirty ? <Chip tone="red">未保存</Chip> : <Chip tone="green">保存済</Chip>}
                  </>
                ) : (
                  "アセット未選択"
                )}
              </div>
            </div>

            {draft && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={saveDraft}
                  style={{
                    ...softBtn,
                    background: dirty ? "rgba(52,199,89,.14)" : "rgba(15,17,21,.04)",
                    cursor: dirty ? "pointer" : "not-allowed",
                    opacity: dirty ? 1 : 0.7,
                  }}
                  disabled={!dirty}
                  title={dirty ? "変更を保存" : "変更なし"}
                >
                  <CheckCircle2 size={16} />
                  保存
                </button>

                <button
                  type="button"
                  onClick={toggleActive}
                  style={{ ...softBtn, background: draft.isActive ? "rgba(52,199,89,.12)" : "rgba(255,59,48,.10)" }}
                >
                  {draft.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  {draft.isActive ? "有効" : "無効"}
                </button>

                <button type="button" onClick={() => deleteAsset(draft.assetId)} style={{ ...softBtn, background: "rgba(255,59,48,.10)" }}>
                  <Trash2 size={16} />
                  削除
                </button>
              </div>
            )}
          </div>

          {!draft ? (
            <div style={{ padding: 22, fontWeight: 850, opacity: 0.65 }}>左のアセットを選択するか、「新規」を押してください。</div>
          ) : (
            <div style={{ padding: 14, overflow: "auto" }}>
              <div style={{ display: "grid", gap: 14 }}>
                {/* basic */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(15,17,21,.10)",
                    background: "rgba(255,255,255,.86)",
                    padding: 12,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, letterSpacing: "-0.01em" }}>基本</div>
                    <Chip tone={dirty ? "red" : "green"}>{dirty ? "未保存" : "保存済"}</Chip>
                  </div>

                  <Field label="アセット名（必須）">
                    <input value={draft.name} onChange={(e) => setDraftPatch({ name: e.target.value })} style={input} />
                  </Field>

                  <Field label="説明" hint="任意">
                    <textarea value={draft.description || ""} onChange={(e) => setDraftPatch({ description: e.target.value })} style={textarea} />
                  </Field>

                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
                    <Field label="対象企業">
                      <Select
                        value={draft.target.corporate || ""}
                        onChange={(v) => setDraftTarget({ corporate: v })}
                        options={[
                          { value: "", label: "- 未設定 -" },
                          ...CORPORATE_OPTIONS.map((x) => ({ value: x, label: x })),
                        ]}
                      />
                    </Field>

                    <Field label="業態">
                      <Select
                        value={draft.target.businessType || ""}
                        onChange={(v) => setDraftTarget({ businessType: v })}
                        options={[
                          { value: "", label: "- 未設定 -" },
                          ...BUSINESS_TYPE_OPTIONS.map((x) => ({ value: x, label: x })),
                        ]}
                      />
                    </Field>
                  </div>

                  {/* ✅ 画像っぽい枠+ピルUIへ */}
                  <MultiSelectPillBox
                    label="ブランド（複数選択）"
                    options={BRAND_OPTIONS}
                    value={draft.target.brand || []}
                    onChange={(next) => setDraftTarget({ brand: next })}
                  />

                  <MultiSelectPillBox
                    label="業態区分（直営/FC）"
                    options={STORETYPE_OPTIONS}
                    value={draft.target.storeType || []}
                    onChange={(next) => setDraftTarget({ storeType: next })}
                  />
                </div>

                {/* questions */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(15,17,21,.10)", background: "rgba(255,255,255,.86)", padding: 12, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 950, letterSpacing: "-0.01em" }}>採用する設問</div>
                      <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>
                        D&Dで「アセット内の順番」を確定（表示は場所/No順で見やすく）
                      </div>
                    </div>

                    <button type="button" onClick={() => setPickerOpen(true)} style={{ ...softBtn, background: "rgba(47,140,230,.12)" }}>
                      <Plus size={16} />
                      設問追加
                    </button>
                  </div>

                  {/* table */}
                  <div style={{ borderRadius: 14, border: "1px solid rgba(15,17,21,.10)", overflow: "hidden", background: "rgba(255,255,255,.90)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 120px 70px 70px 1fr 110px",
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(15,17,21,.08)",
                        fontSize: 12,
                        fontWeight: 950,
                        opacity: 0.75,
                      }}
                    >
                      <div />
                      <div>場所</div>
                      <div>No</div>
                      <div>QSC</div>
                      <div>設問内容</div>
                      <div />
                    </div>

                    {assetQuestions.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 12, fontWeight: 850, opacity: 0.65 }}>まだ設問がありません</div>
                    ) : (
                      assetQuestions.map((qq) => (
                        <div
                          key={qq.questionId}
                          draggable
                          onDragStart={() => {
                            dragId.current = qq.questionId;
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            const from = dragId.current;
                            if (!from) return;
                            reorder(from, qq.questionId);
                            dragId.current = null;
                          }}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "44px 120px 70px 70px 1fr 110px",
                            padding: "10px 12px",
                            borderBottom: "1px solid rgba(15,17,21,.06)",
                            alignItems: "center",
                            opacity: qq.isActive ? 1 : 0.6,
                          }}
                        >
                          <div
                            aria-hidden
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              border: "1px solid rgba(15,17,21,.10)",
                              background: "rgba(15,17,21,.04)",
                              display: "grid",
                              placeItems: "center",
                            }}
                            title="ドラッグして並び替え"
                          >
                            <GripVertical size={16} style={{ opacity: 0.7 }} />
                          </div>

                          <div style={{ fontWeight: 900 }}>{qq.place}</div>
                          <div style={{ fontWeight: 950 }}>{qq.no}</div>
                          <div>
                            <Chip tone="blue">{qq.category}</Chip>
                          </div>

                          <div style={{ fontWeight: 900, lineHeight: 1.35 }}>
                            {qq.text}
                            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Chip tone="muted">{qq.questionId}</Chip>
                              <Chip tone="muted">{qq.answerType}</Chip>
                              <Chip tone="muted">w:{qq.weight}</Chip>
                              {qq.required && <Chip tone="green">必須</Chip>}
                              {!qq.isActive && <Chip tone="red">停止</Chip>}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => removeQuestion(qq.questionId)}
                              style={{ ...softBtn, height: 34, padding: "0 10px", background: "rgba(255,59,48,.10)" }}
                              title="この設問を外す"
                            >
                              <Trash2 size={16} />
                              外す
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <QuestionPickerModal
                open={pickerOpen}
                questions={questions}
                pickedIds={draft.questionIds || []}
                title="設問を追加（場所 / No / QSC / 設問内容）"
                onPick={(id) => addQuestion(id)}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          )}
        </section>

        {/* RIGHT */}
        <section style={{ ...card, height: "calc(100svh - 120px)", display: "grid", gridTemplateRows: "auto 1fr" }}>
          <div style={{ padding: 14, borderBottom: "1px solid rgba(15,17,21,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 950 }}>プレビュー</div>
              <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>表示は「場所 → No」順（run寄せ）</div>
            </div>
            <Chip tone="muted">{dirty ? "未保存でも反映" : "OK"}</Chip>
          </div>

          <div style={{ padding: 14, overflow: "auto" }}>
            {!draft ? (
              <div style={{ fontWeight: 850, opacity: 0.65 }}>アセット未選択</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {/* header */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(15,17,21,.10)", background: "rgba(255,255,255,.92)", padding: 12, display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 950 }}>{draft.name || "(無題)"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Chip tone={draft.isActive ? "green" : "red"}>{draft.isActive ? "有効" : "無効"}</Chip>
                    {draft.target.corporate && <Chip tone="muted">{draft.target.corporate}</Chip>}
                    {draft.target.businessType && <Chip tone="muted">{draft.target.businessType}</Chip>}
                    {(draft.target.brand || []).map((b) => (
                      <Chip key={b} tone="muted">
                        {b}
                      </Chip>
                    ))}
                    {(draft.target.storeType || []).map((s) => (
                      <Chip key={s} tone="muted">
                        {s}
                      </Chip>
                    ))}
                  </div>
                  {draft.description && <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65, whiteSpace: "pre-wrap" }}>{draft.description}</div>}
                </div>

                {groupedByPlace.length === 0 ? (
                  <div style={{ fontWeight: 850, opacity: 0.65 }}>設問を追加するとプレビューが表示されます</div>
                ) : (
                  groupedByPlace.map(([place, qs]) => (
                    <div key={place} style={{ borderRadius: 16, border: "1px solid rgba(15,17,21,.10)", background: "rgba(255,255,255,.92)", padding: 12, display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>{place}</div>
                        <Chip tone="muted">{qs.length}問</Chip>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {qs.map((qq) => (
                          <div key={qq.questionId} style={{ borderRadius: 16, border: "1px solid rgba(15,17,21,.10)", background: "rgba(255,255,255,.98)", padding: 12, display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 950, lineHeight: 1.35 }}>
                                  {qq.no}. <Chip tone="blue">{qq.category}</Chip>{" "}
                                  <span style={{ marginLeft: 6 }}>{qq.text}</span>
                                </div>
                                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <Chip tone="muted">{qq.questionId}</Chip>
                                  <Chip tone="muted">{qq.answerType}</Chip>
                                  <Chip tone="muted">w:{qq.weight}</Chip>
                                  {qq.required && <Chip tone="green">必須</Chip>}
                                  {!qq.isActive && <Chip tone="red">停止</Chip>}
                                </div>
                              </div>
                            </div>

                            {/* ✅ run寄せ：アイコン付きの選択UIに変更 */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {qq.answerType === "okng" &&
                                [
                                  { label: "OK", icon: <CheckCircle2 size={16} /> },
                                  { label: "保留", icon: <PauseCircle size={16} /> },
                                  { label: "NG", icon: <XCircle size={16} /> },
                                  { label: "該当なし", icon: <MinusCircle size={16} /> },
                                ].map((x) => (
                                  <div key={x.label} style={previewChoice}>
                                    {x.icon}
                                    {x.label}
                                  </div>
                                ))}

                              {qq.answerType === "yesno" &&
                                [
                                  { label: "はい", icon: <CheckCircle2 size={16} /> },
                                  { label: "いいえ", icon: <XCircle size={16} /> },
                                ].map((x) => (
                                  <div key={x.label} style={previewChoice}>
                                    {x.icon}
                                    {x.label}
                                  </div>
                                ))}

                              {qq.answerType === "scale" &&
                                [1, 2, 3, 4, 5].map((x) => (
                                  <div
                                    key={x}
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 14,
                                      border: "1px solid rgba(15,17,21,.10)",
                                      background: "rgba(255,255,255,.92)",
                                      display: "grid",
                                      placeItems: "center",
                                      fontWeight: 950,
                                      fontSize: 12,
                                    }}
                                  >
                                    {x}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.6 }}>
                  更新: {fmtJP(draft.updatedAt)}（保存すると更新されます）
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* responsive */}
      <style jsx>{`
        @media (max-width: 1200px) {
          div[style*="grid-template-columns: 340px"] {
            grid-template-columns: 1fr;
          }
          section {
            height: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
