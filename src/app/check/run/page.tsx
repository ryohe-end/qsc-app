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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import base from "./CheckRunPage.base.module.css";
import modal from "./CheckRunPage.modal.module.css";
import bottom from "./CheckRunPage.bottom.module.css";

import PhotoEditModal from "./PhotoEditModal";

const styles = { ...base, ...modal, ...bottom };

/* =========================
   ✅ Z-INDEX LAYERING
   BottomDock が強いので、オーバーレイ類を必ず上へ。
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

  // DRAFT_KEY が変わったらロードし直す
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

  const [areaOpen, setAreaOpen] = useState(false);

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

  /* =========================
     ✅ progress: 指標 + “おしゃれインジケータ”用（割合）
     ========================= */
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

  /* ========================= ✅ BottomBar: 折りたたみ + スワイプ ========================= */
  const [bottomCollapsed, setBottomCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qsc_run_bottom_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("qsc_run_bottom_collapsed", bottomCollapsed ? "1" : "0");
    } catch {}
  }, [bottomCollapsed]);

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

    if (dy < 0) setBottomCollapsed(false);
    if (dy > 0) setBottomCollapsed(true);

    if (t < 180 && Math.abs(dy) > 18) {
      if (dy < 0) setBottomCollapsed(false);
      if (dy > 0) setBottomCollapsed(true);
    }
  };

  // ======= navigation helpers =======
  const scrollToItem = (secId: string, itemId: string) => {
    const k = itemKey(secId, itemId);
    const el = itemRefs.current[k];
    if (!el) {
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
  // ======= photo editor bridge =======
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

  // ✅ 写真追加：編集できなくても original を必ず採用（＝サムネが絶対出る）
  const addPhotosToItem = async (secId: string, itemId: string, files: File[]) => {
    if (!files || files.length === 0) return;

    const arr = files.slice(0, 30);
    const added: Photo[] = [];

    for (const f of arr) {
      try {
        const original = await readFileAsDataUrl(f);

        const edited = await openPhotoEditor(original);
        const finalDataUrl = edited ?? original; // ✅ fallback

        added.push({ id: uid("ph"), dataUrl: finalDataUrl });
      } catch (err) {
        console.error("[addPhotosToItem] failed file:", f?.name, err);
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

  // ======= photo modal open helpers =======
  const closePhotoModal = () => setPhotoModal((m) => ({ ...m, open: false }));

  const openPhotoModalAt = (secId: string, itemId: string, index: number) => {
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

  /* =========================
     ✅ Footer buttons (3つ): 途中保存 / 破棄 / 完了
     ========================= */
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

  /* =========================
     ✅ ESC / キー操作
     ========================= */
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

  /* =========================
     ✅ photoModal open中に sections 更新で photos 同期
     ========================= */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  /* =========================
     ✅ overlayが出てる時は背面スクロール停止
     ========================= */
  useEffect(() => {
    if (!photoModal.open && !sheet.open && !areaOpen && !editPhoto.open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [photoModal.open, sheet.open, areaOpen, editPhoto.open]);

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

  const bottomDockCollapsedH = 72;
  const bottomDockExpandedH = 192; // 省スペースでもボタン3つが切れにくい最低ライン
  const bottomDockH = bottomCollapsed ? bottomDockCollapsedH : bottomDockExpandedH;

  return (
    <div className={styles.qscCheckRunPage}>
      <style>{`
        @media (max-width: 420px) {
          .qscCompactCard { padding: 12px !important; border-radius: 16px !important; }
          .qscCompactLabel { font-size: 14px !important; line-height: 1.25 !important; }
          .qscCompactChoices button { padding: 8px 8px !important; gap: 6px !important; font-size: 12px !important; }
          .qscCompactChoices svg { width: 15px !important; height: 15px !important; }
          .qscCompactNote, .qscCompactHold { padding: 10px 10px !important; font-size: 13px !important; }
        }

        .qscBottomDock{
  position: fixed;
  left: 12px;
  right: 12px;

  /* ✅ もっと上に出す（ここが本命） */
  bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);

  z-index: 9000;
  pointer-events: auto;
}
        .qscBottomCard{
  /* ✅ 展開時はautoにして切れを根絶 */
  height: auto;
  max-height: calc(100dvh - 140px - env(safe-area-inset-bottom, 0px));
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 24px 60px rgba(15,17,21,0.18), 0 8px 18px rgba(15,17,21,0.10);
  border: 1px solid rgba(15,17,21,0.08);
}

/* ✅ 折りたたみ時だけ固定高 */
.qscBottomCard.isCollapsed{
  height: 72px;
}

/* ✅ 展開時：中身が増えたらDock内だけスクロール */
.qscBottomBody{
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 14px 14px;
}
        .qscGrab {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0 6px;
          touch-action: pan-y;
        }
        .qscGrabBar {
          width: 44px;
          height: 5px;
          border-radius: 999px;
          background: rgba(15,17,21,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .qscCollapseBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(15,17,21,0.10);
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 10px 26px rgba(15,17,21,0.08);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        /* ✅ indicator */
        .qscIndicatorWrap{
          display:flex;
          align-items:center;
          gap:10px;
          padding:10px 12px;
          border-radius: 18px;
          border:1px solid rgba(15,17,21,0.08);
          background: rgba(255,255,255,0.70);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 12px 28px rgba(15,17,21,0.08);
        }
        .qscSegBar{
          position: relative;
          height: 10px;
          width: 100%;
          min-width: 140px;
          border-radius: 999px;
          overflow:hidden;
          background: rgba(15,17,21,0.08);
          border: 1px solid rgba(15,17,21,0.08);
          display:flex;
        }
        .qscSeg{ height: 100%; }
        .qscSeg.ok{ background: rgba(52,199,89,0.85); }
        .qscSeg.hold{ background: rgba(255,149,0,0.90); }
        .qscSeg.ng{ background: rgba(255,59,48,0.88); }
        .qscSeg.na{ background: rgba(142,142,147,0.65); }
        .qscSeg.unset{ background: rgba(15,17,21,0.10); }

        .qscOverlayLayer{
          position: fixed;
          inset: 0;
          z-index: ${Z.overlay};
        }
        .qscSheetLayer{
          position: fixed;
          inset: 0;
          z-index: ${Z.sheet};
        }
        .qscPhotoLayer{
          position: fixed;
          inset: 0;
          z-index: ${Z.photoModal};
        }
          /* Drawerのエリア項目をコンパクトに */
button[data-area-item="1"]{
  padding: 8px 10px !important;
  border-radius: 14px !important;
}

button[data-area-item="1"] span{
  font-size: 13px !important;
  line-height: 1.2 !important;
}

@media (max-width: 420px){
  button[data-area-item="1"]{
    padding: 7px 9px !important;
  }
}
      `}</style>

      {/* ===== Top Bar ===== */}
      <header className={`${styles.qscTopbar} ${styles.qscPanel}`}>
        <div className={styles.qscTopbarRow3}>
          <Link className={styles.qscBack} href="/check" aria-label="チェック一覧に戻る">
            <ChevronLeft size={16} />
            戻る
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
              <Store size={14} /> {storeLabel}
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
        <div className="qscOverlayLayer" role="dialog" aria-modal="true" aria-label="エリアメニュー">
          <div className={styles.qscDrawerOverlay}>
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
                      data-area-item="1"
                      onClick={() => {
                        const el = sectionRefs.current[s.id];
                        if (!el) return;
                        setAreaOpen(false);
                        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
                      }}
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
        </div>
      ) : null}

      {/* ===== Photo modal ===== */}
      {photoModal.open ? (
        <div className="qscPhotoLayer" role="dialog" aria-modal="true" aria-label="写真拡大">
          <div className={styles.qscPhotoModal}>
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
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Sheet (Confirm Dialog) ===== */}
      {sheet.open ? (
        <div className="qscSheetLayer" role="dialog" aria-modal="true" aria-label="操作メニュー">
          <div className={styles.qscSheet}>
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
                    className={`${styles.qscSheetBtn} ${sheet.destructivePrimary ? styles.sheetDestructive : ""}`}
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
                    className={`${styles.qscItemCard} qscCompactCard ${showMissing ? styles.itemError : ""}`}
                  >
                    <div className={styles.qscItemTop}>
                      <div className={`${styles.qscItemLabel} qscCompactLabel`}>{it.label}</div>

                      <div
                        className={`${styles.qscChoices} qscCompactChoices`}
                        aria-label="チェック選択"
                        style={{ flexWrap: "nowrap" }}
                      >
                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceOk} ${it.state === "ok" ? styles.choiceOn : ""}`}
                          onClick={() => onChoose(sec.id, it.id, "ok")}
                          aria-pressed={it.state === "ok"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <CheckCircle2 size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>OK</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceHold} ${it.state === "hold" ? styles.choiceOn : ""}`}
                          onClick={() => onChoose(sec.id, it.id, "hold")}
                          aria-pressed={it.state === "hold"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <PauseCircle size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>保留</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceNg} ${it.state === "ng" ? styles.choiceOn : ""}`}
                          onClick={() => onChoose(sec.id, it.id, "ng")}
                          aria-pressed={it.state === "ng"}
                        >
                          <span className={styles.qscChoiceDot} aria-hidden="true" />
                          <XCircle size={16} />
                          <span style={{ whiteSpace: "nowrap" }}>NG</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.qscChoice} ${styles.choiceNa} ${it.state === "na" ? styles.choiceOn : ""}`}
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
                              <PauseCircle size={16} /> 保留理由（1つ）
                            </>
                          ) : (
                            <>
                              <MessageSquareText size={16} /> コメント
                              {it.state === "ng" ? <span className={styles.qscRequired}>必須</span> : null}
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
                                const picked = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
                                e.currentTarget.value = "";
                                await addPhotosToItem(sec.id, it.id, picked);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* ✅ サムネ（レビュー導線） */}
                      {(it.photos?.length ?? 0) > 0 ? (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, position: "relative", zIndex: 1 }}>
                          {(it.photos ?? []).map((p, idx) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openPhotoModalAt(sec.id, it.id, idx)}
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 14,
                                border: "1px solid rgba(15,17,21,0.10)",
                                overflow: "hidden",
                                padding: 0,
                                background: "rgba(255,255,255,0.65)",
                                cursor: "pointer",
                              }}
                              aria-label={`写真を開く ${idx + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.dataUrl}
                                alt={`写真 ${idx + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {it.state === "hold" ? (
                        <textarea
                          ref={(el) => {
                            holdRefs.current[k] = el;
                          }}
                          className={`${styles.qscHoldNote} qscCompactHold`}
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
                            className={`${styles.qscNote} qscCompactNote ${showMissing ? styles.noteMissing : ""} ${
                              guideOn ? styles.noteGuide : ""
                            }`}
                            value={it.note ?? ""}
                            onChange={(e) => setItemNote(sec.id, it.id, e.target.value)}
                            placeholder={it.state === "ng" ? "NG理由を入力してください（必須）" : "気づいたこと、指摘、補足など…"}
                            rows={2}
                            aria-invalid={showMissing}
                          />
                          {showMissing ? (
                            <div className={styles.qscErrorLine}>
                              <AlertTriangle size={16} /> NG の場合はコメント必須です
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* ✅ BottomDockぶんの余白：safe-areaも含めて確保（隠れ防止） */}
        <div aria-hidden="true" style={{ height: 260 }} />
      </main>

      {/* ===== Bottom Dock ===== */}
      <div className="qscBottomDock" style={{ ["--qscBottomH" as any]: `${bottomDockH}px` }}>
        <div className="qscBottomCard" role="region" aria-label="進捗と操作">
          <div className="qscGrab" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
            <div className="qscGrabBar" />
          </div>

          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="qscCollapseBtn"
                onClick={() => setBottomCollapsed((v) => !v)}
                aria-label={bottomCollapsed ? "インジケータを開く" : "インジケータを畳む"}
              >
                {bottomCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span style={{ fontWeight: 800 }}>{bottomCollapsed ? "表示" : "最小化"}</span>
              </button>

              <div className="qscIndicatorWrap" style={{ flex: 1, minWidth: 220 }}>
                <div
                  title={`進捗 ${progress.pct}%（${progress.done}/${progress.total}）`}
                  aria-label={`進捗 ${progress.pct}%`}
                  style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: `conic-gradient(rgba(52,199,89,0.95) ${progress.pct * 3.6}deg, rgba(15,17,21,0.10) 0deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                      border: "1px solid rgba(15,17,21,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 12,
                        color: "rgba(15,17,21,0.86)",
                        background: "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(15,17,21,0.08)",
                      }}
                    >
                      {progress.pct}%
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, opacity: 0.9 }}>
                      {progress.done}/{progress.total}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{hasWarn ? "要確認あり" : "順調"}</div>
                  </div>

                  <div className="qscSegBar" aria-label="進捗バー">
                    <div className="qscSeg ok" style={{ width: `${progress.ratio.ok * 100}%` }} />
                    <div className="qscSeg hold" style={{ width: `${progress.ratio.hold * 100}%` }} />
                    <div className="qscSeg ng" style={{ width: `${progress.ratio.ng * 100}%` }} />
                    <div className="qscSeg na" style={{ width: `${progress.ratio.na * 100}%` }} />
                    <div className="qscSeg unset" style={{ width: `${progress.ratio.unset * 100}%` }} />
                  </div>
                </div>
              </div>

              {progress.unset > 0 ? (
                <button
                  type="button"
                  onClick={goFirstUnset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,149,0,0.22)",
                    background: "rgba(255,149,0,0.10)",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  <AlertTriangle size={16} />
                  <span style={{ fontWeight: 900 }}>未チェック</span>
                  <span>{progress.unset}件</span>
                </button>
              ) : null}
            </div>

            {!bottomCollapsed ? (
              <>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
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

                {/* ✅ ボタン3つ */}
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`${styles.qscAction} ${styles.actionGhost}`}
                    onClick={saveDraft}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    <Save size={18} />
                    <span style={{ whiteSpace: "nowrap" }}>{saving ? "保存中…" : "途中保存"}</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.qscAction} ${styles.actionGhost}`}
                    onClick={discardDraft}
                    disabled={saving || submitBusy}
                    style={{ flex: 1 }}
                    title="途中データを破棄"
                  >
                    <Trash2 size={18} />
                    <span style={{ whiteSpace: "nowrap" }}>破棄</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.qscAction} ${styles.actionPrimary}`}
                    onClick={submit}
                    disabled={submitBusy}
                    style={{ flex: 1 }}
                  >
                    <Send size={18} />
                    <span style={{ whiteSpace: "nowrap" }}>{submitBusy ? "送信中…" : "完了"}</span>
                  </button>
                </div>

                {forceShowErrors && hasMissingRequiredNotes ? (
                  <button
                    type="button"
                    onClick={scrollToFirstMissingRequired}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,59,48,0.22)",
                      background: "rgba(255,59,48,0.10)",
                      fontWeight: 900,
                    }}
                  >
                    <AlertTriangle size={16} /> 必須未入力：{missingRequiredNotes.length}件（移動）
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ✅ Photo Edit Modal：最上位(zIndex)・背面クリック貫通を防ぐ */}
      <div style={{ position: "fixed", inset: 0, zIndex: Z.editModal, pointerEvents: editPhoto.open ? "auto" : "none" }}>
        <PhotoEditModal open={editPhoto.open} dataUrl={editPhoto.dataUrl} onClose={editPhoto.onClose} onSave={editPhoto.onSave} />
      </div>
    </div>
  );
}
