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
 * ✅ 3ファイルCSS版
 */
import base from "./CheckRunPage.base.module.css";
import modal from "./CheckRunPage.modal.module.css";
import bottom from "./CheckRunPage.bottom.module.css";

/**
 * ⚠️ styles を合体させる場合でも、今回のTSXは「衝突しないクラス名」だけを参照するので安全
 */
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
  note?: string; // コメント（NG/保留は必須）
  holdNote?: string; // 保留理由（任意）
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

type ActionSheetState =
  | { open: false }
  | {
      open: true;
      title?: string;
      message?: string;
      destructiveText?: string;
      cancelText?: string;
      onDestructive: () => void;
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

      // 互換（古いデータを補完）
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

  // DRAFT_KEY が searchParams で変わった場合、該当draftを再ロード
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

  // コメント欄 ref（NG/保留押下でスクロール＆フォーカス）
  const noteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // コメント欄 “ガイド発光”
  const [guideKey, setGuideKey] = useState<string | null>(null);

  // iOS風アクションシート
  const [sheet, setSheet] = useState<ActionSheetState>({ open: false });

  // modal (photo)
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({
    open: false,
    secId: "",
    itemId: "",
    photos: [],
    index: 0,
  });

  // validation: NG & HOLD comment required
  const [forceShowErrors, setForceShowErrors] = useState(false);

  const missingRequiredNotes = useMemo(() => {
    const misses: { secId: string; itemId: string; state: "ng" | "hold" }[] = [];
    for (const s of sections) {
      for (const it of s.items) {
        if (it.state === "ng" || it.state === "hold") {
          const note = trimText(it.note);
          if (!note) misses.push({ secId: s.id, itemId: it.id, state: it.state });
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

    const pct = Math.round((done / total) * 100);
    return { done, total, pct, ok, hold, ng, na };
  }, [sections]);

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

  const addPhotosToItem = async (secId: string, itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const arr = Array.from(files).slice(0, 30);
    const dataUrls = await Promise.all(arr.map((f) => readFileAsDataUrl(f)));

    setSections((prev) =>
      prev.map((s) =>
        s.id !== secId
          ? s
          : {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId) return it;
                const next = (it.photos ?? []).concat(
                  dataUrls.map((u) => ({ id: uid("ph"), dataUrl: u }))
                );
                return { ...it, photos: next };
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

    // モーダルで見てる写真が消されたら安全に閉じる/移動
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

  // NG/保留押下時：コメント欄へスクロール＋フォーカス（＋ガイド発光）
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

  // choice click wrapper（NG/保留なら即フォーカス＋ガイド）
  const onChoose = (secId: string, itemId: string, state: CheckState) => {
    setItemState(secId, itemId, state);
    if (state === "ng" || state === "hold") {
      focusNote(secId, itemId);
    }
  };

  // ======= modal control =======

  const openPhotoModal = (secId: string, itemId: string, photos: Photo[], index: number) => {
    setPhotoModal({ open: true, secId, itemId, photos, index });
  };

  const closePhotoModal = () => {
    setPhotoModal((m) => ({ ...m, open: false }));
  };

  const modalNext = () => {
    setPhotoModal((m) => {
      if (!m.open) return m;
      const len = m.photos.length;
      const next = Math.min(len - 1, m.index + 1);
      return { ...m, index: next };
    });
  };

  const modalPrev = () => {
    setPhotoModal((m) => {
      if (!m.open) return m;
      const next = Math.max(0, m.index - 1);
      return { ...m, index: next };
    });
  };

  // iOS風アクションシートで “表示中写真” を削除
  const modalDeleteCurrent = () => {
    if (!photoModal.open) return;
    const current = photoModal.photos[photoModal.index];
    if (!current) return;

    setSheet({
      open: true,
      title: "写真を削除しますか？",
      message: "この操作は取り消せません。",
      destructiveText: "削除",
      cancelText: "キャンセル",
      onDestructive: () => {
        removePhotoFromItem(photoModal.secId, photoModal.itemId, current.id);
        setSheet({ open: false });
      },
    });
  };

  // ======= draft / submit =======

  const saveDraft = async () => {
    setSaving(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(sections));
      await new Promise((r) => setTimeout(r, 220));
    } finally {
      setSaving(false);
    }
  };

  const scrollToFirstMissingRequired = () => {
    if (!hasMissingRequiredNotes) return;
    const first = missingRequiredNotes[0];
    const secEl = sectionRefs.current[first.secId];
    if (!secEl) return;

    const top = secEl.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top, behavior: "smooth" });

    setTimeout(() => focusNote(first.secId, first.itemId), 280);
  };

  const submit = async () => {
    setForceShowErrors(true);
    if (hasMissingRequiredNotes) {
      scrollToFirstMissingRequired();
      return;
    }

    setSubmitBusy(true);
    try {
      localStorage.setItem(`${DRAFT_KEY}_submittedAt`, new Date().toISOString());
      await new Promise((r) => setTimeout(r, 420));
      router.push("/check");
    } finally {
      setSubmitBusy(false);
    }
  };

  // ======= area jump =======

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

  // ======= keyboard =======
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAreaOpen(false);
        if (sheet.open) setSheet({ open: false });
        if (photoModal.open) closePhotoModal();
      }
      if (photoModal.open) {
        if (e.key === "ArrowRight") modalNext();
        if (e.key === "ArrowLeft") modalPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoModal.open, sheet.open]);

  // ======= keep modal photos in sync =======
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
      const nextIndex = Math.min(m.index, photos.length - 1);
      return { ...m, photos, index: nextIndex };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // ======= scroll lock (安全) =======
  useEffect(() => {
    if (!photoModal.open && !sheet.open && !areaOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [photoModal.open, sheet.open, areaOpen]);

  const closeSheet = () => setSheet({ open: false });

  return (
    <div className={styles.qscCheckRunPage}>
      {/* ===== Top Bar ===== */}
      <header className={`${styles.qscTopbar} ${styles.qscPanel}`}>
        <div className={styles.qscTopbarRow}>
          <Link className={styles.qscBack} href="/check" aria-label="チェック一覧に戻る">
            <ChevronLeft size={16} /> 戻る
          </Link>

          <button
            type="button"
            className={styles.qscAreaBtn}
            onClick={() => setAreaOpen(true)}
            aria-label="エリアメニューを開く"
          >
            <Menu size={18} />
            <span>エリア</span>
          </button>
        </div>

        {/* 互換：残っててもCSS側でdisplay:noneにしてる */}
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

      {/* ===== Photo Modal ===== */}
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

      {/* ===== iOS Action Sheet ===== */}
      {sheet.open ? (
        <div className={styles.qscSheet} role="dialog" aria-modal="true" aria-label="操作メニュー">
          <button className={styles.qscSheetBackdrop} onClick={closeSheet} aria-label="閉じる" />
          <div className={styles.qscSheetWrap}>
            <div className={styles.qscSheetCard}>
              {sheet.title ? <div className={styles.qscSheetTitle}>{sheet.title}</div> : null}
              {sheet.message ? <div className={styles.qscSheetMsg}>{sheet.message}</div> : null}
              <button
                type="button"
                className={`${styles.qscSheetBtn} ${styles.sheetDestructive}`}
                onClick={() => sheet.onDestructive()}
              >
                {sheet.destructiveText ?? "削除"}
              </button>
            </div>
            <button
              type="button"
              className={`${styles.qscSheetBtn} ${styles.sheetCancel}`}
              onClick={closeSheet}
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
                const needsNote = (it.state === "ng" || it.state === "hold") && !trimText(it.note);
                const showMissing = forceShowErrors && needsNote;
                const k = itemKey(sec.id, it.id);
                const guideOn = guideKey === k;

                return (
                  <div
                    key={it.id}
                    className={`${styles.qscItemCard} ${showMissing ? styles.itemError : ""}`}
                  >
                    <div className={styles.qscItemTop}>
                      <div className={styles.qscItemLabel}>{it.label}</div>

                      <div className={styles.qscChoices} aria-label="チェック選択">
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
                          <span>OK</span>
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
                          <span>保留</span>
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
                          <span>NG</span>
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
                          <span>該当なし</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.qscItemBottom}>
                      <div className={styles.qscNoteHead}>
                        <div className={styles.qscNoteTitle}>
                          <MessageSquareText size={16} />
                          コメント
                          {it.state === "ng" || it.state === "hold" ? (
                            <span className={styles.qscRequired}>必須</span>
                          ) : null}
                        </div>

                        <div className={styles.qscPhotoHead}>
                          <label className={styles.qscPhotoAdd} aria-label="写真を追加">
                            <ImagePlus size={16} />
                            <span>写真追加</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              capture="environment"
                              onChange={async (e) => {
                                const files = e.currentTarget.files;
                                e.currentTarget.value = "";
                                await addPhotosToItem(sec.id, it.id, files);
                              }}
                            />
                          </label>
                        </div>
                      </div>

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
                            : it.state === "hold"
                            ? "保留の理由/状況を入力してください（必須）"
                            : "気づいたこと、指摘、補足など…"
                        }
                        rows={2}
                        aria-invalid={showMissing}
                      />

                      {showMissing ? (
                        <div className={styles.qscErrorLine}>
                          <AlertTriangle size={16} />
                          {it.state === "hold"
                            ? "保留の場合はコメント必須です"
                            : "NG の場合はコメント必須です"}
                        </div>
                      ) : null}

                      {it.state === "hold" ? (
                        <div className={styles.qscHoldBox}>
                          <div className={styles.qscHoldTitle}>
                            <PauseCircle size={16} />
                            保留の理由（詳細・任意）
                          </div>
                          <textarea
                            className={styles.qscHoldNote}
                            value={it.holdNote ?? ""}
                            onChange={(e) => setItemHoldNote(sec.id, it.id, e.target.value)}
                            placeholder="例）担当者不在 / 部材待ち / 時間不足 など…"
                            rows={2}
                          />
                        </div>
                      ) : null}

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
      </main>

      {/* ===== Bottom Indicator (fixed) ===== */}
      <div className={styles.qscBottomBar} role="region" aria-label="進捗と操作">
        <div className={styles.qscBottomInner}>
          <div className={styles.qscBottomLeft}>
            <div className={styles.qscProgressLine}>
              <div className={styles.qscProgressRow}>
                <div className={styles.qscProgressText}>
                  {progress.done}/{progress.total}（{progress.pct}%）
                </div>

                {forceShowErrors && hasMissingRequiredNotes ? (
                  <div className={styles.qscBottomError}>
                    <AlertTriangle size={16} />
                    必須コメント未入力：{missingRequiredNotes.length}件
                  </div>
                ) : null}
              </div>

              <div className={styles.qscProgressBar} aria-label="進捗バー">
                <div className={styles.qscProgressFill} style={{ width: `${progress.pct}%` }} />
              </div>
            </div>

            <div className={styles.qscProgressBadges} aria-label="内訳">
              <span className={styles.qscBadge}>OK {progress.ok}</span>
              <span className={styles.qscBadge}>保留 {progress.hold}</span>
              <span className={styles.qscBadge}>NG {progress.ng}</span>
              <span className={styles.qscBadge}>該当なし {progress.na}</span>
            </div>
          </div>

          <div className={styles.qscBottomRight}>
            <button
              type="button"
              className={`${styles.qscAction} ${styles.actionGhost} ${
                saving ? styles.actionBusy : ""
              }`}
              onClick={saveDraft}
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? "保存中…" : "途中保存"}</span>
            </button>

            <button
              type="button"
              className={`${styles.qscAction} ${styles.actionPrimary} ${
                submitBusy ? styles.actionBusy : ""
              }`}
              onClick={submit}
              disabled={submitBusy}
              title={hasMissingRequiredNotes ? "必須コメント未入力があります" : "完了して戻る（仮）"}
            >
              <Send size={18} />
              <span>{submitBusy ? "送信中…" : "完了"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
