// src/app/check/run/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowDown,
} from "lucide-react";

import base from "./CheckRunPage.base.module.css";
import modal from "./CheckRunPage.modal.module.css";
import bottom from "./CheckRunPage.bottom.module.css";

import PhotoEditModal from "./PhotoEditModal";

const styles = { ...base, ...modal, ...bottom };

/* =========================
   ✅ Z-INDEX LAYERING
   ========================= */
const Z = {
  bottomDock: 9000,
  overlay: 11000, // Drawer
  sheet: 11100, // Confirm sheet
  photoModal: 11200, // Photo viewer
  editModal: 20000, // PhotoEditModal (最上位)
} as const;

/* ========================= Types ========================= */
type CheckState = "ok" | "hold" | "ng" | "na" | "unset";

type Photo = {
  id: string;
  dataUrl: string;
};

type CheckItem = {
  id: string;
  label: string;
  state: CheckState;
  note?: string; // NGのみ必須
  holdNote?: string; // 保留理由（テキスト1つ）
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

/* ========================= Constants ========================= */
// ✅ UX向上：よく使う定型文
const NG_PRESETS = ["汚れが目立つ", "整理整頓されていない", "破損がある", "補充不足", "異臭がする"];
const HOLD_PRESETS = ["担当者に確認中", "後日対応予定", "現地判断不能", "業者手配済み"];

/* ========================= Helpers ========================= */
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

// ✅ UX向上：スマホ用触覚フィードバック
function vibrate(ms = 15) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function sectionTheme(secId: string) {
  const map: Record<string, { tint: string; accent: string }> = {
    sec_entrance: { tint: "rgba(35,110,255,0.10)", accent: "rgba(35,110,255,0.55)" }, // blue
    sec_floor: { tint: "rgba(52,199,89,0.10)", accent: "rgba(52,199,89,0.55)" }, // green
    sec_toilet: { tint: "rgba(255,149,0,0.10)", accent: "rgba(255,149,0,0.60)" }, // orange
  };
  return map[secId] ?? { tint: "rgba(175,82,222,0.10)", accent: "rgba(175,82,222,0.55)" }; // purple fallback
}

type PhotoModalState = {
  open: boolean;
  secId: string;
  itemId: string;
  photos: Photo[];
  index: number;
};

type ActionSheetState =
  | { open: false }
  | {
      open: true;
      title?: string;
      message?: string;
      primaryText?: string;
      onPrimary?: () => void | Promise<void>;
      destructivePrimary?: boolean;
      secondaryText?: string;
      onSecondary?: () => void | Promise<void>;
      cancelText?: string;
      onCancel?: () => void;
    };

export default function CheckRunPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const companyId = sp.get("companyId") || "";
  const bizId = sp.get("bizId") || "";
  const brandId = sp.get("brandId") || "";
  const storeId = sp.get("storeId") || "";

  const storeLabel = useMemo(() => {
    if (!storeId) return "店舗未選択";
    return `Store ${storeId}`;
  }, [storeId]);

  const DRAFT_KEY = useMemo(() => {
    const key = [companyId, bizId, brandId, storeId].filter(Boolean).join("_");
    return `qsc_check_draft_${key || "unknown"}`;
  }, [companyId, bizId, brandId, storeId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [sections, setSections] = useState<Section[]>(() => DEFAULT_SECTIONS);

  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted, DRAFT_KEY]);

  const [saving, setSaving] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const noteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const holdRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ActionSheetState>({ open: false });
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({
    open: false,
    secId: "",
    itemId: "",
    photos: [],
    index: 0,
  });
  const pickPhotoRef = useRef<HTMLInputElement | null>(null);

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

  const [forceShowErrors, setForceShowErrors] = useState(false);
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<{ secId: string; itemId: string } | null>(null);

  const sectionAlert = useMemo(() => {
    const out: Record<string, { ng: number; hold: number; done: number; total: number }> = {};
    for (const s of sections) {
      const ng = s.items.filter((i) => i.state === "ng").length;
      const hold = s.items.filter((i) => i.state === "hold").length;
      const done = s.items.filter((i) => i.state !== "unset").length;
      out[s.id] = { ng, hold, done, total: s.items.length };
    }
    return out;
  }, [sections]);

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
    const ratio = {
      ok: ok / total,
      hold: hold / total,
      ng: ng / total,
      na: na / total,
      unset: unset / total,
    };
    return { done, total, pct, ok, hold, ng, na, unset, ratio };
  }, [sections]);

  const hasWarn = progress.ng > 0 || progress.hold > 0;

  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    try {
      setBottomCollapsed(localStorage.getItem("qsc_run_bottom_collapsed") === "1");
    } catch {}
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("qsc_run_bottom_collapsed", bottomCollapsed ? "1" : "0");
    } catch {}
  }, [mounted, bottomCollapsed]);

  const swipeStartY = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeAt = useRef<number>(0);

  const onSwipeStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    swipeAt.current = Date.now();
    swipeStartY.current = e.touches[0].clientY;
    swipeStartX.current = e.touches[0].clientX;
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    const sy = swipeStartY.current;
    const sx = swipeStartX.current;
    swipeStartY.current = null;
    swipeStartX.current = null;
    if (sy == null || sx == null) return;

    const t = Date.now() - swipeAt.current;
    const end = e.changedTouches[0];
    const dy = end.clientY - sy;
    const dx = end.clientX - sx;

    if (Math.abs(dx) > Math.abs(dy)) return;
    if (Math.abs(dy) < 24) return;

    if (t < 180 && Math.abs(dy) > 18) {
      if (dy < 0) setBottomCollapsed(false);
      if (dy > 0) setBottomCollapsed(true);
      return;
    }

    if (dy < 0) setBottomCollapsed(false);
    if (dy > 0) setBottomCollapsed(true);
  };

  const scrollMainTo = (top: number) => {
    const main = mainRef.current;
    if (!main) {
      window.scrollTo({ top, behavior: "smooth" });
      return;
    }
    main.scrollTo({ top, behavior: "smooth" });
  };

  const scrollToItem = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    const el = itemRefs.current[k];
    const main = mainRef.current;
    if (el && main) {
      const top = el.offsetTop - 84;
      scrollMainTo(Math.max(0, top));
      return;
    }
    const secEl = sectionRefs.current[secId];
    if (!secEl) return;
    if (main) {
      const top = secEl.offsetTop - 84;
      scrollMainTo(Math.max(0, top));
    } else {
      const top = secEl.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top, behavior: "smooth" });
    }
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
          : {
              ...s,
              items: s.items.map((it) => (it.id !== itemId ? it : { ...it, note })),
            }
      )
    );
  };

  // ✅ UX向上：定型文を追記する
  const appendItemNote = (secId: string, itemId: string, text: string, isHold = false) => {
    vibrate(10); // 触覚フィードバック
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId) return it;
                if (isHold) {
                   // 保留理由：既に何かあれば改行して追記
                   const current = it.holdNote || "";
                   const next = current ? `${current}\n${text}` : text;
                   return { ...it, holdNote: next };
                } else {
                   // NGコメント：既に何かあれば改行して追記
                   const current = it.note || "";
                   const next = current ? `${current}\n${text}` : text;
                   return { ...it, note: next };
                }
              }),
            }
      )
    );
  };

  const setItemHoldNote = (secId: string, itemId: string, holdNote: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => (it.id !== itemId ? it : { ...it, holdNote })),
            }
      )
    );
  };

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

  // 📸 写真追加フロー（修正版）
  const addPhotosToItem = async (secId: string, itemId: string, files: File[]) => {
    if (!files || files.length === 0) return;
    
    // 一度に大量に処理すると重いので制限
    const arr = files.slice(0, 5); 
    const added: Photo[] = [];

    for (const f of arr) {
      try {
        const original = await readFileAsDataUrl(f);
        
        // ✅ 編集モーダルを呼び出す (awaitで完了を待つ)
        const edited = await openPhotoEditor(original);
        
        // 編集画面で「保存」された場合のみ追加する
        // (キャンセルされた場合は追加しない)
        if (edited) {
          added.push({ id: uid("ph"), dataUrl: edited });
        }
      } catch (err) {
        console.error("Photo load error:", err);
      }
    }

    if (added.length === 0) return;

    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId) return it;
                return { ...it, photos: (it.photos ?? []).concat(added) };
              }),
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

  const pulseGuide = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    setGuideKey(k);
    window.setTimeout(() => {
      setGuideKey((cur) => (cur === k ? null : cur));
    }, 900);
  };

  const focusNote = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    requestAnimationFrame(() => {
      const el = noteRefs.current[k];
      const main = mainRef.current;
      if (!el) return;
      if (main) {
        const target = Math.max(0, el.offsetTop - 84 - 6);
        scrollMainTo(target);
      }
      pulseGuide(secId, itemId);
      setTimeout(() => {
        el.focus();
        // カーソルを末尾へ
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }, 240);
    });
  };

  const focusHold = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    requestAnimationFrame(() => {
      const el = holdRefs.current[k];
      const main = mainRef.current;
      if (!el) return;
      if (main) {
        const target = Math.max(0, el.offsetTop - 84 - 6);
        scrollMainTo(target);
      }
      pulseGuide(secId, itemId);
      setTimeout(() => {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }, 220);
    });
  };

  // ✅ UX向上：振動＋NG時の自動フォーカス
  const onChoose = (secId: string, itemId: string, state: CheckState) => {
    vibrate(); // 触覚フィードバック
    setItemState(secId, itemId, state);

    // NGなら自動でコメント欄へ
    if (state === 'ng') {
      // 状態更新反映を待ってフォーカス
      setTimeout(() => {
        focusNote(secId, itemId);
      }, 100);
    } else if (state === 'hold') {
      setTimeout(() => {
        focusHold(secId, itemId);
      }, 100);
    }
  };

  const openPhotoPicker = (secId: string, itemId: string) => {
    vibrate();
    setPendingPhotoTarget({ secId, itemId });
    requestAnimationFrame(() => pickPhotoRef.current?.click());
  };

  const closePhotoModal = () => setPhotoModal((m) => ({ ...m, open: false }));

  const openPhotoModalAt = (secId: string, itemId: string, index: number) => {
    vibrate(10);
    const s = sections.find((x) => x.id === secId);
    const it = s?.items.find((x) => x.id === itemId);
    const photos = it?.photos ?? [];
    if (photos.length === 0) return;
    setPhotoModal({
      open: true,
      secId,
      itemId,
      photos,
      index: Math.max(0, Math.min(index, photos.length - 1)),
    });
  };

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

  const saveDraft = async () => {
    if (saving) return;
    vibrate();
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
    vibrate();
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

  async function sendCompletionMailStub() {
    await new Promise((r) => setTimeout(r, 200));
  }

  const submitCore = async (sendMail: boolean) => {
    setForceShowErrors(true);
    if (hasMissingRequiredNotes) {
      scrollToFirstMissingRequired();
      return;
    }
    setSubmitBusy(true);
    try {
      if (sendMail) await sendCompletionMailStub();
      localStorage.setItem(`${DRAFT_KEY}_submittedAt`, new Date().toISOString());
      await new Promise((r) => setTimeout(r, 280));
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

  const submit = () => {
    vibrate();
    if (submitBusy) return;
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
    openCompleteMailSheet();
  };

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
  }, [photoModal.open, sheet.open, editPhoto.open]);

  useEffect(() => {
    if (!photoModal.open) return;
    const s = sections.find((x) => x.id === photoModal.secId);
    const it = s?.items.find((x) => x.id === photoModal.itemId);
    const photos = it?.photos ?? [];
    if (photos.length === 0) {
      closePhotoModal();
      return;
    }
    setPhotoModal((m) => ({ ...m, photos, index: Math.min(m.index, photos.length - 1) }));
  }, [sections]);

  useEffect(() => {
    if (!photoModal.open && !sheet.open && !areaOpen && !editPhoto.open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [photoModal.open, sheet.open, areaOpen, editPhoto.open]);

  const [currentSecId, setCurrentSecId] = useState<string>(() => sections[0]?.id ?? "");

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    const ids = sections.map((s) => s.id);
    if (ids.length === 0) return;
    const targets = ids.map((id) => sectionRefs.current[id]).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset["secid"] || "";
          if (!id) continue;
          ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestId = currentSecId;
        let best = -1;
        for (const id of ids) {
          const r = ratios.get(id) ?? 0;
          if (r > best) {
            best = r;
            bestId = id;
          }
        }
        if (bestId && bestId !== currentSecId) setCurrentSecId(bestId);
      },
      {
        root,
        threshold: [0, 0.12, 0.25, 0.35, 0.5, 0.65, 0.8, 1],
      }
    );
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, [sections]);

  const badgeStyle = (kind: "ok" | "hold" | "ng" | "na") => {
    const baseStyle: React.CSSProperties = { whiteSpace: "nowrap" };
    if (kind === "ng" && progress.ng > 0) {
      return { ...baseStyle, border: "1px solid rgba(255,59,48,0.35)", background: "rgba(255,59,48,0.10)" };
    }
    if (kind === "hold" && progress.hold > 0) {
      return { ...baseStyle, border: "1px solid rgba(255,149,0,0.35)", background: "rgba(255,149,0,0.10)" };
    }
    return baseStyle;
  };

  const bottomDockCollapsedH = 72;
  const bottomDockExpandedH = 260;
  const bottomDockH = bottomCollapsed ? bottomDockCollapsedH : bottomDockExpandedH;

  return (
    <div className={styles.qscCheckRunPage} style={{ ["--qscBottomH" as any]: `${bottomDockH}px` }}>
      {/* スマホ枠はみ出し防止 */}
      <style>{`
        html, body { max-width: 100%; overflow-x: hidden; }
        body { margin: 0; }
        @media (max-width: 420px) {
          .qscCompactCard { padding: 12px !important; border-radius: 16px !important; }
          .qscCompactLabel { font-size: 14px !important; line-height: 1.25 !important; }
          .qscCompactChoices button { padding: 8px 8px !important; gap: 6px !important; font-size: 12px !important; }
          .qscCompactChoices svg { width: 15px !important; height: 15px !important; }
          .qscCompactNote, .qscCompactHold { padding: 10px 10px !important; font-size: 16px !important; }
        }
        .qscOverlayLayer{ position: fixed; inset: 0; z-index: ${Z.overlay}; }
        .qscSheetLayer{ position: fixed; inset: 0; z-index: ${Z.sheet}; }
        .qscPhotoLayer{ position: fixed; inset: 0; z-index: ${Z.photoModal}; }
        [data-qsc-main]{ padding-bottom: calc(var(--qscBottomH, 0px) + env(safe-area-inset-bottom) + 16px); }
      `}</style>

      {/* Top Bar */}
      <header className={styles.qscTopbar}>
        <div className={styles.qscTopbarRow3}>
          <Link className={styles.qscBack} href="/check" aria-label="チェック一覧に戻る" onClick={() => vibrate(10)}>
            <ChevronLeft size={16} /> 戻る
          </Link>
          <div className={styles.qscPlace} aria-label="場所">
            <Store size={16} />
            <span className={styles.qscPlaceText}>{storeLabel}</span>
          </div>
          <button type="button" className={styles.qscAreaIconBtn} onClick={() => { vibrate(10); setAreaOpen(true); }} aria-label="エリアメニュー" title="エリア">
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Area Drawer */}
      {areaOpen && (
        <div className="qscOverlayLayer" role="dialog" aria-modal="true" aria-label="エリアメニュー">
          <div className={styles.qscDrawerOverlay}>
            <button type="button" className={styles.qscDrawerOverlayClose} aria-label="閉じる" onClick={() => setAreaOpen(false)} />
            <div className={styles.qscDrawer}>
              <div className={styles.qscDrawerHead}>
                <div className={styles.qscDrawerTitle}>エリア</div>
                <button type="button" className={styles.qscDrawerClose} onClick={() => setAreaOpen(false)} aria-label="閉じる">
                  <X size={18} />
                </button>
              </div>
              <div className={styles.qscDrawerBody}>
                {sections.map((s) => {
                  const st = sectionAlert[s.id] ?? { ng: 0, hold: 0, done: 0, total: s.items.length };
                  const isCurrent = s.id === currentSecId;
                  const warnNg = st.ng > 0;
                  const warnHold = !warnNg && st.hold > 0;
                  const cls = [
                    styles.qscAreaItem,
                    isCurrent ? styles.areaCurrent : "",
                    warnNg ? styles.areaWarnNg : "",
                    warnHold ? styles.areaWarnHold : "",
                  ].filter(Boolean).join(" ");

                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={cls}
                      onClick={() => {
                        vibrate(10);
                        const main = mainRef.current;
                        const el = sectionRefs.current[s.id];
                        if (!el) return;
                        setAreaOpen(false);
                        requestAnimationFrame(() => {
                          if (main) {
                            const top = Math.max(0, el.offsetTop - 84);
                            main.scrollTo({ top, behavior: "smooth" });
                          } else {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        });
                      }}
                    >
                      <span className={styles.qscAreaItemTitle}>{s.title}</span>
                      <span className={styles.qscAreaBadges} aria-label="エリア状況">
                        {st.ng > 0 && <span className={`${styles.qscAreaBadge} ${styles.areaBadgeNg}`}>NG {st.ng}</span>}
                        {st.hold > 0 && <span className={`${styles.qscAreaBadge} ${styles.areaBadgeHold}`}>保留 {st.hold}</span>}
                        <span className={styles.qscAreaItemCount}>{st.done}/{st.total}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo modal */}
      {photoModal.open && (
        <div className="qscPhotoLayer" role="dialog" aria-modal="true" aria-label="写真拡大">
          <div className={styles.qscPhotoModal}>
            <div className={styles.qscPhotoModalBackdrop} onClick={closePhotoModal} />
            <div className={styles.qscPhotoModalCard}>
              <div className={styles.qscPhotoModalTop}>
                <div className={styles.qscPhotoModalTitle}>写真</div>
                <div className={styles.qscPhotoModalRight}>
                  <span className={styles.qscPhotoModalCount}>{photoModal.index + 1}/{photoModal.photos.length}</span>
                  <button type="button" className={styles.qscPhotoModalIcon} onClick={modalDeleteCurrent} aria-label="削除" title="削除">
                    <Trash2 size={18} />
                  </button>
                  <button type="button" className={styles.qscPhotoModalClose} onClick={closePhotoModal} aria-label="閉じる">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className={styles.qscPhotoModalMain}>
                <button type="button" className={`${styles.qscPhotoNav} ${styles.navLeft}`} onClick={modalPrev} disabled={photoModal.index <= 0} aria-label="前へ">
                  <ChevronLeftIcon size={22} />
                </button>
                <div className={styles.qscPhotoStage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.qscPhotoBig} src={photoModal.photos[photoModal.index]?.dataUrl} alt="拡大写真" />
                </div>
                <button type="button" className={`${styles.qscPhotoNav} ${styles.navRight}`} onClick={modalNext} disabled={photoModal.index >= photoModal.photos.length - 1} aria-label="次へ">
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sheet */}
      {sheet.open && (
        <div className="qscSheetLayer" role="dialog" aria-modal="true" aria-label="操作メニュー">
          <div className={styles.qscSheet}>
            <button className={styles.qscSheetBackdrop} onClick={() => (sheet.onCancel ? sheet.onCancel() : setSheet({ open: false }))} aria-label="閉じる" />
            <div className={styles.qscSheetWrap}>
              <div className={styles.qscSheetCard}>
                {sheet.title && <div className={styles.qscSheetTitle}>{sheet.title}</div>}
                {sheet.message && <div className={styles.qscSheetMsg}>{sheet.message}</div>}
                {sheet.primaryText && (
                  <button type="button" className={`${styles.qscSheetBtn} ${sheet.destructivePrimary ? styles.sheetDestructive : ""}`} onClick={() => { vibrate(10); sheet.onPrimary?.(); }}>
                    {sheet.primaryText}
                  </button>
                )}
                {sheet.secondaryText && (
                  <button type="button" className={styles.qscSheetBtn} onClick={() => { vibrate(10); sheet.onSecondary?.(); }}>
                    {sheet.secondaryText}
                  </button>
                )}
              </div>
              <button type="button" className={`${styles.qscSheetBtn} ${styles.sheetCancel}`} onClick={() => { vibrate(10); sheet.onCancel ? sheet.onCancel() : setSheet({ open: false }); }}>
                {sheet.cancelText ?? "キャンセル"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <main
        ref={(el) => { mainRef.current = el; }}
        className={`${styles.qscMain} ${styles.qscMainPad}`}
        style={{ ["--qscBottomH" as any]: `${bottomDockH}px` } as React.CSSProperties}
      >
        {sections.map((sec, secIdx) => {
          const th = sectionTheme(sec.id);
          const nextSec = sections[secIdx + 1];

          return (
            <section
              key={sec.id}
              data-secid={sec.id}
              ref={(el) => { sectionRefs.current[sec.id] = el; }}
              className={`${styles.qscPanel} ${styles.qscSection} ${styles.qscSectionTint}`}
              style={{ ["--secTint" as any]: th.tint, ["--secAccent" as any]: th.accent } as React.CSSProperties}
            >
              <div className={styles.qscSectionHead}>
                <div className={styles.qscSectionTitle}>{sec.title}</div>
                <div className={styles.qscSectionCount}>{sec.items.filter((i) => i.state !== "unset").length}/{sec.items.length}</div>
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
                      ref={(el) => { itemRefs.current[k] = el; }}
                      className={`${styles.qscItemCard} ${styles.qscItemTint} qscCompactCard ${showMissing ? styles.itemError : ""}`}
                      style={{ ["--secTint" as any]: th.tint, ["--secAccent" as any]: th.accent } as React.CSSProperties}
                    >
                      <div className={styles.qscItemTop}>
                        <div className={`${styles.qscItemLabel} qscCompactLabel`}>{it.label}</div>
                        <div className={`${styles.qscChoices} qscCompactChoices`} aria-label="チェック選択">
                          <button type="button" className={`${styles.qscChoice} ${styles.choiceOk} ${it.state === "ok" ? styles.choiceOn : ""}`} onClick={() => onChoose(sec.id, it.id, "ok")} aria-pressed={it.state === "ok"}>
                            <span className={styles.qscChoiceDot} aria-hidden="true" />
                            <CheckCircle2 size={16} />
                            <span style={{ whiteSpace: "nowrap" }}>OK</span>
                          </button>
                          <button type="button" className={`${styles.qscChoice} ${styles.choiceHold} ${it.state === "hold" ? styles.choiceOn : ""}`} onClick={() => onChoose(sec.id, it.id, "hold")} aria-pressed={it.state === "hold"}>
                            <span className={styles.qscChoiceDot} aria-hidden="true" />
                            <PauseCircle size={16} />
                            <span style={{ whiteSpace: "nowrap" }}>保留</span>
                          </button>
                          <button type="button" className={`${styles.qscChoice} ${styles.choiceNg} ${it.state === "ng" ? styles.choiceOn : ""}`} onClick={() => onChoose(sec.id, it.id, "ng")} aria-pressed={it.state === "ng"}>
                            <span className={styles.qscChoiceDot} aria-hidden="true" />
                            <XCircle size={16} />
                            <span style={{ whiteSpace: "nowrap" }}>NG</span>
                          </button>
                          <button type="button" className={`${styles.qscChoice} ${styles.choiceNa} ${it.state === "na" ? styles.choiceOn : ""}`} onClick={() => onChoose(sec.id, it.id, "na")} aria-pressed={it.state === "na"}>
                            <span className={styles.qscChoiceDot} aria-hidden="true" />
                            <MinusCircle size={16} />
                            <span style={{ whiteSpace: "nowrap" }}>該当なし</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.qscItemBottom}>
                        <div className={styles.qscNoteHead}>
                          <div className={styles.qscNoteTitle}>
                            {it.state === "hold" ? <><PauseCircle size={16} /> 保留理由</> : <><MessageSquareText size={16} /> コメント{it.state === "ng" ? <span className={styles.qscRequired}>必須</span> : null}</>}
                          </div>
                          <div className={styles.qscPhotoHead}>
                            <button type="button" className={styles.qscPhotoAdd} aria-label="写真を追加" onClick={() => openPhotoPicker(sec.id, it.id)}>
                              <ImagePlus size={16} />
                              <span style={{ whiteSpace: "nowrap" }}>写真追加</span>
                            </button>
                          </div>
                        </div>

                        {/* Photos */}
                        {(it.photos?.length ?? 0) > 0 && (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, position: "relative", zIndex: 1 }}>
                            {(it.photos ?? []).map((p, idx) => (
                              <button key={p.id} type="button" onClick={() => openPhotoModalAt(sec.id, it.id, idx)} style={{ width: 72, height: 72, borderRadius: 14, border: "1px solid rgba(15,17,21,0.10)", overflow: "hidden", padding: 0, background: "rgba(255,255,255,0.65)", cursor: "pointer" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.dataUrl} alt={`写真 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Note & Presets */}
                        {it.state === "hold" ? (
                          <>
                            <textarea
                              ref={(el) => { holdRefs.current[k] = el; }}
                              className={`${styles.qscHoldNote} qscCompactHold`}
                              value={it.holdNote ?? ""}
                              onChange={(e) => setItemHoldNote(sec.id, it.id, e.target.value)}
                              placeholder="保留の理由を入力してください"
                              rows={2}
                            />
                            {/* ✅ UX向上：保留用の定型文チップ */}
                            <div className={styles.qscPresetScroll}>
                                {HOLD_PRESETS.map((txt) => (
                                  <button key={txt} type="button" className={styles.qscPresetChip} onClick={() => appendItemNote(sec.id, it.id, txt, true)}>
                                    <Plus size={12} /> {txt}
                                  </button>
                                ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <textarea
                              ref={(el) => { noteRefs.current[k] = el; }}
                              className={`${styles.qscNote} qscCompactNote ${showMissing ? styles.noteMissing : ""} ${guideOn ? styles.noteGuide : ""}`}
                              value={it.note ?? ""}
                              onChange={(e) => setItemNote(sec.id, it.id, e.target.value)}
                              placeholder={it.state === "ng" ? "NG理由（必須）" : "コメントを入力"}
                              rows={2}
                              aria-invalid={showMissing}
                            />
                            {/* ✅ UX向上：NG用の定型文チップ */}
                            {it.state === "ng" && (
                              <div className={styles.qscPresetScroll}>
                                {NG_PRESETS.map((txt) => (
                                  <button key={txt} type="button" className={styles.qscPresetChip} onClick={() => appendItemNote(sec.id, it.id, txt, false)}>
                                    <Plus size={12} /> {txt}
                                  </button>
                                ))}
                              </div>
                            )}
                            {showMissing && <div className={styles.qscErrorLine}><AlertTriangle size={16} /> NG の場合はコメント必須です</div>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ✅ UX向上：次のセクションへ進むボタン（最後以外に表示） */}
              {nextSec && (
                 <button type="button" className={styles.qscNextSecBtn} onClick={() => {
                    vibrate(10);
                    const el = sectionRefs.current[nextSec.id];
                    if(el) {
                       const top = Math.max(0, el.offsetTop - 84);
                       scrollMainTo(top);
                    }
                 }}>
                   <span>次のエリアへ（{nextSec.title}）</span>
                   <ArrowDown size={16} />
                 </button>
              )}

            </section>
          );
        })}
      </main>

      {/* Bottom Dock */}
      <div className={styles.qscBottomDock} style={{ ["--qscBottomH" as any]: `${bottomDockH}px` }}>
        <div className={styles.qscBottomDockInner}>
          <div className={styles.qscBottomCard} role="region" aria-label="進捗と操作">
            <div className={styles.qscGrab} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
              <div className={styles.qscGrabBar} />
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className={styles.qscCollapseBtn} onClick={() => { vibrate(10); setBottomCollapsed((v) => !v); }} aria-label={bottomCollapsed ? "開く" : "畳む"}>
                  {bottomCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span style={{ fontWeight: 800 }}>{bottomCollapsed ? "表示" : "最小化"}</span>
                </button>
                <div className={styles.qscIndicatorWrap} style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 999, background: `conic-gradient(rgba(52,199,89,0.95) ${progress.pct * 3.6}deg, rgba(15,17,21,0.10) 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)", border: "1px solid rgba(15,17,21,0.06)" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "rgba(15,17,21,0.86)", background: "rgba(255,255,255,0.70)", border: "1px solid rgba(15,17,21,0.08)" }}>{progress.pct}%</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, opacity: 0.9 }}>{progress.done}/{progress.total}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{hasWarn ? "要確認あり" : "順調"}</div>
                    </div>
                    <div className={styles.qscSegBar}>
                      <div className={`${styles.qscSeg} ${styles.qscSegOk}`} style={{ width: `${progress.ratio.ok * 100}%` }} />
                      <div className={`${styles.qscSeg} ${styles.qscSegHold}`} style={{ width: `${progress.ratio.hold * 100}%` }} />
                      <div className={`${styles.qscSeg} ${styles.qscSegNg}`} style={{ width: `${progress.ratio.ng * 100}%` }} />
                      <div className={`${styles.qscSeg} ${styles.qscSegNa}`} style={{ width: `${progress.ratio.na * 100}%` }} />
                      <div className={`${styles.qscSeg} ${styles.qscSegUnset}`} style={{ width: `${progress.ratio.unset * 100}%` }} />
                    </div>
                  </div>
                </div>
                {progress.unset > 0 && (
                  <button type="button" onClick={goFirstUnset} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(255,149,0,0.22)", background: "rgba(255,149,0,0.10)", whiteSpace: "nowrap", cursor: "pointer" }}>
                    <AlertTriangle size={16} />
                    <span style={{ fontWeight: 900 }}>未チェック</span>
                    <span>{progress.unset}件</span>
                  </button>
                )}
              </div>

              {!bottomCollapsed && (
                <>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={styles.qscBadge} style={badgeStyle("ok")}>OK {progress.ok}</span>
                    <span className={styles.qscBadge} style={badgeStyle("hold")}>保留 {progress.hold}</span>
                    <span className={styles.qscBadge} style={badgeStyle("ng")}>NG {progress.ng}</span>
                    <span className={styles.qscBadge} style={badgeStyle("na")}>該当なし {progress.na}</span>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button type="button" className={`${styles.qscAction} ${styles.actionGhost}`} onClick={saveDraft} disabled={saving} style={{ flex: 1 }}>
                      <Save size={18} />
                      <span style={{ whiteSpace: "nowrap" }}>{saving ? "保存中…" : "途中保存"}</span>
                    </button>
                    <button type="button" className={`${styles.qscAction} ${styles.actionGhost}`} onClick={discardDraft} disabled={saving || submitBusy} style={{ flex: 1 }} title="途中データを破棄">
                      <Trash2 size={18} />
                      <span style={{ whiteSpace: "nowrap" }}>破棄</span>
                    </button>
                    <button type="button" className={`${styles.qscAction} ${styles.actionPrimary}`} onClick={submit} disabled={submitBusy} style={{ flex: 1 }}>
                      <Send size={18} />
                      <span style={{ whiteSpace: "nowrap" }}>{submitBusy ? "送信中…" : "完了"}</span>
                    </button>
                  </div>
                  {forceShowErrors && hasMissingRequiredNotes && (
                    <button type="button" onClick={scrollToFirstMissingRequired} style={{ marginTop: 10, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,59,48,0.22)", background: "rgba(255,59,48,0.10)", fontWeight: 900 }}>
                      <AlertTriangle size={16} /> 必須未入力：{missingRequiredNotes.length}件（移動）
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", inset: 0, zIndex: Z.editModal, pointerEvents: editPhoto.open ? "auto" : "none" }}>
        <PhotoEditModal open={editPhoto.open} dataUrl={editPhoto.dataUrl} onClose={editPhoto.onClose} onSave={editPhoto.onSave} />
      </div>

      <input
        ref={pickPhotoRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          const target = pendingPhotoTarget;
          const picked = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
          e.currentTarget.value = "";
          if (!target || picked.length === 0) return;
          await addPhotosToItem(target.secId, target.itemId, picked);
          setPendingPhotoTarget(null);
        }}
      />
    </div>
  );
}