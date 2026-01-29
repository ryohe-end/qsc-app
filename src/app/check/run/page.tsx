// src/app/check/run/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Menu,
  X,
  Store,
  Building2,
  Layers3,
  Tag,
  CheckCircle2,
  PauseCircle,
  XCircle,
  MinusCircle,
  Save,
  Send,
  ImagePlus,
  Trash2,
  MessageSquareText,
  AlertTriangle,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
} from "lucide-react";

/**
 * ✅ 3ファイルCSS版（そのままでOK）
 */
import base from "./CheckRunPage.base.module.css";
import modal from "./CheckRunPage.modal.module.css";
import bottom from "./CheckRunPage.bottom.module.css";
import PhotoEditModal from "./PhotoEditModal";

const styles = { ...base, ...modal, ...bottom };

/* =========================
   Types
   ========================= */

type CheckState = "ok" | "hold" | "ng" | "na" | "unset";

type Photo = {
  id: string;
  dataUrl: string; // base64
};

type CheckItem = {
  id: string;
  label: string;
  state: CheckState;
  note?: string; // ✅ NGのみ必須（保留はコメント欄を出さない）
  holdNote?: string; // ✅ 保留理由（テキスト1つ）
  photos?: Photo[];
};

type Section = {
  id: string;
  title: string;
  items: CheckItem[];
};

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "sec_entrance",
    title: "入口・導線",
    items: [
      { id: "i1", label: "入口まわりの清掃", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i2", label: "サイン/掲示物の破損なし", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i3", label: "床の滑り・段差注意OK", state: "unset", note: "", holdNote: "", photos: [] },
    ],
  },
  {
    id: "sec_floor",
    title: "フロア",
    items: [
      { id: "i4", label: "マシン周辺の清掃", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i5", label: "備品（マット等）整頓", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i6", label: "危険箇所なし", state: "unset", note: "", holdNote: "", photos: [] },
    ],
  },
  {
    id: "sec_toilet",
    title: "トイレ・更衣室",
    items: [
      { id: "i7", label: "臭気・衛生OK", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i8", label: "備品補充OK", state: "unset", note: "", holdNote: "", photos: [] },
      { id: "i9", label: "水回りの汚れなし", state: "unset", note: "", holdNote: "", photos: [] },
    ],
  },
];

/* =========================
   Helpers
   ========================= */

function uid(prefix = "p") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function trimText(s: unknown) {
  return (typeof s === "string" ? s : "").trim();
}

function itemKey(secId: string, itemId: string) {
  return `${secId}::${itemId}`;
}

type PhotoModalState = {
  open: boolean;
  secId: string;
  itemId: string;
  photos: Photo[];
  index: number;
};

/**
 * ✅ iOS風 ActionSheet（2アクション + キャンセル）
 */
type ActionSheetState =
  | { open: false }
  | {
      open: true;
      title?: string;
      message?: string;

      primaryText?: string; // 強いアクション（例：保存する、配信して完了）
      onPrimary?: () => void;
      destructivePrimary?: boolean;

      secondaryText?: string; // 2つ目アクション（例：配信せず完了）
      onSecondary?: () => void;

      cancelText?: string;
      onCancel?: () => void;
    };

/* =========================
   Page
   ========================= */

export default function CheckRunPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // from /check selection
  const companyId = sp.get("companyId") || "";
  const bizId = sp.get("bizId") || "";
  const brandId = sp.get("brandId") || "";
  const storeId = sp.get("storeId") || "";

  const storeLabel = useMemo(() => {
    if (!storeId) return "店舗未選択";
    return `Store ${storeId}`;
  }, [storeId]);

  // draft key
  const DRAFT_KEY = useMemo(() => {
    const key = [companyId, bizId, brandId, storeId].filter(Boolean).join("_");
    return `qsc_check_draft_${key || "unknown"}`;
  }, [companyId, bizId, brandId, storeId]);

  // sections state (load draft)
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return DEFAULT_SECTIONS;
      const parsed = JSON.parse(raw) as Section[];
      if (!Array.isArray(parsed)) return DEFAULT_SECTIONS;

      const patched = parsed.map((s) => ({
        ...s,
        items: (s.items || []).map((it) => ({
          ...it,
          note: typeof it.note === "string" ? it.note : "",
          holdNote: typeof (it as any).holdNote === "string" ? (it as any).holdNote : "",
          photos: Array.isArray(it.photos) ? it.photos : [],
        })),
      }));
      return patched;
    } catch {
      return DEFAULT_SECTIONS;
    }
  });

  // DRAFT_KEY が変わったら該当draftを再ロード
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setSections(DEFAULT_SECTIONS);
        return;
      }
      const parsed = JSON.parse(raw) as Section[];
      if (!Array.isArray(parsed)) {
        setSections(DEFAULT_SECTIONS);
        return;
      }
      const patched = parsed.map((s) => ({
        ...s,
        items: (s.items || []).map((it) => ({
          ...it,
          note: typeof it.note === "string" ? it.note : "",
          holdNote: typeof (it as any).holdNote === "string" ? (it as any).holdNote : "",
          photos: Array.isArray(it.photos) ? it.photos : [],
        })),
      }));
      setSections(patched);
    } catch {
      setSections(DEFAULT_SECTIONS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_KEY]);

  const [saving, setSaving] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);

  // drawer (area menu)
  const [areaOpen, setAreaOpen] = useState(false);

  // refs for scroll jump
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLElement | null>>({}); // ✅ 未チェックジャンプ用

  // コメント欄 ref（NG押下でスクロール＆フォーカス）
  const noteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ✅ 保留理由 textarea ref（保留押下でスクロール＆フォーカス）
  const holdRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // コメント欄 “ガイド発光”
  const [guideKey, setGuideKey] = useState<string | null>(null);

  // iOS風アクションシート
  const [sheet, setSheet] = useState<ActionSheetState>({ open: false });

  // modal (photo preview)
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({
    open: false,
    secId: "",
    itemId: "",
    photos: [],
    index: 0,
  });

  // ✅ PhotoEditModal state（キャンセルでも resolve するため onClose を持つ）
  type EditPhotoState = {
    open: boolean;
    dataUrl: string;
    onSave: (editedDataUrl: string) => void;
    onClose: () => void;
  };

  const [editPhoto, setEditPhoto] = useState<EditPhotoState>({
    open: false,
    dataUrl: "",
    onSave: () => {},
    onClose: () => {},
  });

  // validation: ✅ NG comment required
  const [forceShowErrors, setForceShowErrors] = useState(false);

  const missingRequiredNotes = useMemo(() => {
    const misses: { secId: string; itemId: string }[] = [];
    for (const s of sections) {
      for (const it of s.items) {
        if (it.state === "ng") {
          const note = trimText(it.note);
          if (!note) misses.push({ secId: s.id, itemId: it.id });
        }
      }
    }
    return misses;
  }, [sections]);

  const hasMissingRequiredNotes = missingRequiredNotes.length > 0;

  // progress
  const progress = useMemo(() => {
    const all = sections.flatMap((s) => s.items);
    const total = all.length || 1;
    const done = all.filter((i) => i.state !== "unset").length;

    const ok = all.filter((i) => i.state === "ok").length;
    const hold = all.filter((i) => i.state === "hold").length;
    const ng = all.filter((i) => i.state === "ng").length;
    const na = all.filter((i) => i.state === "na").length;

    const unset = all.filter((i) => i.state === "unset").length;

    const pct = Math.round((done / total) * 100);
    return { done, total, pct, ok, hold, ng, na, unset };
  }, [sections]);

  const hasWarn = progress.ng > 0 || progress.hold > 0;

  // ======= navigation helpers =======

  const scrollToItem = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    const el = itemRefs.current[k];
    if (!el) {
      // fallback: section
      const secEl = sectionRefs.current[secId];
      if (!secEl) return;
      const top = secEl.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top, behavior: "smooth" });
      return;
    }
    const top = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const findFirstUnset = () => {
    for (const s of sections) {
      for (const it of s.items) {
        if (it.state === "unset") return { secId: s.id, itemId: it.id };
      }
    }
    return null;
  };

  const goFirstUnset = () => {
    const first = findFirstUnset();
    if (!first) return;
    scrollToItem(first.secId, first.itemId);
  };

  // ======= state mutators =======

  const setItemState = (secId: string, itemId: string, next: CheckState) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId) return it;
                const toggled = it.state === next ? "unset" : next;

                // ✅ 保留にした瞬間：コメントは表示しない（データも空に寄せる）
                if (toggled === "hold") {
                  return { ...it, state: "hold", note: "" };
                }
                return { ...it, state: toggled };
              }),
            }
      )
    );
  };

  const setItemNote = (secId: string, itemId: string, note: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : { ...s, items: s.items.map((it) => (it.id !== itemId ? it : { ...it, note })) }
      )
    );
  };

  const setItemHoldNote = (secId: string, itemId: string, holdNote: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : { ...s, items: s.items.map((it) => (it.id !== itemId ? it : { ...it, holdNote })) }
      )
    );
  };

  // ✅ 編集モーダルを開いて、保存なら dataUrl / キャンセルなら null
  const openPhotoEditor = (dataUrl: string) => {
    return new Promise<string | null>((resolve) => {
      setEditPhoto({
        open: true,
        dataUrl,
        onSave: (editedDataUrl) => {
          setEditPhoto({ open: false, dataUrl: "", onSave: () => {}, onClose: () => {} });
          resolve(editedDataUrl);
        },
        onClose: () => {
          setEditPhoto({ open: false, dataUrl: "", onSave: () => {}, onClose: () => {} });
          resolve(null);
        },
      });
    });
  };

  const addPhotosToItem = async (secId: string, itemId: string, files: File[]) => {
    if (!files || files.length === 0) return;

    const arr = files.slice(0, 30);
    const added: Photo[] = [];

    for (const f of arr) {
      try {
        const original = await readFileAsDataUrl(f);
        const edited = await openPhotoEditor(original);
        if (!edited) continue;
        added.push({ id: uid("ph"), dataUrl: edited });
      } catch (err) {
        console.error("[addPhotosToItem] failed file:", f?.name, err);
        continue;
      }
    }

    if (added.length === 0) return;

    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) =>
                it.id !== itemId ? it : { ...it, photos: (it.photos ?? []).concat(added) }
              ),
            }
      )
    );
  };

  const removePhotoFromItem = (secId: string, itemId: string, photoId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId) return it;
                const next = (it.photos ?? []).filter((p) => p.id !== photoId);
                return { ...it, photos: next };
              }),
            }
      )
    );

    setPhotoModal((m) => {
      if (!m.open) return m;
      if (m.secId !== secId || m.itemId !== itemId) return m;
      const nextPhotos = (m.photos ?? []).filter((p) => p.id !== photoId);
      if (nextPhotos.length === 0) return { ...m, open: false, photos: [], index: 0 };
      const nextIndex = Math.min(m.index, nextPhotos.length - 1);
      return { ...m, photos: nextPhotos, index: nextIndex };
    });
  };

  // ガイド発光
  const pulseGuide = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    setGuideKey(k);
    window.setTimeout(() => {
      setGuideKey((cur) => (cur === k ? null : cur));
    }, 900);
  };

  // NG押下時：コメント欄へスクロール＋フォーカス（＋ガイド発光）
  const focusNote = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);

    requestAnimationFrame(() => {
      const el = noteRefs.current[k];
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const y = rect.top + window.scrollY;

      const topPad = 84;
      const target = Math.max(0, y - topPad - 6);
      window.scrollTo({ top: target, behavior: "smooth" });

      pulseGuide(secId, itemId);

      setTimeout(() => {
        el.focus();
        const len = el.value?.length ?? 0;
        el.setSelectionRange?.(len, len);
      }, 240);
    });
  };

  // 保留押下時：保留理由へスクロール＋フォーカス
  const focusHold = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);

    requestAnimationFrame(() => {
      const el = holdRefs.current[k];
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const y = rect.top + window.scrollY;

      const topPad = 84;
      const target = Math.max(0, y - topPad - 6);
      window.scrollTo({ top: target, behavior: "smooth" });

      pulseGuide(secId, itemId);

      setTimeout(() => {
        el.focus();
        const len = el.value?.length ?? 0;
        el.setSelectionRange?.(len, len);
      }, 220);
    });
  };

  const onChoose = (secId: string, itemId: string, state: CheckState) => {
    setItemState(secId, itemId, state);
    if (state === "ng") focusNote(secId, itemId);
    if (state === "hold") focusHold(secId, itemId);
  };

  // ======= modal control (photo preview) =======

  const openPhotoModal = (secId: string, itemId: string, photos: Photo[], index: number) => {
    setPhotoModal({ open: true, secId, itemId, photos, index });
  };

  const closePhotoModal = () => setPhotoModal((m) => ({ ...m, open: false }));

  const modalNext = () => {
    setPhotoModal((m) => {
      if (!m.open) return m;
      const len = m.photos.length;
      return { ...m, index: Math.min(len - 1, m.index + 1) };
    });
  };

  const modalPrev = () => {
    setPhotoModal((m) => {
      if (!m.open) return m;
      return { ...m, index: Math.max(0, m.index - 1) };
    });
  };

  const closeSheet = () => setSheet({ open: false });

  const modalDeleteCurrent = () => {
    if (!photoModal.open) return;
    const current = photoModal.photos[photoModal.index];
    if (!current) return;

    setSheet({
      open: true,
      title: "写真を削除しますか？",
      message: "この操作は取り消せません。",
      primaryText: "削除",
      destructivePrimary: true,
      cancelText: "キャンセル",
      onPrimary: () => {
        removePhotoFromItem(photoModal.secId, photoModal.itemId, current.id);
        setSheet({ open: false });
      },
      onCancel: () => setSheet({ open: false }),
    });
  };

  // ======= draft / submit / discard =======

  const saveDraft = async () => {
    if (saving) return;

    setSheet({
      open: true,
      title: "途中保存しますか？",
      message: "この端末に途中経過を保存します。",
      primaryText: "保存する",
      cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false });
        setSaving(true);
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(sections));
          await new Promise((r) => setTimeout(r, 220));
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => setSheet({ open: false }),
    });
  };

  const discardDraft = () => {
    setSheet({
      open: true,
      title: "途中データを破棄しますか？",
      message: "このチェックの途中保存データが削除されます。",
      primaryText: "破棄",
      destructivePrimary: true,
      cancelText: "キャンセル",
      onPrimary: () => {
        try {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.removeItem(`${DRAFT_KEY}_submittedAt`);
        } catch {}
        setSections(DEFAULT_SECTIONS);
        setSheet({ open: false });
        router.push("/check");
      },
      onCancel: () => setSheet({ open: false }),
    });
  };

  const scrollToFirstMissingRequired = () => {
    if (!hasMissingRequiredNotes) return;
    const first = missingRequiredNotes[0];
    scrollToItem(first.secId, first.itemId);
    setTimeout(() => focusNote(first.secId, first.itemId), 240);
  };

  // ✅ 将来：ここでメール送信APIを叩く（いまはダミー）
  async function sendCompletionMailStub(payload: {
    companyId: string;
    bizId: string;
    brandId: string;
    storeId: string;
    sections: Section[];
  }) {
    // 例）将来：
    // await fetch("/api/notify/check-completed", { method: "POST", body: JSON.stringify(payload) });
    await new Promise((r) => setTimeout(r, 250));
  }

  const submitCore = async (sendMail: boolean) => {
    setForceShowErrors(true);

    if (hasMissingRequiredNotes) {
      scrollToFirstMissingRequired();
      return;
    }

    setSubmitBusy(true);
    try {
      if (sendMail) {
        await sendCompletionMailStub({ companyId, bizId, brandId, storeId, sections });
      }

      localStorage.setItem(`${DRAFT_KEY}_submittedAt`, new Date().toISOString());
      await new Promise((r) => setTimeout(r, 420));
      router.push("/check");
    } finally {
      setSubmitBusy(false);
    }
  };

  const openCompleteMailSheet = () => {
    setSheet({
      open: true,
      title: "完了します",
      message: "完了メールを配信しますか？（今後、配信機能を実装予定）",
      primaryText: "配信して完了",
      secondaryText: "配信せず完了",
      cancelText: "キャンセル",
      onPrimary: () => {
        setSheet({ open: false });
        submitCore(true);
      },
      onSecondary: () => {
        setSheet({ open: false });
        submitCore(false);
      },
      onCancel: () => setSheet({ open: false }),
    });
  };

  const submit = async () => {
    if (submitBusy) return;

    // ✅ 未チェックがあるなら：先にそこへ飛べる（&確認）
    if (progress.unset > 0) {
      setSheet({
        open: true,
        title: "未チェック項目があります",
        message: `未チェックが ${progress.unset} 件あります。未チェックに移動しますか？`,
        primaryText: "移動する",
        secondaryText: "このまま完了へ",
        cancelText: "キャンセル",
        onPrimary: () => {
          setSheet({ open: false });
          goFirstUnset();
        },
        onSecondary: () => {
          setSheet({ open: false });
          openCompleteMailSheet();
        },
        onCancel: () => setSheet({ open: false }),
      });
      return;
    }

    // ✅ 未チェックなし：メール配信の確認へ
    openCompleteMailSheet();
  };

  // ======= area drawer =======

  const jumpTo = (secId: string) => {
    const el = sectionRefs.current[secId];
    if (!el) return;

    setAreaOpen(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAreaOpen(false);
        if (sheet.open) setSheet({ open: false });
        if (photoModal.open) closePhotoModal();
        if (editPhoto.open) editPhoto.onClose();
      }
      if (photoModal.open) {
        if (e.key === "ArrowRight") modalNext();
        if (e.key === "ArrowLeft") modalPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoModal.open, sheet.open, editPhoto.open]);

  // keep photo preview modal photos in sync
  useEffect(() => {
    if (!photoModal.open) return;

    const s = sections.find((x) => x.id === photoModal.secId);
    const it = s?.items.find((x) => x.id === photoModal.itemId);
    const photos = it?.photos ?? [];
    if (photos.length === 0) {
      closePhotoModal();
      return;
    }
    setPhotoModal((m) => {
      if (!m.open) return m;
      return { ...m, photos, index: Math.min(m.index, photos.length - 1) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // scroll lock（modal/sheet/drawer/edit）
  useEffect(() => {
    if (!photoModal.open && !sheet.open && !areaOpen && !editPhoto.open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [photoModal.open, sheet.open, areaOpen, editPhoto.open]);

  // ======= “おしゃれ” indicator =======

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(15,17,21,0.10)",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 10px 26px rgba(15,17,21,0.08)",
    whiteSpace: "nowrap",
  };

  const meterWrap: React.CSSProperties = {
    height: 10,
    borderRadius: 999,
    background: "rgba(15,17,21,0.10)",
    overflow: "hidden",
    position: "relative",
  };

  const meterFill: React.CSSProperties = {
    height: "100%",
    width: `${progress.pct}%`,
    borderRadius: 999,
    background: hasWarn
      ? "linear-gradient(90deg, rgba(255,149,0,0.95), rgba(255,59,48,0.95))"
      : "linear-gradient(90deg, rgba(0,122,255,0.95), rgba(52,199,89,0.95))",
    boxShadow: "0 6px 18px rgba(15,17,21,0.14)",
    position: "relative",
    transition: "width 260ms ease",
  };

  const meterShine: React.CSSProperties = {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 40%, rgba(255,255,255,0) 70%)",
    transform: "translateX(-60%)",
    animation: "qscShine 2.4s ease-in-out infinite",
    opacity: progress.pct >= 10 ? 0.55 : 0,
  };

  const badgeStyle = (kind: "ok" | "hold" | "ng" | "na") => {
    const baseStyle: React.CSSProperties = { whiteSpace: "nowrap" };
    if (kind === "ng" && progress.ng > 0) {
      return {
        ...baseStyle,
        border: "1px solid rgba(255,59,48,0.35)",
        background: "rgba(255,59,48,0.10)",
      };
    }
    if (kind === "hold" && progress.hold > 0) {
      return {
        ...baseStyle,
        border: "1px solid rgba(255,149,0,0.35)",
        background: "rgba(255,149,0,0.10)",
      };
    }
    return baseStyle;
  };

  return (
    <div className={styles.qscCheckRunPage}>
      {/* ✅ keyframes（CSSファイル触らずにインジケーターだけ上品に） */}
      <style>{`
        @keyframes qscShine {
          0%   { transform: translateX(-70%); }
          50%  { transform: translateX(70%); }
          100% { transform: translateX(70%); }
        }
      `}</style>

      {/* ===== Top Bar（戻る + 場所 + エリア）===== */}
      <header className={`${styles.qscTopbar} ${styles.qscPanel}`}>
        <div className={styles.qscTopbarRow3}>
          <Link className={styles.qscBack} href="/check" aria-label="チェック一覧に戻る">
            <ChevronLeft size={16} /> 戻る
          </Link>

          <div className={styles.qscPlace} aria-label="場所">
            <Store size={16} />
            <span className={styles.qscPlaceText}>{storeLabel}</span>
          </div>

          <button
            type="button"
            className={styles.qscAreaIconBtn}
            onClick={() => setAreaOpen(true)}
            aria-label="エリアメニューを開く"
            title="エリア"
          >
            <Menu size={18} />
          </button>
        </div>

        <div className={styles.qscTopbarRow2}>
          <div className={styles.qscTitleWrap}>
            <h1 className={styles.qscTitle}>チェック</h1>
            <span className={styles.qscStorePill}>
              <Store size={14} />
              {storeLabel}
            </span>
          </div>

          <div className={styles.qscMetaPills} aria-label="条件">
            {companyId ? (
              <span className={styles.qscPill}>
                <Building2 size={14} /> {companyId}
              </span>
            ) : null}
            {bizId ? (
              <span className={styles.qscPill}>
                <Layers3 size={14} /> {bizId}
              </span>
            ) : null}
            {brandId ? (
              <span className={styles.qscPill}>
                <Tag size={14} /> {brandId}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* ===== Area Drawer ===== */}
      {areaOpen ? (
        <div className={styles.qscDrawerOverlay} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.qscDrawerOverlayClose}
            aria-label="背景クリックで閉じる"
            onClick={() => setAreaOpen(false)}
          />
          <div className={styles.qscDrawer}>
            <div className={styles.qscDrawerHead}>
              <div className={styles.qscDrawerTitle}>エリア</div>
              <button
                type="button"
                className={styles.qscDrawerClose}
                onClick={() => setAreaOpen(false)}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.qscDrawerBody}>
              {sections.map((s) => {
                const done = s.items.filter((i) => i.state !== "unset").length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={styles.qscAreaItem}
                    onClick={() => jumpTo(s.id)}
                  >
                    <span className={styles.qscAreaItemTitle}>{s.title}</span>
                    <span className={styles.qscAreaItemCount}>
                      {done}/{s.items.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Photo Preview Modal ===== */}
      {photoModal.open ? (
        <div className={styles.qscPhotoModal} role="dialog" aria-modal="true" aria-label="写真拡大">
          <div className={styles.qscPhotoModalBackdrop} onClick={closePhotoModal} />
          <div className={styles.qscPhotoModalCard}>
            <div className={styles.qscPhotoModalTop}>
              <div className={styles.qscPhotoModalTitle}>写真</div>
              <div className={styles.qscPhotoModalRight}>
                <span className={styles.qscPhotoModalCount}>
                  {photoModal.index + 1}/{photoModal.photos.length}
                </span>

                <button
                  type="button"
                  className={styles.qscPhotoModalIcon}
                  onClick={modalDeleteCurrent}
                  aria-label="この写真を削除"
                  title="削除"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  type="button"
                  className={styles.qscPhotoModalClose}
                  onClick={closePhotoModal}
                  aria-label="閉じる"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.qscPhotoModalMain}>
              <button
                type="button"
                className={`${styles.qscPhotoNav} ${styles.navLeft}`}
                onClick={modalPrev}
                disabled={photoModal.index <= 0}
                aria-label="前へ"
              >
                <ChevronLeftIcon size={22} />
              </button>

              <div className={styles.qscPhotoStage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.qscPhotoBig}
                  src={photoModal.photos[photoModal.index]?.dataUrl}
                  alt="拡大写真"
                />
              </div>

              <button
                type="button"
                className={`${styles.qscPhotoNav} ${styles.navRight}`}
                onClick={modalNext}
                disabled={photoModal.index >= photoModal.photos.length - 1}
                aria-label="次へ"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {photoModal.photos.length > 1 ? (
              <div className={styles.qscPhotoStrip} aria-label="サムネイル">
                {photoModal.photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.qscPhotoStripBtn} ${
                      idx === photoModal.index ? styles.stripOn : ""
                    }`}
                    onClick={() => setPhotoModal((m) => ({ ...m, index: idx }))}
                    aria-label={`写真 ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt={`サムネイル ${idx + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.qscPhotoModalHint}>← / → キーでも切替できます</div>
          </div>
        </div>
      ) : null}

      {/* ===== iOS Action Sheet (2 actions) ===== */}
      {sheet.open ? (
        <div className={styles.qscSheet} role="dialog" aria-modal="true" aria-label="操作メニュー">
          <button
            className={styles.qscSheetBackdrop}
            onClick={() => (sheet.onCancel ? sheet.onCancel() : setSheet({ open: false }))}
            aria-label="閉じる"
          />
          <div className={styles.qscSheetWrap}>
            <div className={styles.qscSheetCard}>
              {sheet.title ? <div className={styles.qscSheetTitle}>{sheet.title}</div> : null}
              {sheet.message ? <div className={styles.qscSheetMsg}>{sheet.message}</div> : null}

              {sheet.primaryText ? (
                <button
                  type="button"
                  className={`${styles.qscSheetBtn} ${
                    sheet.destructivePrimary ? styles.sheetDestructive : ""
                  }`}
                  onClick={() => sheet.onPrimary?.()}
                >
                  {sheet.primaryText}
                </button>
              ) : null}

              {sheet.secondaryText ? (
                <button type="button" className={styles.qscSheetBtn} onClick={() => sheet.onSecondary?.()}>
                  {sheet.secondaryText}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={`${styles.qscSheetBtn} ${styles.sheetCancel}`}
              onClick={() => (sheet.onCancel ? sheet.onCancel() : setSheet({ open: false }))}
            >
              {sheet.cancelText ?? "キャンセル"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ===== Main ===== */}
      <main className={styles.qscMain}>
        {sections.map((sec) => (
          <section
            key={sec.id}
            ref={(el) => {
              sectionRefs.current[sec.id] = el;
            }}
            className={`${styles.qscPanel} ${styles.qscSection}`}
          >
            <div className={styles.qscSectionHead}>
              <div className={styles.qscSectionTitle}>{sec.title}</div>
              <div className={styles.qscSectionCount}>
                {sec.items.filter((i) => i.state !== "unset").length}/{sec.items.length}
              </div>
            </div>

            <div className={styles.qscItems}>
              {sec.items.map((it) => {
                const needsNote = it.state === "ng" && !trimText(it.note);
                const showMissing = forceShowErrors && needsNote;
                const k = itemKey(sec.id, it.id);
                const guideOn = guideKey === k;

                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      itemRefs.current[k] = el;
                    }}
                    className={`${styles.qscItemCard} ${showMissing ? styles.itemError : ""}`}
                  >
                    <div className={styles.qscItemTop}>
                      <div className={styles.qscItemLabel}>{it.label}</div>

                      {/* ✅ 必ず横並び固定（縦落ち防止） */}
                      <div
                        className={styles.qscChoices}
                        aria-label="チェック選択"
                        style={{ flexWrap: "nowrap" }}
                      >
                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceOk} ${
                            it.state === "ok" ? styles.choiceOn : ""
                          }`}
                          onClick={() => onChoose(sec.id, it.id, "ok")}
                          aria-pressed={it.state === "ok"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <CheckCircle2 size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>OK</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceHold} ${
                            it.state === "hold" ? styles.choiceOn : ""
                          }`}
                          onClick={() => onChoose(sec.id, it.id, "hold")}
                          aria-pressed={it.state === "hold"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <PauseCircle size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>保留</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceNg} ${
                            it.state === "ng" ? styles.choiceOn : ""
                          }`}
                          onClick={() => onChoose(sec.id, it.id, "ng")}
                          aria-pressed={it.state === "ng"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <XCircle size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>NG</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceNa} ${
                            it.state === "na" ? styles.choiceOn : ""
                          }`}
                          onClick={() => onChoose(sec.id, it.id, "na")}
                          aria-pressed={it.state === "na"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <MinusCircle size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>該当なし</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.qscItemBottom}>
                      <div className={styles.qscNoteHead}>
                        <div className={styles.qscNoteTitle}>
                          {it.state === "hold" ? (
                            <>
                              <PauseCircle size={16} />
                              保留理由（1つ）
                            </>
                          ) : (
                            <>
                              <MessageSquareText size={16} />
                              コメント
                              {it.state === "ng" ? (
                                <span className={styles.qscRequired}>必須</span>
                              ) : null}
                            </>
                          )}
                        </div>

                        <div className={styles.qscPhotoHead}>
                          <label className={styles.qscPhotoAdd} aria-label="写真を追加">
                            <ImagePlus size={16} />
                            <span style={{ whiteSpace: "nowrap" }}>写真追加</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              capture="environment"
                              onChange={async (e) => {
                                const picked = e.currentTarget.files
                                  ? Array.from(e.currentTarget.files)
                                  : [];
                                e.currentTarget.value = "";
                                await addPhotosToItem(sec.id, it.id, picked);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* ✅ 保留：コメント欄はそもそも表示しない */}
                      {it.state === "hold" ? (
                        <textarea
                          ref={(el) => {
                            holdRefs.current[k] = el;
                          }}
                          className={styles.qscHoldNote}
                          value={it.holdNote ?? ""}
                          onChange={(e) => setItemHoldNote(sec.id, it.id, e.target.value)}
                          placeholder="例）現地確認が必要 / 担当者不在 / 判断保留 など"
                          rows={2}
                        />
                      ) : (
                        <>
                          <textarea
                            ref={(el) => {
                              noteRefs.current[k] = el;
                            }}
                            className={`${styles.qscNote} ${showMissing ? styles.noteMissing : ""} ${
                              guideOn ? styles.noteGuide : ""
                            }`}
                            value={it.note ?? ""}
                            onChange={(e) => setItemNote(sec.id, it.id, e.target.value)}
                            placeholder={
                              it.state === "ng"
                                ? "NG理由を入力してください（必須）"
                                : "気づいたこと、指摘、補足など…"
                            }
                            rows={2}
                            aria-invalid={showMissing}
                          />

                          {showMissing ? (
                            <div className={styles.qscErrorLine}>
                              <AlertTriangle size={16} />
                              NG の場合はコメント必須です
                            </div>
                          ) : null}
                        </>
                      )}

                      {it.photos && it.photos.length > 0 ? (
                        <div className={styles.qscPhotoGrid} aria-label="写真プレビュー">
                          {it.photos.map((p, idx) => (
                            <div key={p.id} className={styles.qscPhotoThumb}>
                              <button
                                type="button"
                                className={styles.qscPhotoOpen}
                                onClick={() => openPhotoModal(sec.id, it.id, it.photos ?? [], idx)}
                                aria-label="写真を拡大"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.dataUrl} alt="添付写真" />
                              </button>

                              <button
                                type="button"
                                className={styles.qscPhotoDel}
                                onClick={() => removePhotoFromItem(sec.id, it.id, p.id)}
                                aria-label="写真を削除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className={styles.qscBottomSpacer} aria-hidden="true" />
        <div aria-hidden="true" style={{ height: 140 }} />
      </main>

      {/* ===== Bottom Bar（固定）===== */}
      <div className={styles.qscBottomBar} role="region" aria-label="進捗と操作">
        <div className={styles.qscBottomInner}>
          <div className={styles.qscBottomLeft}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(15,17,21,0.10)",
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    boxShadow: "0 10px 26px rgba(15,17,21,0.08)",
                    whiteSpace: "nowrap",
                  }}
                  aria-label="進捗"
                >
                  <span style={{ fontWeight: 700 }}>{progress.pct}%</span>
                  <span style={{ opacity: 0.75 }}>
                    {progress.done}/{progress.total}
                  </span>
                </div>

                {/* ✅ 未チェックピル：押すと未チェックへジャンプ */}
                {progress.unset > 0 ? (
                  <button
                    type="button"
                    onClick={goFirstUnset}
                    title="未チェックへ移動"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,149,0,0.22)",
                      background: "rgba(255,149,0,0.10)",
                      boxShadow: "0 10px 26px rgba(15,17,21,0.08)",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span style={{ fontWeight: 700 }}>未チェック</span>
                    <span>{progress.unset}件</span>
                  </button>
                ) : null}

                {hasWarn ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,149,0,0.22)",
                      background: "rgba(255,149,0,0.08)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span style={{ fontWeight: 700 }}>要確認</span>
                    <span>保留 {progress.hold}</span>
                    <span>/</span>
                    <span>NG {progress.ng}</span>
                  </div>
                ) : null}

                {forceShowErrors && hasMissingRequiredNotes ? (
                  <button
                    type="button"
                    onClick={scrollToFirstMissingRequired}
                    title="未入力へ移動"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,59,48,0.22)",
                      background: "rgba(255,59,48,0.10)",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span style={{ fontWeight: 800 }}>必須未入力</span>
                    <span>{missingRequiredNotes.length}件</span>
                  </button>
                ) : null}
              </div>

              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(15,17,21,0.10)",
                  overflow: "hidden",
                  position: "relative",
                }}
                aria-label="進捗バー"
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress.pct}%`,
                    borderRadius: 999,
                    background: hasWarn
                      ? "linear-gradient(90deg, rgba(255,149,0,0.95), rgba(255,59,48,0.95))"
                      : "linear-gradient(90deg, rgba(0,122,255,0.95), rgba(52,199,89,0.95))",
                    boxShadow: "0 6px 18px rgba(15,17,21,0.14)",
                    position: "relative",
                    transition: "width 260ms ease",
                  }}
                />
              </div>
            </div>

            <div className={styles.qscProgressBadges} aria-label="内訳" style={{ marginTop: 10 }}>
              <span className={styles.qscBadge} style={badgeStyle("ok")}>
                OK {progress.ok}
              </span>
              <span className={styles.qscBadge} style={badgeStyle("hold")}>
                保留 {progress.hold}
              </span>
              <span className={styles.qscBadge} style={badgeStyle("ng")}>
                NG {progress.ng}
              </span>
              <span className={styles.qscBadge} style={badgeStyle("na")}>
                該当なし {progress.na}
              </span>
            </div>
          </div>

          <div className={styles.qscBottomRight}>
            <button
              type="button"
              className={`${styles.qscAction} ${styles.actionGhost} ${saving ? styles.actionBusy : ""}`}
              onClick={saveDraft}
              disabled={saving}
            >
              <Save size={18} />
              <span style={{ whiteSpace: "nowrap" }}>{saving ? "保存中…" : "途中保存"}</span>
            </button>

            <button
              type="button"
              className={`${styles.qscAction} ${styles.actionGhost}`}
              onClick={discardDraft}
              title="途中保存データを破棄"
            >
              <Trash2 size={18} />
              <span style={{ whiteSpace: "nowrap" }}>破棄</span>
            </button>

            <button
              type="button"
              className={`${styles.qscAction} ${styles.actionPrimary} ${submitBusy ? styles.actionBusy : ""}`}
              onClick={submit}
              disabled={submitBusy}
              title={
                hasMissingRequiredNotes
                  ? "必須コメント未入力があります"
                  : progress.unset > 0
                  ? "未チェック項目があります"
                  : "完了"
              }
            >
              <Send size={18} />
              <span style={{ whiteSpace: "nowrap" }}>{submitBusy ? "送信中…" : "完了"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 重要：PhotoEditModal は “JSXの最後” に置く */}
      <PhotoEditModal
        open={editPhoto.open}
        dataUrl={editPhoto.dataUrl}
        onClose={editPhoto.onClose}
        onSave={editPhoto.onSave}
      />
    </div>
  );
}
