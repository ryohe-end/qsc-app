"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Plus,
  SlidersHorizontal,
  X,
  ChevronRight,
  Home,
  Pin,
  PinOff,
  Send,
  FileText,
  CheckCircle2,
  GripVertical,
  Pencil,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

/** =========================
 * Types
 * ========================= */
type Brand = "all" | "JOYFIT" | "FIT365";
type NewsStatus = "draft" | "published";
type Scope = "ALL" | "DIRECT" | "FC" | "HQ";

type NewsRow = {
  id: string; // N001...
  title: string;
  body: string;

  category: string;
  brand: Brand;
  scope: Scope;

  status: NewsStatus;
  pinned: boolean;

  /** ✅ GUI並び替え用（小さいほど上） */
  order: number;

  publishedAt?: string; // published時
  updatedAt: string;
  updatedBy: string;
  version: number;
};

/** =========================
 * Masters (mock)
 * ========================= */
const CATEGORY_OPTIONS = ["重要", "運営", "障害", "キャンペーン", "店舗向け", "HQ向け", "その他"];
const BRAND_OPTIONS: Brand[] = ["all", "JOYFIT", "FIT365"];
const SCOPE_OPTIONS: Scope[] = ["ALL", "DIRECT", "FC", "HQ"];

/** =========================
 * Mock data
 * - order で同一ピン内の表示順を決める
 * ========================= */
const MOCK: NewsRow[] = [
  {
    id: "N001",
    title: "【重要】2/10 システムメンテナンスのお知らせ",
    body: "2/10（火） 02:00〜04:00にメンテナンスを実施します。期間中は一部機能が利用できません。",
    category: "重要",
    brand: "all",
    scope: "ALL",
    status: "published",
    pinned: true,
    order: 10,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    updatedBy: "admin",
    version: 1,
  },
  {
    id: "N002",
    title: "QSC：写真レビューの表示を改善",
    body: "スマホでのプレビュー表示が安定しました。戻る誤動作の対策も追加しています。",
    category: "運営",
    brand: "all",
    scope: "HQ",
    status: "draft",
    pinned: false,
    order: 20,
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedBy: "admin",
    version: 2,
  },
  {
    id: "N003",
    title: "JOYFIT：キャンペーン告知テンプレ更新",
    body: "店頭掲示用のテンプレが更新されました。配布はHQから順次行います。",
    category: "キャンペーン",
    brand: "JOYFIT",
    scope: "DIRECT",
    status: "published",
    pinned: false,
    order: 30,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedBy: "admin",
    version: 1,
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

function generateNextNewsId(existing: NewsRow[]) {
  let max = 0;
  for (const r of existing) {
    const m = r.id.match(/^N(\d+)$/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return "N" + String(max + 1).padStart(3, "0");
}

/** order: 10刻みで採番（後で挿入しやすい） */
function generateNextOrder(existing: NewsRow[]) {
  const max = existing.reduce((m, r) => Math.max(m, r.order ?? 0), 0);
  return Math.ceil((max + 10) / 10) * 10;
}

function statusMeta(s: NewsStatus) {
  if (s === "published")
    return {
      label: "公開中",
      bg: "rgba(52,199,89,.12)",
      fg: "rgba(0,0,0,.78)",
      icon: <CheckCircle2 size={14} />,
    };
  return {
    label: "下書き",
    bg: "rgba(142,142,147,.14)",
    fg: "rgba(0,0,0,.72)",
    icon: <FileText size={14} />,
  };
}

function brandLabel(b: Brand) {
  if (b === "all") return "全ブランド";
  return b;
}

function scopeLabel(s: Scope) {
  if (s === "ALL") return "全体";
  if (s === "DIRECT") return "直営";
  if (s === "FC") return "FC";
  return "HQ";
}

function fmtJP(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

/** pinned優先 + order昇順（GUI順） + 最後に日時 */
function sortNews(list: NewsRow[]) {
  return list.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ao = Number.isFinite(a.order) ? a.order : 999999;
    const bo = Number.isFinite(b.order) ? b.order : 999999;
    if (ao !== bo) return ao - bo;
    const at = a.publishedAt ?? a.updatedAt;
    const bt = b.publishedAt ?? b.updatedAt;
    return bt.localeCompare(at);
  });
}

/** =========================
 * UI primitives
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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 180,
  borderRadius: 16,
  border: "1px solid rgba(15,17,21,.10)",
  background: "rgba(255,255,255,.92)",
  padding: "10px 12px",
  fontWeight: 800,
  outline: "none",
  resize: "vertical",
  lineHeight: 1.55,
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

function Chip(props: { children: React.ReactNode; tone?: "default" | "muted" | "green" }) {
  const tone = props.tone ?? "default";
  const bg =
    tone === "muted"
      ? "rgba(15,17,21,.04)"
      : tone === "green"
      ? "rgba(52,199,89,.12)"
      : "rgba(255,255,255,.80)";
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(15,17,21,.10)",
        background: bg,
        opacity: 0.96,
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
        <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.72 }}>{props.label}</div>
        {props.hint && <div style={{ fontSize: 11, fontWeight: 850, opacity: 0.48 }}>{props.hint}</div>}
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
 * Search Select (combobox)
 * ========================= */
function SearchSelect(props: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const { label, value, options, placeholder, onChange } = props;
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
    if (!t) return options.slice(0, 30);
    return options.filter((x) => x.toLowerCase().includes(t)).slice(0, 30);
  }, [q, options]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  return (
    <Field label={label}>
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
          <div
            style={{
              minWidth: 0,
              opacity: value ? 1 : 0.45,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value || placeholder || "選択してください"}
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
                style={{ ...inputStyle, height: 40, borderRadius: 14, padding: "0 10px" }}
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
 * Left Filter Sheet
 * ========================= */
function LeftFilterSheet(props: {
  open: boolean;
  currentBrand: Brand | "all";
  currentScope: Scope | "all";
  currentStatus: NewsStatus | "all";
  currentCategory: string | "all";
  onChangeBrand: (b: Brand | "all") => void;
  onChangeScope: (s: Scope | "all") => void;
  onChangeStatus: (s: NewsStatus | "all") => void;
  onChangeCategory: (c: string | "all") => void;
  onClose: () => void;
}) {
  const {
    open,
    currentBrand,
    currentScope,
    currentStatus,
    currentCategory,
    onChangeBrand,
    onChangeScope,
    onChangeStatus,
    onChangeCategory,
    onClose,
  } = props;

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
            <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.65 }}>対象 / カテゴリ / 状態</div>
          </div>

          <button type="button" onClick={onClose} style={softButton}>
            <X size={16} />
            閉じる
          </button>
        </div>

        <div style={{ padding: "0 14px 14px", overflow: "auto", display: "grid", gap: 12 }}>
          <SectionCard title="対象ブランド" desc="全ブランド or 個別">
            <PillRow
              items={[
                { key: "all", label: "全ブランド" },
                { key: "JOYFIT", label: "JOYFIT" },
                { key: "FIT365", label: "FIT365" },
              ]}
              value={currentBrand}
              onChange={(k) => onChangeBrand(k as any)}
            />
          </SectionCard>

          <SectionCard title="対象範囲（scope）" desc="ALL / DIRECT / FC / HQ">
            <PillRow
              items={[
                { key: "all", label: "すべて" },
                { key: "ALL", label: "全体" },
                { key: "DIRECT", label: "直営" },
                { key: "FC", label: "FC" },
                { key: "HQ", label: "HQ" },
              ]}
              value={currentScope}
              onChange={(k) => onChangeScope(k as any)}
            />
          </SectionCard>

          <SectionCard title="状態" desc="下書き / 公開">
            <PillRow
              items={[
                { key: "all", label: "すべて" },
                { key: "published", label: "公開" },
                { key: "draft", label: "下書き" },
              ]}
              value={currentStatus}
              onChange={(k) => onChangeStatus(k as any)}
            />
          </SectionCard>

          <SectionCard title="カテゴリ" desc="一覧の検索でもOK">
            <PillRow
              items={[{ key: "all", label: "すべて" }, ...CATEGORY_OPTIONS.map((c) => ({ key: c, label: c }))]}
              value={currentCategory}
              onChange={(k) => onChangeCategory(k)}
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
              onChangeScope("all");
              onChangeStatus("all");
              onChangeCategory("all");
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

/** =========================
 * Right Editor Sheet
 * ========================= */
type SheetMode = "create" | "edit";
type Draft = {
  title: string;
  body: string;
  category: string;
  brand: Brand;
  scope: Scope;
  status: NewsStatus;
  pinned: boolean;
};

function toDraft(row?: NewsRow): Draft {
  if (!row) {
    return {
      title: "",
      body: "",
      category: "重要",
      brand: "all",
      scope: "ALL",
      status: "draft",
      pinned: false,
    };
  }
  return {
    title: row.title,
    body: row.body,
    category: row.category,
    brand: row.brand,
    scope: row.scope,
    status: row.status,
    pinned: row.pinned,
  };
}

function validateDraft(d: Draft) {
  const errors: string[] = [];
  if (!d.title.trim()) errors.push("タイトルは必須です");
  if (!d.body.trim()) errors.push("本文は必須です");
  if (!d.category) errors.push("カテゴリを選択してください");
  return errors;
}

function RightEditorSheet(props: {
  open: boolean;
  mode: SheetMode;
  initial?: NewsRow;
  existing: NewsRow[];
  onClose: () => void;
  onSave: (row: NewsRow) => Promise<void> | void;
}) {
  const { open, mode, initial, existing, onClose, onSave } = props;

  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const firstRef = useRef<HTMLInputElement>(null);

  const previewId = useMemo(() => {
    if (mode === "edit" && initial) return initial.id;
    return generateNextNewsId(existing);
  }, [mode, initial, existing]);

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(initial));
    setTouched(false);
    setSaving(false);
    lockBodyScroll(true);
    setTimeout(() => firstRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      lockBodyScroll(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, onClose]);

  if (!open) return null;

  const errors = touched ? validateDraft(draft) : [];
  const canSave = errors.length === 0 && !saving;

  const set = (patch: Partial<Draft>) => {
    setTouched(true);
    setDraft((p) => ({ ...p, ...patch }));
  };

  const submit = async () => {
    setTouched(true);
    const errs = validateDraft(draft);
    if (errs.length) return;

    const base: NewsRow = {
      id: mode === "edit" && initial ? initial.id : previewId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      brand: draft.brand,
      scope: draft.scope,
      status: draft.status,
      pinned: draft.pinned,
      order: mode === "edit" && initial ? initial.order : generateNextOrder(existing),
      updatedAt: nowISO(),
      updatedBy: "admin",
      version: (initial?.version ?? 0) + 1,
      publishedAt: draft.status === "published" ? initial?.publishedAt ?? nowISO() : undefined,
    };

    setSaving(true);
    try {
      await onSave(base);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "お知らせを追加" : "お知らせを編集";
  const sub = mode === "create" ? `新規作成（ID: ${previewId}）` : `編集：${initial?.title ?? ""}`;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(720px, 100vw)",
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone="muted">ID：{previewId}</Chip>
            <Chip tone="muted">Cmd/Ctrl + S</Chip>
            {draft.pinned && <Chip tone="muted">📌 pinned</Chip>}
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
            <SectionCard title="内容" desc="タイトル / 本文">
              <Field label="タイトル" hint="冒頭に【重要】などOK">
                <input
                  ref={firstRef}
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="例）【重要】〇〇のお知らせ"
                  style={inputStyle}
                />
              </Field>

              <Field label="本文" hint="改行OK">
                <textarea
                  value={draft.body}
                  onChange={(e) => set({ body: e.target.value })}
                  placeholder="本文を入力…"
                  style={textareaStyle}
                />
              </Field>
            </SectionCard>

            <SectionCard title="分類" desc="カテゴリ / 対象 / 状態">
              <SearchSelect label="カテゴリ" value={draft.category} options={CATEGORY_OPTIONS} onChange={(v) => set({ category: v })} />
              <SearchSelect label="対象ブランド" value={draft.brand} options={BRAND_OPTIONS} onChange={(v) => set({ brand: v as Brand })} />
              <SearchSelect label="対象範囲（scope）" value={draft.scope} options={SCOPE_OPTIONS} onChange={(v) => set({ scope: v as Scope })} />

              <Field label="状態">
                <PillRow
                  items={[
                    { key: "draft", label: "下書き" },
                    { key: "published", label: "公開" },
                  ]}
                  value={draft.status}
                  onChange={(k) => set({ status: k as NewsStatus })}
                />
              </Field>

              <Field label="ピン留め" hint="一覧先頭に固定">
                <PillRow
                  items={[
                    { key: "off", label: "しない" },
                    { key: "on", label: "する" },
                  ]}
                  value={draft.pinned ? "on" : "off"}
                  onChange={(k) => set({ pinned: k === "on" })}
                />
              </Field>
            </SectionCard>

            {mode === "edit" && initial && (
              <SectionCard title="情報" desc="参照（自動更新）">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip tone="muted">順番: {initial.order}</Chip>
                  <Chip tone="muted">更新者: {initial.updatedBy}</Chip>
                  <Chip tone="muted">更新: {fmtJP(initial.updatedAt)}</Chip>
                  {initial.publishedAt && <Chip tone="muted">公開: {fmtJP(initial.publishedAt)}</Chip>}
                  <Chip tone="muted">v{initial.version}</Chip>
                </div>
              </SectionCard>
            )}
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
            {draft.status === "published" ? "公開状態で保存（公開日時が入る）" : "下書きで保存"}
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
 * Card Row (情報量削減：要点 + プレビュー + 詳細は展開)
 * ========================= */
function NewsCard(props: {
  row: NewsRow;
  reorderMode: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onTogglePublish: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const { row: r } = props;
  const meta = statusMeta(r.status);

  return (
    <div
      draggable={props.reorderMode}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      style={{
        borderRadius: 20,
        border: "1px solid rgba(15,17,21,.08)",
        background: "rgba(255,255,255,.80)",
        overflow: "hidden",
        boxShadow: props.reorderMode ? "0 14px 36px rgba(15,17,21,.08)" : "0 10px 24px rgba(15,17,21,.05)",
      }}
    >
      {/* main clickable area */}
      <div
        onClick={props.onEdit}
        role="button"
        style={{
          padding: 14,
          display: "grid",
          gap: 10,
          cursor: "pointer",
        }}
        aria-label={`${r.title} を編集`}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, minWidth: 0, alignItems: "flex-start" }}>
            {/* drag handle */}
            <div
              aria-hidden
              title={props.reorderMode ? "ドラッグで並び替え" : "並び替えはOFF"}
              style={{
                width: 34,
                height: 34,
                borderRadius: 14,
                border: "1px solid rgba(15,17,21,.10)",
                background: props.reorderMode ? "rgba(47,140,230,.12)" : "rgba(15,17,21,.04)",
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
                opacity: props.reorderMode ? 1 : 0.5,
              }}
            >
              <GripVertical size={16} />
            </div>

            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
              {/* title row */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 950,
                    letterSpacing: "-0.02em",
                    fontSize: 16,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.55, flex: "0 0 auto" }}>{r.id}</div>
              </div>

              {/* chips (常時は最小限) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Chip>{r.category}</Chip>
                <Chip tone="muted">{brandLabel(r.brand)}</Chip>
                <Chip tone="muted">{scopeLabel(r.scope)}</Chip>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(15,17,21,.10)",
                    background: meta.bg,
                    color: meta.fg,
                    fontSize: 12,
                    fontWeight: 950,
                    opacity: 0.96,
                  }}
                >
                  {meta.icon}
                  {meta.label}
                </div>

                {r.pinned && <Chip tone="muted">📌</Chip>}
              </div>
            </div>
          </div>

          {/* actions (stopPropagation必須) */}
          <div style={{ display: "flex", gap: 8, flex: "0 0 auto", alignItems: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onToggleExpanded();
              }}
              style={iconBtn}
              aria-label="詳細を開閉"
              title="詳細"
            >
              {props.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onTogglePin();
              }}
              style={{
                ...pillBtn,
                background: r.pinned ? "rgba(47,140,230,.12)" : "rgba(255,255,255,.78)",
              }}
              aria-label="ピン留め切り替え"
              title="ピン"
            >
              {r.pinned ? <PinOff size={16} /> : <Pin size={16} />}
              {r.pinned ? "解除" : "ピン"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onTogglePublish();
              }}
              style={{
                ...pillBtn,
                background: r.status === "published" ? "rgba(52,199,89,.12)" : "rgba(142,142,147,.14)",
              }}
              aria-label="公開/下書き切り替え"
              title="公開/下書き"
            >
              <Send size={16} />
              {r.status === "published" ? "下書き" : "公開"}
            </button>

            <div style={{ ...iconBtn, opacity: 0.85 }} aria-hidden title="編集">
              <Pencil size={16} />
            </div>
          </div>
        </div>

        {/* preview (2〜3行で止める) */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(15,17,21,.08)",
            background: "rgba(255,255,255,.68)",
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 850,
              opacity: 0.76,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {r.body}
          </div>
        </div>
      </div>

      {/* details (折りたたみ) */}
      {props.expanded && (
        <div
          style={{
            padding: "12px 14px 14px",
            borderTop: "1px solid rgba(15,17,21,.08)",
            background: "rgba(15,17,21,.02)",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone="muted">順番: {r.order}</Chip>
            <Chip tone="muted">更新: {fmtJP(r.updatedAt)}</Chip>
            {r.publishedAt && <Chip tone="muted">公開: {fmtJP(r.publishedAt)}</Chip>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.55 }}>
            {r.updatedBy} • v{r.version}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  border: "1px solid rgba(15,17,21,.10)",
  background: "rgba(255,255,255,.82)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const pillBtn: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid rgba(15,17,21,.10)",
  cursor: "pointer",
  fontWeight: 950,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

/** =========================
 * Page (default exportはここだけ)
 * ========================= */
export default function AdminNewsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<NewsRow[]>(() => sortNews(MOCK));

  // search
  const [q, setQ] = useState("");

  // left sheet filters
  const [leftOpen, setLeftOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState<Brand | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  // right editor sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create");
  const [editing, setEditing] = useState<NewsRow | undefined>(undefined);

  // ✅ GUI並び替え
  const [reorderMode, setReorderMode] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  // ✅ 詳細開閉（メタ情報を普段隠す）
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => {
    setSheetMode("create");
    setEditing(undefined);
    setSheetOpen(true);
  };

  const openEdit = (row: NewsRow) => {
    setSheetMode("edit");
    setEditing(row);
    setSheetOpen(true);
  };

  const filtered = useMemo(() => {
    let out = rows.slice();

    if (brandFilter !== "all") out = out.filter((r) => r.brand === brandFilter);
    if (scopeFilter !== "all") out = out.filter((r) => r.scope === scopeFilter);
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    if (categoryFilter !== "all") out = out.filter((r) => r.category === categoryFilter);

    const t = q.trim().toLowerCase();
    if (!t) return out;

    return out.filter((r) => {
      return (
        r.id.toLowerCase().includes(t) ||
        r.title.toLowerCase().includes(t) ||
        r.body.toLowerCase().includes(t) ||
        r.category.toLowerCase().includes(t) ||
        brandLabel(r.brand).toLowerCase().includes(t) ||
        scopeLabel(r.scope).toLowerCase().includes(t)
      );
    });
  }, [rows, brandFilter, scopeFilter, statusFilter, categoryFilter, q]);

  const counts = useMemo(() => {
    const total = rows.length;
    const pinned = rows.filter((r) => r.pinned).length;
    const published = rows.filter((r) => r.status === "published").length;
    const draft = rows.filter((r) => r.status === "draft").length;
    return { total, pinned, published, draft };
  }, [rows]);

  const saveRow = async (row: NewsRow) => {
    if (sheetMode === "create") {
      let id = row.id;
      if (rows.some((r) => r.id === id)) id = generateNextNewsId(rows);

      const next: NewsRow = {
        ...row,
        id,
        order: generateNextOrder(rows),
        updatedAt: nowISO(),
        version: 1,
        publishedAt: row.status === "published" ? nowISO() : undefined,
      };

      setRows((prev) => sortNews([next, ...prev]));
      return;
    }

    setRows((prev) => sortNews(prev.map((r) => (r.id === row.id ? { ...r, ...row } : r))));
  };

  const togglePin = (id: string) => {
    setRows((prev) =>
      sortNews(
        prev.map((r) => {
          if (r.id !== id) return r;
          return { ...r, pinned: !r.pinned, updatedAt: nowISO(), version: r.version + 1 };
        })
      )
    );
  };

  const quickPublishToggle = (id: string) => {
    setRows((prev) =>
      sortNews(
        prev.map((r) => {
          if (r.id !== id) return r;
          const to: NewsStatus = r.status === "published" ? "draft" : "published";
          return {
            ...r,
            status: to,
            publishedAt: to === "published" ? r.publishedAt ?? nowISO() : undefined,
            updatedAt: nowISO(),
            version: r.version + 1,
          };
        })
      )
    );
  };

  /** GUI並び替え（同じ pinned 内で order を並べ替える） */
  const reorderWithinGroup = (movingId: string, targetId: string) => {
    if (movingId === targetId) return;

    setRows((prev) => {
      const list = prev.slice();
      const moving = list.find((x) => x.id === movingId);
      const target = list.find((x) => x.id === targetId);
      if (!moving || !target) return prev;

      // pinned が違う場合は同グループ内のみの方針なので無視
      if (moving.pinned !== target.pinned) return prev;

      const group = sortNews(list.filter((x) => x.pinned === moving.pinned));
      const fromIdx = group.findIndex((x) => x.id === movingId);
      const toIdx = group.findIndex((x) => x.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;

      const [pick] = group.splice(fromIdx, 1);
      group.splice(toIdx, 0, pick);

      const reassigned = new Map<string, number>();
      group.forEach((x, i) => reassigned.set(x.id, (i + 1) * 10));

      const next = list.map((r) => {
        if (r.pinned !== moving.pinned) return r;
        const newOrder = reassigned.get(r.id);
        if (!newOrder) return r;
        if (r.order === newOrder) return r;
        return { ...r, order: newOrder, updatedAt: nowISO(), version: r.version + 1 };
      });

      return sortNews(next);
    });
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
      <LeftFilterSheet
        open={leftOpen}
        currentBrand={brandFilter}
        currentScope={scopeFilter}
        currentStatus={statusFilter}
        currentCategory={categoryFilter}
        onChangeBrand={setBrandFilter}
        onChangeScope={setScopeFilter}
        onChangeStatus={setStatusFilter}
        onChangeCategory={setCategoryFilter}
        onClose={() => setLeftOpen(false)}
      />

      <RightEditorSheet
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
                <Bell size={18} />
              </div>

              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>お知らせ管理</div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.72 }}>
                  {filtered.length} / {rows.length} • pinned {counts.pinned} • 公開 {counts.published} • 下書き{" "}
                  {counts.draft}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => router.push("/admin")} style={softButton} aria-label="管理トップへ">
                <Home size={16} />
                Home
              </button>

              <button type="button" onClick={() => setLeftOpen(true)} style={softButton} aria-label="フィルターを開く">
                <SlidersHorizontal size={16} />
                フィルター
              </button>

              <button
                type="button"
                onClick={() => setReorderMode((p) => !p)}
                style={{
                  ...softButton,
                  background: reorderMode ? "rgba(47,140,230,.12)" : (softButton.background as string),
                }}
                aria-label="並び替えモード"
              >
                <GripVertical size={16} />
                並び替え{reorderMode ? "中" : ""}
              </button>

              <button type="button" onClick={openCreate} style={softButton}>
                <Plus size={16} />
                追加
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
                placeholder="検索（ID / タイトル / 本文 / カテゴリ / 対象）"
                style={{ ...inputStyle, padding: "0 12px 0 38px" }}
              />
            </div>

            {/* active filter chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
              {brandFilter !== "all" && <Chip tone="muted">brand: {brandFilter}</Chip>}
              {scopeFilter !== "all" && <Chip tone="muted">scope: {scopeLabel(scopeFilter)}</Chip>}
              {statusFilter !== "all" && <Chip tone="muted">status: {statusMeta(statusFilter).label}</Chip>}
              {categoryFilter !== "all" && <Chip tone="muted">category: {categoryFilter}</Chip>}
              {reorderMode && (
                <Chip tone="muted">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Info size={14} />
                    ドラッグで順番変更（同じ pinned 内のみ）
                  </span>
                </Chip>
              )}

              {(brandFilter !== "all" || scopeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setBrandFilter("all");
                    setScopeFilter("all");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(15,17,21,.10)",
                    background: "rgba(15,17,21,.04)",
                    cursor: "pointer",
                    fontWeight: 950,
                    fontSize: 12,
                  }}
                >
                  クリア
                </button>
              )}
            </div>
          </div>
        </section>

        {/* List card */}
        <section style={cardStyle}>
          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 800 }}>該当するお知らせがありません</div>
            ) : (
              filtered.map((r) => {
                const expanded = expandedId === r.id;

                return (
                  <NewsCard
                    key={r.id}
                    row={r}
                    reorderMode={reorderMode}
                    expanded={expanded}
                    onToggleExpanded={() => setExpandedId((p) => (p === r.id ? null : r.id))}
                    onEdit={() => openEdit(r)}
                    onTogglePin={() => togglePin(r.id)}
                    onTogglePublish={() => quickPublishToggle(r.id)}
                    onDragStart={() => {
                      if (!reorderMode) return;
                      dragIdRef.current = r.id;
                    }}
                    onDragOver={(e) => {
                      if (!reorderMode) return;
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      if (!reorderMode) return;
                      const from = dragIdRef.current;
                      if (!from) return;
                      reorderWithinGroup(from, r.id);
                      dragIdRef.current = null;
                    }}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
