// src/app/check/run/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Menu, Loader2, X, Store,
  CheckCircle2, PauseCircle, XCircle, MinusCircle,
  Save, Send, ImagePlus, Trash2, MessageSquareText,
  AlertTriangle, ChevronRight, ChevronLeft as ChevronLeftIcon,
  ChevronDown, ChevronUp, Plus, ArrowDown,
} from "lucide-react";

import base from "./CheckRunPage.base.module.css";
import modal from "./CheckRunPage.modal.module.css";
import bottom from "./CheckRunPage.bottom.module.css";
import PhotoEditModal from "./PhotoEditModal";

const styles = { ...base, ...modal, ...bottom };

const Z = { sectionTab: 800, bottomDock: 9000, overlay: 11000, sheet: 11100, photoModal: 11200, editModal: 20000 } as const;

type CheckState = "ok" | "hold" | "ng" | "na" | "unset";
type Photo = { id: string; dataUrl: string; s3Url?: string; s3Key?: string };
type CheckItem = { id: string; label: string; state: CheckState; note?: string; holdNote?: string; photos?: Photo[]; category?: string };
type Section = { id: string; title: string; items: CheckItem[] };
type EditPhotoState = { open: false } | { open: true; dataUrl: string; onSave: (v: string) => void; onClose: () => void };
type PhotoModalState = { open: boolean; secId: string; itemId: string; photos: Photo[]; index: number };
type ActionSheetState = { open: false } | { open: true; title?: string; message?: string; primaryText?: string; onPrimary?: () => void | Promise<void>; destructivePrimary?: boolean; secondaryText?: string; onSecondary?: () => void | Promise<void>; cancelText?: string; onCancel?: () => void };

const DEFAULT_SECTIONS: Section[] = [
  { id: "sec_entrance", title: "入口・導線", items: [
    { id: "i1", label: "入口まわりの清掃", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i2", label: "サイン/掲示物の破損なし", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i3", label: "床の滑り・段差注意OK", state: "unset", note: "", holdNote: "", photos: [] },
  ]},
  { id: "sec_floor", title: "フロア", items: [
    { id: "i4", label: "マシン周辺の清掃", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i5", label: "備品（マット等）整頓", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i6", label: "危険箇所なし", state: "unset", note: "", holdNote: "", photos: [] },
  ]},
  { id: "sec_toilet", title: "トイレ・更衣室", items: [
    { id: "i7", label: "臭気・衛生OK", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i8", label: "備品補充OK", state: "unset", note: "", holdNote: "", photos: [] },
    { id: "i9", label: "水回りの汚れなし", state: "unset", note: "", holdNote: "", photos: [] },
  ]},
];

const NG_PRESETS = ["汚れが目立つ", "整理整頓されていない", "破損がある", "補充不足", "異臭がする"];
const HOLD_PRESETS = ["担当者に確認中", "後日対応予定", "現地判断不能", "業者手配済み"];
const CHECK_CHOICES = [
  { state: "ok" as CheckState,   label: "OK",     color: "#059669" },
  { state: "hold" as CheckState, label: "保留",   color: "#d97706" },
  { state: "ng" as CheckState,   label: "NG",     color: "#dc2626" },
  { state: "na" as CheckState,   label: "対象外", color: "#64748b" },
];

function uid(p = "p") { return `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
function readFileAsDataUrl(f: File): Promise<string> { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => rej(new Error("read fail")); r.readAsDataURL(f); }); }
function trimText(s: unknown) { return (typeof s === "string" ? s : "").trim(); }
function itemKey(sId: string, iId: string) { return `${sId}::${iId}`; }
function vibrate(ms = 15) { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms); }
function getUserNameFromCookie() { if (typeof document === "undefined") return ""; const m = document.cookie.match(/(?:^|;\s*)qsc_user_name=([^;]*)/); return m ? decodeURIComponent(m[1]) : ""; }

function patchSections(raw: Section[]): Section[] {
  return raw.map(s => ({
    ...s,
    items: (s.items || []).map(it => ({
      ...it,
      note: typeof it.note === "string" ? it.note : "",
      holdNote: typeof (it as CheckItem).holdNote === "string" ? (it as CheckItem).holdNote : "",
      photos: Array.isArray(it.photos) ? it.photos.map((p: Record<string, string>) => ({
        id: p.id || uid("ph"),
        dataUrl: p.dataUrl || p.url || "",  // s3Urlは使わない（期限切れのため）
        s3Url: p.s3Url || undefined,
        s3Key: p.s3Key || undefined,
      })) : [],
      category: typeof (it as CheckItem).category === "string" ? (it as CheckItem).category : "",
    })),
  }));
}

export default function CheckRunPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = sp.get("companyId") || "";
  const bizId = sp.get("bizId") || "";
  const brandId = sp.get("brandId") || "";
  const storeId = sp.get("storeId") || "";
  const mode = sp.get("mode") || "new";
  const resultId = sp.get("resultId") || "";

  const [storeName, setStoreName] = useState("");
  const assetIdRef = useRef<string>("");
  const [inspectionDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [improvementDeadline, setImprovementDeadline] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString("sv-SE"); });
  const [userName, setUserName] = useState("");
  useEffect(() => { setUserName(getUserNameFromCookie() || "担当者"); }, []);

  const storeLabel = useMemo(() => storeName || storeId || "店舗未選択", [storeId, storeName]);

  const DRAFT_KEY = useMemo(() => {
    return `qsc_draft_${storeId || "unknown"}`;
  }, [storeId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [sheet, setSheet] = useState<ActionSheetState>({ open: false });

  /* ✅ 修正1: modeに関係なくlocalStorageから下書きを復元 */
  // refにDRAFT_KEYを持たせてuseEffectの依存ループを防ぐ
  const draftKeyRef = useRef(DRAFT_KEY);
  useEffect(() => { draftKeyRef.current = DRAFT_KEY; }, [DRAFT_KEY]);

  const loadDraft = useCallback((fallback?: Section[]) => {
    try {
      const raw = localStorage.getItem(draftKeyRef.current);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Section[];
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      const patched = patchSections(parsed);
      setSections(patched);
      // s3Keyがある写真のPresigned URLを取得
      const keys: { secId: string; itemId: string; photoId: string; key: string }[] = [];
      for (const s of patched) {
        for (const it of s.items) {
          for (const p of it.photos ?? []) {
            if (p.s3Key && !p.dataUrl) {
              keys.push({ secId: s.id, itemId: it.id, photoId: p.id, key: p.s3Key });
            }
          }
        }
      }
      if (keys.length > 0) {
        Promise.all(keys.map(async ({ secId, itemId, photoId, key }) => {
          try {
            const res = await fetch(`/api/check/photo-url?key=${encodeURIComponent(key)}`);
            if (!res.ok) return;
            const { url } = await res.json();
            setSections(prev => prev.map(s => s.id !== secId ? s : {
              ...s,
              items: s.items.map(it => it.id !== itemId ? it : {
                ...it,
                photos: (it.photos ?? []).map(p => p.id !== photoId ? p : { ...p, dataUrl: url }),
              }),
            }));
          } catch {}
        }));
      }
      return true;
    } catch {
      if (fallback) setSections(fallback);
      return false;
    }
  }, []); // 依存なし → 再生成されないので loadQuestions が再実行されない

  useEffect(() => {
    if (!mounted) return;
    async function load() {
      try {
        if (!storeId) return;
        setLoadingQuestions(true);
        const res = await fetch(`/api/check/run-config?storeId=${storeId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "取得失敗");
        const nextStoreName = String(json.storeName ?? "").trim();
        const nextAssetId = String(json.assetId ?? "").trim();
        const nextSections: Section[] = Array.isArray(json.questions) && json.questions.length > 0 ? json.questions : DEFAULT_SECTIONS;
        setStoreName(nextStoreName);
        assetIdRef.current = nextAssetId;

        if (mode === "edit" && resultId) {
          // editモード: サーバーから既存データを取得
          const dRes = await fetch(`/api/check/results/detail?storeId=${encodeURIComponent(storeId)}&resultId=${encodeURIComponent(resultId)}`, { cache: "no-store" });
          const dJson = await dRes.json();
          if (!dRes.ok) throw new Error(dJson?.message || "点検データ取得失敗");
          setSections(Array.isArray(dJson.sections) ? patchSections(dJson.sections) : nextSections);
        } else {
          /* ✅ 修正2: newモードでも下書きを復元。なければAPIデータを使う */
          setSections(nextSections); // まずAPIデータをセット
          loadDraft(nextSections);   // 下書きがあれば上書き
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "データ読み込み失敗";
        setSheet({ open: true, title: "読み込みエラー", message: msg, cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
      } finally {
        setLoadingQuestions(false);
      }
    }
    load();
  }, [mounted, storeId, mode, resultId]); // loadDraftはrefベースなので依存不要

  // オートセーブ（2秒デバウンス）
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        // dataUrl（base64）は保存しない（サイズが大きいため）、s3Urlがあればそちらを使う
        const sectionsToSave = sections.map(s => ({
          ...s,
          items: s.items.map(it => ({
            ...it,
            photos: (it.photos ?? []).map(p => ({
              id: p.id,
              dataUrl: p.s3Url ? "" : p.dataUrl, // S3済みはdataUrlを省略
              s3Url: p.s3Url,
              s3Key: p.s3Key,
            })),
          })),
        }));
        localStorage.setItem(DRAFT_KEY, JSON.stringify(sectionsToSave));
      } catch {}
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sections, DRAFT_KEY, mounted]);

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const noteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const holdRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pickPhotoRef = useRef<HTMLInputElement | null>(null);

  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({ open: false, secId: "", itemId: "", photos: [], index: 0 });
  const [editPhoto, setEditPhoto] = useState<EditPhotoState>({ open: false });
  const [forceShowErrors, setForceShowErrors] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<{ secId: string; itemId: string } | null>(null);

  const currentSecIdRef = useRef<string>(sections[0]?.id ?? "");
  const [currentSecId, setCurrentSecId] = useState<string>(sections[0]?.id ?? "");

  const sectionAlert = useMemo(() => {
    const out: Record<string, { ng: number; hold: number; done: number; total: number }> = {};
    for (const s of sections) out[s.id] = { ng: s.items.filter(i => i.state === "ng").length, hold: s.items.filter(i => i.state === "hold").length, done: s.items.filter(i => i.state !== "unset").length, total: s.items.length };
    return out;
  }, [sections]);

  const missingRequiredNotes = useMemo(() => {
    const r: { secId: string; itemId: string }[] = [];
    for (const s of sections) for (const it of s.items) if (it.state === "ng" && !trimText(it.note)) r.push({ secId: s.id, itemId: it.id });
    return r;
  }, [sections]);

  const progress = useMemo(() => {
    const all = sections.flatMap(s => s.items);
    const total = all.length || 1;
    const done = all.filter(i => i.state !== "unset").length;
    const ok = all.filter(i => i.state === "ok").length;
    const hold = all.filter(i => i.state === "hold").length;
    const ng = all.filter(i => i.state === "ng").length;
    const na = all.filter(i => i.state === "na").length;
    const unset = all.filter(i => i.state === "unset").length;
    return { done, total, pct: Math.round((done / total) * 100), ok, hold, ng, na, unset, ratio: { ok: ok / total, hold: hold / total, ng: ng / total, na: na / total } };
  }, [sections]);

  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  useEffect(() => { if (!mounted) return; try { setBottomCollapsed(localStorage.getItem("qsc_run_bottom_collapsed") === "1"); } catch {} }, [mounted]);
  useEffect(() => { if (!mounted) return; try { localStorage.setItem("qsc_run_bottom_collapsed", bottomCollapsed ? "1" : "0"); } catch {} }, [mounted, bottomCollapsed]);

  const swipeStartY = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeAt = useRef<number>(0);
  const onSwipeStart = useCallback((e: React.TouchEvent) => { if (e.touches.length !== 1) return; swipeAt.current = Date.now(); swipeStartY.current = e.touches[0].clientY; swipeStartX.current = e.touches[0].clientX; }, []);
  const onSwipeEnd = useCallback((e: React.TouchEvent) => {
    const sy = swipeStartY.current; const sx = swipeStartX.current;
    swipeStartY.current = null; swipeStartX.current = null;
    if (sy == null || sx == null) return;
    const end = e.changedTouches[0];
    const dy = end.clientY - sy; const dx = end.clientX - sx;
    if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < 24) return;
    dy < 0 ? setBottomCollapsed(false) : setBottomCollapsed(true);
  }, []);

  const scrollMainTo = useCallback((top: number) => { const m = mainRef.current; if (!m) { window.scrollTo({ top, behavior: "smooth" }); return; } m.scrollTo({ top, behavior: "smooth" }); }, []);
  const scrollToSection = useCallback((secId: string) => { const el = sectionRefs.current[secId]; if (!el) return; if (mainRef.current) mainRef.current.scrollTo({ top: Math.max(0, el.offsetTop - 120), behavior: "smooth" }); else el.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const scrollToItem = useCallback((secId: string, itemId: string) => { const el = itemRefs.current[itemKey(secId, itemId)]; if (el && mainRef.current) { scrollMainTo(Math.max(0, el.offsetTop - 120)); return; } scrollToSection(secId); }, [scrollMainTo, scrollToSection]);
  const findFirstUnset = useCallback(() => { for (const s of sections) for (const it of s.items) if (it.state === "unset") return { secId: s.id, itemId: it.id }; return null; }, [sections]);
  const goFirstUnset = useCallback(() => { const f = findFirstUnset(); if (f) scrollToItem(f.secId, f.itemId); }, [findFirstUnset, scrollToItem]);

  const focusNote = useCallback((secId: string, itemId: string) => { const k = itemKey(secId, itemId); requestAnimationFrame(() => { const el = noteRefs.current[k]; if (!el) return; if (mainRef.current) scrollMainTo(Math.max(0, el.offsetTop - 120)); setTimeout(() => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 240); }); }, [scrollMainTo]);
  const focusHold = useCallback((secId: string, itemId: string) => { const k = itemKey(secId, itemId); requestAnimationFrame(() => { const el = holdRefs.current[k]; if (!el) return; if (mainRef.current) scrollMainTo(Math.max(0, el.offsetTop - 120)); setTimeout(() => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 220); }); }, [scrollMainTo]);

  const setItemState = useCallback((secId: string, itemId: string, next: CheckState) => {
    setSections(prev => prev.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => { if (it.id !== itemId) return it; const t = it.state === next ? "unset" : next; return t === "hold" ? { ...it, state: "hold", note: "" } : { ...it, state: t }; }) }));
  }, []);
  const setItemNote = useCallback((secId: string, itemId: string, note: string) => { setSections(p => p.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => it.id !== itemId ? it : { ...it, note }) })); }, []);
  const setItemHoldNote = useCallback((secId: string, itemId: string, holdNote: string) => { setSections(p => p.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => it.id !== itemId ? it : { ...it, holdNote }) })); }, []);
  const appendItemNote = useCallback((secId: string, itemId: string, text: string, isHold = false) => {
    vibrate(10);
    setSections(p => p.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => { if (it.id !== itemId) return it; if (isHold) { const c = it.holdNote || ""; return { ...it, holdNote: c ? `${c}\n${text}` : text }; } const c = it.note || ""; return { ...it, note: c ? `${c}\n${text}` : text }; }) }));
  }, []);

  const onChoose = useCallback((secId: string, itemId: string, state: CheckState) => {
    vibrate(10); setItemState(secId, itemId, state);
    const k = itemKey(secId, itemId);
    if (state === "ng") setTimeout(() => focusNote(secId, itemId), 120);
    else if (state === "hold") setTimeout(() => focusHold(secId, itemId), 120);
    else if (state === "ok") { setGuideKey(`ok-flash-${k}`); setTimeout(() => setGuideKey(null), 600); }
  }, [setItemState, focusNote, focusHold]);

  const openPhotoEditor = useCallback((dataUrl: string): Promise<string | null> => new Promise(res => { setEditPhoto({ open: true, dataUrl, onSave: v => { setEditPhoto({ open: false }); res(v); }, onClose: () => { setEditPhoto({ open: false }); res(null); } }); }), []);

  const addPhotosToItem = useCallback(async (secId: string, itemId: string, files: File[]) => {
    if (!files.length) return;
    const added: Photo[] = [];
    const tempResultId = uid("tmp");

    for (const f of files.slice(0, 5)) {
      try {
        const orig = await readFileAsDataUrl(f);
        const ed = await openPhotoEditor(orig);
        if (!ed) continue;

        const photoId = uid("ph");
        const contentType = f.type || "image/jpeg";

        // Presigned URLを取得してS3に直接アップロード
        try {
          const presignRes = await fetch("/api/check/upload-presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId, resultId: tempResultId, sectionId: secId, itemId, photoId, contentType }),
          });

          if (presignRes.ok) {
            const { url, fields, s3Url } = await presignRes.json();
            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
            // base64をBlobに変換
            const base64Data = ed.split(",")[1];
            const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const blob = new Blob([byteArray], { type: contentType });
            formData.append("file", blob);

            const uploadRes = await fetch(url, { method: "POST", body: formData });
            if (uploadRes.ok) {
              // S3アップロード成功：s3Urlを保存、dataUrlはプレビュー用に保持
              added.push({ id: photoId, dataUrl: ed, s3Url, s3Key: fields.key });
              continue;
            }
          }
        } catch {}

        // S3失敗時はdataUrlのままフォールバック
        added.push({ id: photoId, dataUrl: ed });
      } catch {}
    }
    if (!added.length) return;
    setSections(p => p.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => it.id !== itemId ? it : { ...it, photos: (it.photos ?? []).concat(added) }) }));
  }, [openPhotoEditor, storeId]);

  const removePhotoFromItem = useCallback((secId: string, itemId: string, photoId: string) => {
    setSections(p => p.map(s => s.id !== secId ? s : { ...s, items: s.items.map(it => it.id !== itemId ? it : { ...it, photos: (it.photos ?? []).filter(p => p.id !== photoId) }) }));
    setPhotoModal(m => { if (!m.open || m.secId !== secId || m.itemId !== itemId) return m; const next = m.photos.filter(p => p.id !== photoId); if (!next.length) return { ...m, open: false, photos: [], index: 0 }; return { ...m, photos: next, index: Math.min(m.index, next.length - 1) }; });
  }, []);

  const openPhotoPicker = useCallback((secId: string, itemId: string) => { vibrate(); setPendingPhotoTarget({ secId, itemId }); requestAnimationFrame(() => pickPhotoRef.current?.click()); }, []);
  const closePhotoModal = useCallback(() => setPhotoModal(m => ({ ...m, open: false })), []);
  const openPhotoModalAt = useCallback((secId: string, itemId: string, index: number) => {
    vibrate(10);
    const s = sections.find(x => x.id === secId); const it = s?.items.find(x => x.id === itemId); const photos = it?.photos ?? [];
    if (!photos.length) return;
    setPhotoModal({ open: true, secId, itemId, photos, index: Math.max(0, Math.min(index, photos.length - 1)) });
  }, [sections]);
  const modalNext = useCallback(() => setPhotoModal(m => m.open ? { ...m, index: Math.min(m.photos.length - 1, m.index + 1) } : m), []);
  const modalPrev = useCallback(() => setPhotoModal(m => m.open ? { ...m, index: Math.max(0, m.index - 1) } : m), []);
  const modalDeleteCurrent = useCallback(() => {
    if (!photoModal.open) return;
    const cur = photoModal.photos[photoModal.index]; if (!cur) return;
    setSheet({ open: true, title: "写真を削除しますか？", message: "この操作は取り消せません。", primaryText: "削除", destructivePrimary: true, cancelText: "キャンセル", onPrimary: () => { removePhotoFromItem(photoModal.secId, photoModal.itemId, cur.id); setSheet({ open: false }); }, onCancel: () => setSheet({ open: false }) });
  }, [photoModal, removePhotoFromItem]);

  const saveDraft = useCallback(() => {
    if (saving) return;
    vibrate();
    setSheet({ open: true, title: "途中保存しますか？", message: "この端末に途中経過を保存します。", primaryText: "保存する", cancelText: "キャンセル",
      onPrimary: async () => {
        setSheet({ open: false }); setSaving(true);
        try {
          const sectionsToSave = sections.map(s => ({
            ...s,
            items: s.items.map(it => ({
              ...it,
              photos: (it.photos ?? []).map(p => ({
                id: p.id,
                dataUrl: p.s3Url ? "" : p.dataUrl,
                s3Url: p.s3Url,
                s3Key: p.s3Key,
              })),
            })),
          }));
          localStorage.setItem(DRAFT_KEY, JSON.stringify(sectionsToSave));
          await new Promise(r => setTimeout(r, 220));
          setSavedToast(true);
          setTimeout(() => setSavedToast(false), 2000);
        } finally { setSaving(false); }
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [saving, DRAFT_KEY, sections]);

  /* ✅ 修正3: 破棄後の遷移を window.location.href に変更 */
  const discardDraft = useCallback(() => {
    vibrate();
    setSheet({ open: true, title: "途中データを破棄しますか？", message: "このチェックの途中保存データが削除されます。", primaryText: "破棄", destructivePrimary: true, cancelText: "キャンセル",
      onPrimary: () => {
        try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(`${DRAFT_KEY}_submittedAt`); } catch {}
        setSheet({ open: false });
        window.location.href = "/check"; // router.push ではなく強制遷移
      },
      onCancel: () => setSheet({ open: false }),
    });
  }, [DRAFT_KEY]);

  const scrollToFirstMissing = useCallback(() => {
    if (!missingRequiredNotes.length) return;
    const f = missingRequiredNotes[0]; scrollToItem(f.secId, f.itemId); setTimeout(() => focusNote(f.secId, f.itemId), 240);
  }, [missingRequiredNotes, scrollToItem, focusNote]);

  const submitCore = useCallback(async (sendMail: boolean) => {
    if (submitBusy) return;
    try {
      setSubmitBusy(true);
      // dataUrl（base64）を除去してリクエストサイズを削減
      const sectionsToSubmit = sections.map(s => ({
        ...s,
        items: s.items.map(it => ({
          ...it,
          photos: (it.photos ?? []).map(p => ({
            id: p.id,
            dataUrl: p.s3Url ? "" : p.dataUrl, // S3済みはdataUrlを空に
            s3Url: p.s3Url,
            s3Key: p.s3Key,
          })),
        })),
      }));
      const res = await fetch("/api/check/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, bizId, brandId, storeId, storeName, userName, inspectionDate, improvementDeadline, sendMail, sections: sectionsToSubmit }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      try { localStorage.removeItem(DRAFT_KEY); } catch {} // 送信成功後に下書き削除
      router.push(`/check/results/${data.resultId}`);
    } catch (e: unknown) {
      setSheet({ open: true, title: "送信エラー", message: e instanceof Error ? e.message : "送信に失敗しました", cancelText: "閉じる", onCancel: () => setSheet({ open: false }) });
    } finally { setSubmitBusy(false); }
  }, [submitBusy, companyId, bizId, brandId, storeId, storeName, userName, inspectionDate, improvementDeadline, sections, router, DRAFT_KEY]);

  const onDeadlineConfirmed = useCallback(() => {
    setDeadlineModalOpen(false);
    setSheet({ open: true, title: "完了します", message: "完了メールを配信しますか？", primaryText: "配信して完了", secondaryText: "配信せず完了", cancelText: "キャンセル",
      onPrimary: () => { setSheet({ open: false }); submitCore(true); },
      onSecondary: () => { setSheet({ open: false }); submitCore(false); },
      onCancel: () => setSheet({ open: false }),
    });
  }, [submitCore]);

  const submit = useCallback(() => {
    vibrate(); if (submitBusy) return;
    if (progress.unset > 0) {
      setSheet({ open: true, title: "未チェック項目があります", message: `未チェックが ${progress.unset} 件あります。`, primaryText: "移動する", secondaryText: "このまま完了へ", cancelText: "キャンセル",
        onPrimary: () => { setSheet({ open: false }); goFirstUnset(); },
        onSecondary: () => { setSheet({ open: false }); setDeadlineModalOpen(true); },
        onCancel: () => setSheet({ open: false }),
      });
      return;
    }
    setDeadlineModalOpen(true);
  }, [submitBusy, progress.unset, goFirstUnset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAreaOpen(false); if (sheet.open) setSheet({ open: false }); if (photoModal.open) closePhotoModal(); if (editPhoto.open) editPhoto.onClose(); }
      if (photoModal.open) { if (e.key === "ArrowRight") modalNext(); if (e.key === "ArrowLeft") modalPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoModal.open, sheet.open, editPhoto, closePhotoModal, modalNext, modalPrev]);

  useEffect(() => {
    if (!photoModal.open) return;
    const s = sections.find(x => x.id === photoModal.secId); const it = s?.items.find(x => x.id === photoModal.itemId); const photos = it?.photos ?? [];
    if (!photos.length) { closePhotoModal(); return; }
    setPhotoModal(m => ({ ...m, photos, index: Math.min(m.index, photos.length - 1) }));
  }, [sections, photoModal.open, photoModal.secId, photoModal.itemId, closePhotoModal]);

  useEffect(() => {
    const isOpen = photoModal.open || sheet.open || areaOpen || editPhoto.open;
    if (!isOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [photoModal.open, sheet.open, areaOpen, editPhoto.open]);

  useEffect(() => {
    const root = mainRef.current; if (!root) return;
    const ids = sections.map(s => s.id);
    const targets = ids.map(id => sectionRefs.current[id]).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) { const id = (e.target as HTMLElement).dataset["secid"] || ""; if (id) ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0); }
      let best = -1; let bestId = currentSecIdRef.current;
      for (const id of ids) { const r = ratios.get(id) ?? 0; if (r > best) { best = r; bestId = id; } }
      if (bestId && bestId !== currentSecIdRef.current) { currentSecIdRef.current = bestId; setCurrentSecId(bestId); }
    }, { root, threshold: [0, 0.12, 0.25, 0.5, 0.8, 1] });
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, [sections]);

  const bottomDockH = bottomCollapsed ? 64 : 220;

  if (loadingQuestions) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#f8fafc", gap: 16 }}>
        <Loader2 size={44} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: "#64748b" }}>点検項目を準備しています...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <div className={styles.qscCheckRunPage} style={{ ["--qscBottomH" as any]: `${bottomDockH}px` }}>
      <style>{`
        html,body{max-width:100%;overflow-x:hidden;margin:0;}
        .crp-topbar{position:fixed;top:0;left:0;right:0;z-index:100;height:56px;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:8px;}
        .crp-back{display:flex;align-items:center;gap:4px;color:#64748b;font-size:14px;font-weight:700;text-decoration:none;padding:8px 4px;}
        .crp-store{flex:1;display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;color:#1e293b;overflow:hidden;}
        .crp-store span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .crp-menu-btn{width:40px;height:40px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;display:grid;place-items:center;flex-shrink:0;cursor:pointer;}
        .crp-sectab{position:fixed;top:56px;left:0;right:0;z-index:${Z.sectionTab};height:52px;background:rgba(255,255,255,0.97);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:4px;padding:0 12px;}
        .crp-sectab::-webkit-scrollbar{display:none;}
        .crp-sectab-btn{flex-shrink:0;height:36px;padding:0 14px;border-radius:10px;border:none;font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .crp-sectab-btn.active{background:#1e293b;color:#fff;}
        .crp-sectab-btn.inactive{background:#f1f5f9;color:#64748b;}
        .crp-sectab-badge{min-width:18px;height:18px;border-radius:9px;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 4px;}
        .crp-sectab-badge.ng{background:#fee2e2;color:#dc2626;}
        .crp-sectab-badge.hold{background:#fef3c7;color:#d97706;}
        .crp-sectab-badge.done{background:#dcfce7;color:#16a34a;}
        .crp-main{position:fixed;top:108px;left:0;right:0;bottom:${bottomDockH}px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:12px 12px 24px;}
        .crp-section{margin-bottom:24px;}
        .crp-section-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#1e293b;border-radius:14px;margin-bottom:10px;}
        .crp-section-title{font-size:14px;font-weight:900;color:#fff;letter-spacing:0.02em;}
        .crp-section-count{font-size:12px;font-weight:800;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.12);padding:2px 8px;border-radius:8px;}
        .crp-item-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:20px;margin-bottom:10px;overflow:hidden;transition:border-color 0.15s,box-shadow 0.15s;}
        .crp-item-card.state-ok{border-color:#86efac;}
        .crp-item-card.state-ng{border-color:#fca5a5;}
        .crp-item-card.state-hold{border-color:#fcd34d;}
        .crp-item-card.state-na{border-color:#cbd5e1;}
        .crp-item-card.error{border-color:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,0.15);}
        .crp-item-card.ok-flash{animation:flash-ok 0.5s ease-out;}
        @keyframes flash-ok{0%{box-shadow:0 0 0 4px rgba(52,199,89,0.4);}100%{box-shadow:none;}}
        .crp-item-label-row{padding:14px 16px 10px;}
        .crp-item-label{font-size:14px;font-weight:800;color:#1e293b;line-height:1.4;}
        .crp-choices{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 10px 10px;}
        .crp-choice-btn{height:52px;border-radius:14px;border:1.5px solid transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;transition:all 0.12s;font-size:11px;font-weight:900;-webkit-tap-highlight-color:transparent;}
        .crp-choice-btn.unselected{border-color:#e2e8f0;background:#f8fafc;color:#94a3b8;}
        .crp-choice-btn.selected-ok{background:#d1fae5;border-color:#6ee7b7;color:#059669;}
        .crp-choice-btn.selected-hold{background:#fef3c7;border-color:#fcd34d;color:#d97706;}
        .crp-choice-btn.selected-ng{background:#fee2e2;border-color:#fca5a5;color:#dc2626;}
        .crp-choice-btn.selected-na{background:#e2e8f0;border-color:#cbd5e1;color:#475569;}
        .crp-detail{padding:0 10px 12px;display:flex;flex-direction:column;gap:8px;}
        .crp-detail-header{display:flex;align-items:center;justify-content:space-between;}
        .crp-detail-label{font-size:12px;font-weight:800;color:#94a3b8;display:flex;align-items:center;gap:4px;}
        .crp-required{font-size:10px;font-weight:900;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;}
        .crp-photo-btn{height:32px;padding:0 10px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;font-size:12px;font-weight:800;color:#64748b;display:flex;align-items:center;gap:4px;cursor:pointer;}
        .crp-photo-grid{display:flex;gap:8px;flex-wrap:wrap;}
        .crp-photo-thumb{width:64px;height:64px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;cursor:pointer;}
        .crp-photo-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
        .crp-textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:15px;font-weight:600;color:#1e293b;background:#f8fafc;resize:none;outline:none;font-family:inherit;transition:border-color 0.15s;-webkit-appearance:none;}
        .crp-textarea:focus{border-color:#6366f1;background:#fff;}
        .crp-textarea.missing{border-color:#f87171;background:#fff7f7;}
        .crp-textarea.hold{border-color:#fcd34d;background:#fffbeb;}
        .crp-preset-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;}
        .crp-preset-scroll::-webkit-scrollbar{display:none;}
        .crp-preset-chip{flex-shrink:0;height:30px;padding:0 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;color:#64748b;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;}
        .crp-error-line{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#dc2626;}
        .crp-next-sec-btn{width:100%;height:48px;border-radius:14px;border:1.5px dashed #cbd5e1;background:#f8fafc;font-size:13px;font-weight:800;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;margin-top:4px;}
        .crp-bottom{position:fixed;bottom:0;left:0;right:0;z-index:${Z.bottomDock};background:rgba(255,255,255,0.98);backdrop-filter:blur(16px);border-top:1px solid #e2e8f0;padding:0 0 env(safe-area-inset-bottom);transition:height 0.25s cubic-bezier(0.4,0,0.2,1);box-sizing:border-box;}
        .crp-bottom-grab{height:24px;display:flex;align-items:center;justify-content:center;cursor:row-resize;}
        .crp-bottom-grab-bar{width:36px;height:4px;border-radius:2px;background:#cbd5e1;}
        .crp-bottom-progress{padding:0 16px 10px;display:flex;align-items:center;gap:12px;}
        .crp-progress-ring{flex-shrink:0;}
        .crp-progress-info{flex:1;}
        .crp-progress-nums{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;}
        .crp-progress-done{font-size:15px;font-weight:900;color:#1e293b;}
        .crp-progress-warn{font-size:12px;font-weight:700;color:#94a3b8;}
        .crp-progress-warn.has-warn{color:#d97706;}
        .crp-seg-bar{height:6px;border-radius:3px;background:#f1f5f9;overflow:hidden;display:flex;}
        .crp-seg{height:100%;transition:width 0.3s;}
        .crp-seg.ok{background:#34d399;}
        .crp-seg.hold{background:#fbbf24;}
        .crp-seg.ng{background:#f87171;}
        .crp-seg.na{background:#94a3b8;}
        .crp-unset-btn{flex-shrink:0;height:36px;padding:0 12px;border-radius:10px;border:1px solid rgba(251,146,60,0.4);background:rgba(251,146,60,0.08);font-size:12px;font-weight:800;color:#d97706;display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;}
        .crp-bottom-actions{padding:0 12px 12px;display:flex;gap:8px;align-items:center;}
        .crp-sub-btn{height:48px;border-radius:14px;border:1.5px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:800;color:#64748b;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;flex:1;}
        .crp-submit-btn{height:56px;border-radius:16px;border:none;font-size:15px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;flex:2;background:#1e293b;transition:all 0.2s;}
        .crp-submit-btn.ready{background:#6366f1;box-shadow:0 8px 20px rgba(99,102,241,0.35);animation:pulse-submit 2s infinite;}
        @keyframes pulse-submit{0%,100%{transform:scale(1);}50%{transform:scale(1.02);}}
        .crp-submit-btn:disabled{opacity:0.6;}
        .crp-collapse-btn{width:36px;height:36px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;display:grid;place-items:center;cursor:pointer;flex-shrink:0;}
        .crp-missing-btn{margin:0 12px 12px;padding:12px;border-radius:14px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.06);font-size:13px;font-weight:800;color:#dc2626;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;width:calc(100% - 24px);box-sizing:border-box;}
        .crp-overlay{position:fixed;inset:0;z-index:${Z.overlay};}
        .crp-drawer-backdrop{position:absolute;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);}
        .crp-drawer{position:absolute;top:0;right:0;bottom:0;width:min(320px,85vw);background:#fff;box-shadow:-8px 0 32px rgba(0,0,0,0.15);display:flex;flex-direction:column;}
        .crp-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px;border-bottom:1px solid #e2e8f0;}
        .crp-drawer-title{font-size:18px;font-weight:950;color:#1e293b;}
        .crp-drawer-close{width:36px;height:36px;border-radius:10px;border:none;background:#f1f5f9;display:grid;place-items:center;cursor:pointer;}
        .crp-drawer-body{flex:1;overflow-y:auto;padding:12px;}
        .crp-drawer-item{width:100%;padding:14px 16px;border-radius:14px;border:none;background:transparent;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer;margin-bottom:4px;}
        .crp-drawer-item.current{background:#f1f5f9;}
        .crp-drawer-item-left{display:flex;flex-direction:column;gap:4px;}
        .crp-drawer-item-title{font-size:15px;font-weight:800;color:#1e293b;}
        .crp-drawer-badges{display:flex;gap:6px;align-items:center;}
        .crp-drawer-badge{font-size:11px;font-weight:900;padding:2px 7px;border-radius:6px;}
        .crp-drawer-badge.ng{background:#fee2e2;color:#dc2626;}
        .crp-drawer-badge.hold{background:#fef3c7;color:#d97706;}
        .crp-drawer-count{font-size:12px;font-weight:700;color:#94a3b8;}
        .crp-sheet-layer{position:fixed;inset:0;z-index:${Z.sheet};}
        .crp-sheet-bg{position:absolute;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(8px);}
        .crp-sheet-wrap{position:absolute;bottom:0;left:0;right:0;padding:0 16px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;}
        .crp-sheet-card{background:#fff;border-radius:20px;overflow:hidden;}
        .crp-sheet-title{font-size:15px;font-weight:900;color:#1e293b;padding:16px 16px 4px;text-align:center;}
        .crp-sheet-msg{font-size:13px;font-weight:600;color:#64748b;padding:0 16px 12px;text-align:center;}
        .crp-sheet-divider{height:1px;background:#f1f5f9;}
        .crp-sheet-btn{width:100%;padding:16px;font-size:16px;font-weight:800;color:#6366f1;border:none;background:transparent;cursor:pointer;}
        .crp-sheet-btn.destructive{color:#dc2626;}
        .crp-sheet-cancel{background:#fff;border-radius:16px;width:100%;padding:16px;font-size:16px;font-weight:800;color:#64748b;border:none;cursor:pointer;}
        .crp-photo-layer{position:fixed;inset:0;z-index:${Z.photoModal};}
        .crp-photo-bg{position:absolute;inset:0;background:rgba(0,0,0,0.92);}
        .crp-photo-card{position:absolute;inset:0;display:flex;flex-direction:column;}
        .crp-photo-top{display:flex;align-items:center;justify-content:space-between;padding:16px;}
        .crp-photo-title{font-size:16px;font-weight:900;color:#fff;}
        .crp-photo-actions{display:flex;gap:8px;align-items:center;}
        .crp-photo-count{font-size:13px;font-weight:700;color:rgba(255,255,255,0.6);}
        .crp-photo-icon-btn{width:36px;height:36px;border-radius:10px;border:none;background:rgba(255,255,255,0.15);display:grid;place-items:center;cursor:pointer;color:#fff;}
        .crp-photo-main{flex:1;display:flex;align-items:center;}
        .crp-photo-nav{width:48px;height:100%;border:none;background:transparent;color:rgba(255,255,255,0.6);display:grid;place-items:center;cursor:pointer;flex-shrink:0;}
        .crp-photo-nav:disabled{opacity:0.2;}
        .crp-photo-stage{flex:1;display:flex;align-items:center;justify-content:center;padding:8px;}
        .crp-photo-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      `}</style>

      {/* トップバー */}
      <header className="crp-topbar">
        <Link className="crp-back" href="/check" onClick={() => vibrate(10)}><ChevronLeft size={18} /> 戻る</Link>
        <div className="crp-store"><Store size={14} color="#6366f1" /><span>{storeLabel}</span></div>
        <button type="button" className="crp-menu-btn" onClick={() => { vibrate(10); setAreaOpen(true); }}><Menu size={18} color="#64748b" /></button>
      </header>

      {/* セクションタブ */}
      <nav className="crp-sectab">
        {sections.map(s => {
          const st = sectionAlert[s.id] ?? { ng: 0, hold: 0, done: 0, total: s.items.length };
          const allDone = st.done === st.total;
          return (
            <button key={s.id} type="button" className={`crp-sectab-btn ${s.id === currentSecId ? "active" : "inactive"}`} onClick={() => { vibrate(10); scrollToSection(s.id); }}>
              {s.title}
              {st.ng > 0 && <span className="crp-sectab-badge ng">{st.ng}</span>}
              {st.ng === 0 && st.hold > 0 && <span className="crp-sectab-badge hold">{st.hold}</span>}
              {st.ng === 0 && st.hold === 0 && allDone && <span className="crp-sectab-badge done">✓</span>}
            </button>
          );
        })}
      </nav>

      {/* メインリスト */}
      <main ref={el => { mainRef.current = el; }} className="crp-main" style={{ bottom: `${bottomDockH}px` }}>
        {sections.map((sec, secIdx) => {
          const nextSec = sections[secIdx + 1];
          return (
            <section key={sec.id} data-secid={sec.id} ref={el => { sectionRefs.current[sec.id] = el; }} className="crp-section">
              <div className="crp-section-head">
                <div className="crp-section-title">{sec.title}</div>
                <div className="crp-section-count">{sec.items.filter(i => i.state !== "unset").length}/{sec.items.length}</div>
              </div>
              {sec.items.map(it => {
                const showMissing = forceShowErrors && it.state === "ng" && !trimText(it.note);
                const k = itemKey(sec.id, it.id);
                const stateClass = it.state !== "unset" ? `state-${it.state}` : "";
                const flashClass = guideKey === `ok-flash-${k}` ? "ok-flash" : "";
                return (
                  <div key={it.id} ref={el => { itemRefs.current[k] = el; }} className={`crp-item-card ${stateClass} ${showMissing ? "error" : ""} ${flashClass}`}>
                    <div className="crp-item-label-row"><div className="crp-item-label">{it.label}</div></div>
                    <div className="crp-choices">
                      {CHECK_CHOICES.map(c => {
                        const isSel = it.state === c.state;
                        return (
                          <button key={c.state} type="button" className={`crp-choice-btn ${isSel ? `selected-${c.state}` : "unselected"}`} onClick={() => onChoose(sec.id, it.id, c.state)}>
                            {c.state === "ok" && <CheckCircle2 size={20} />}
                            {c.state === "hold" && <PauseCircle size={20} />}
                            {c.state === "ng" && <XCircle size={20} />}
                            {c.state === "na" && <MinusCircle size={20} />}
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    {it.state !== "unset" && (
                      <div className="crp-detail">
                        <div className="crp-detail-header">
                          <div className="crp-detail-label">
                            <MessageSquareText size={13} />
                            {it.state === "hold" ? "保留理由" : <>コメント{it.state === "ng" && <span className="crp-required">必須</span>}</>}
                          </div>
                          <button type="button" className="crp-photo-btn" onClick={() => openPhotoPicker(sec.id, it.id)}><ImagePlus size={14} /> 写真追加</button>
                        </div>
                        {(it.photos?.length ?? 0) > 0 && (
                          <div className="crp-photo-grid">
                            {(it.photos ?? []).map((p, idx) => (
                              <button key={p.id} type="button" className="crp-photo-thumb" onClick={() => openPhotoModalAt(sec.id, it.id, idx)}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.dataUrl} alt={`写真 ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}
                        {it.state === "hold" ? (
                          <>
                            <textarea ref={el => { holdRefs.current[k] = el; }} className="crp-textarea hold" value={it.holdNote ?? ""} onChange={e => setItemHoldNote(sec.id, it.id, e.target.value)} placeholder="保留の理由を入力してください" rows={2} />
                            <div className="crp-preset-scroll">{HOLD_PRESETS.map(t => <button key={t} type="button" className="crp-preset-chip" onClick={() => appendItemNote(sec.id, it.id, t, true)}><Plus size={11} /> {t}</button>)}</div>
                          </>
                        ) : (
                          <>
                            <textarea ref={el => { noteRefs.current[k] = el; }} className={`crp-textarea ${showMissing ? "missing" : ""}`} value={it.note ?? ""} onChange={e => setItemNote(sec.id, it.id, e.target.value)} placeholder={it.state === "ng" ? "NG理由（必須）" : "コメントを入力（任意）"} rows={2} />
                            {it.state === "ng" && <div className="crp-preset-scroll">{NG_PRESETS.map(t => <button key={t} type="button" className="crp-preset-chip" onClick={() => appendItemNote(sec.id, it.id, t, false)}><Plus size={11} /> {t}</button>)}</div>}
                            {showMissing && <div className="crp-error-line"><AlertTriangle size={14} /> NG の場合はコメント必須です</div>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {nextSec && <button type="button" className="crp-next-sec-btn" onClick={() => { vibrate(10); scrollToSection(nextSec.id); }}>次のエリアへ（{nextSec.title}）<ArrowDown size={15} /></button>}
            </section>
          );
        })}
      </main>

      {/* ボトムドック */}
      <div className="crp-bottom" style={{ height: `${bottomDockH}px`, overflow: "hidden" }}>
        {!bottomCollapsed && <div className="crp-bottom-grab" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}><div className="crp-bottom-grab-bar" /></div>}
        {!bottomCollapsed && (
          <div className="crp-bottom-progress">
            <div className="crp-progress-ring">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress.pct / 100)}`} strokeLinecap="round" transform="rotate(-90 22 22)" style={{ transition: "stroke-dashoffset 0.4s" }} />
                <text x="22" y="22" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="900" fill="#1e293b">{progress.pct}%</text>
              </svg>
            </div>
            <div className="crp-progress-info">
              <div className="crp-progress-nums">
                <span className="crp-progress-done">{progress.done}/{progress.total} 完了</span>
                <span className={`crp-progress-warn ${progress.ng > 0 || progress.hold > 0 ? "has-warn" : ""}`}>{progress.ng > 0 ? `NG ${progress.ng}件` : progress.hold > 0 ? `保留 ${progress.hold}件` : "順調"}</span>
              </div>
              <div className="crp-seg-bar">
                <div className="crp-seg ok" style={{ width: `${progress.ratio.ok * 100}%` }} />
                <div className="crp-seg hold" style={{ width: `${progress.ratio.hold * 100}%` }} />
                <div className="crp-seg ng" style={{ width: `${progress.ratio.ng * 100}%` }} />
                <div className="crp-seg na" style={{ width: `${progress.ratio.na * 100}%` }} />
              </div>
            </div>
            {progress.unset > 0 && <button type="button" className="crp-unset-btn" onClick={goFirstUnset}><AlertTriangle size={14} /> {progress.unset}件</button>}
          </div>
        )}
        {!bottomCollapsed && (
          <div className="crp-bottom-actions">
            <button type="button" className="crp-collapse-btn" onClick={() => { vibrate(10); setBottomCollapsed(true); }}><ChevronUp size={16} color="#64748b" /></button>
            <button type="button" className="crp-sub-btn" onClick={saveDraft} disabled={saving}><Save size={16} /> {saving ? "保存中…" : "保存"}</button>
            <button type="button" className="crp-sub-btn" onClick={discardDraft} disabled={saving || submitBusy}><Trash2 size={16} /> 破棄</button>
            <button type="button" className={`crp-submit-btn ${progress.unset === 0 ? "ready" : ""}`} onClick={submit} disabled={submitBusy}>
              {submitBusy ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
              {submitBusy ? "送信中…" : "完了・送信"}
            </button>
          </div>
        )}
        {bottomCollapsed && (
          <div className="crp-bottom-actions" style={{ padding: "6px 12px 8px" }}>
            <button type="button" className="crp-collapse-btn" onClick={() => { vibrate(10); setBottomCollapsed(false); }}><ChevronDown size={16} color="#64748b" /></button>
            <button type="button" className={`crp-submit-btn ${progress.unset === 0 ? "ready" : ""}`} onClick={submit} disabled={submitBusy} style={{ flex: 3, height: 48 }}>
              {submitBusy ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
              {submitBusy ? "送信中…" : `完了・送信 (${progress.pct}%)`}
            </button>
          </div>
        )}
        {forceShowErrors && missingRequiredNotes.length > 0 && (
          <button type="button" className="crp-missing-btn" onClick={scrollToFirstMissing}>
            <AlertTriangle size={14} /> 必須未入力 {missingRequiredNotes.length}件 — タップして移動
          </button>
        )}
      </div>

      {/* エリアドロワー */}
      {areaOpen && (
        <div className="crp-overlay" role="dialog">
          <div className="crp-drawer-backdrop" onClick={() => setAreaOpen(false)} />
          <div className="crp-drawer">
            <div className="crp-drawer-head"><div className="crp-drawer-title">エリア一覧</div><button type="button" className="crp-drawer-close" onClick={() => setAreaOpen(false)}><X size={18} /></button></div>
            <div className="crp-drawer-body">
              {sections.map(s => {
                const st = sectionAlert[s.id] ?? { ng: 0, hold: 0, done: 0, total: s.items.length };
                return (
                  <button key={s.id} type="button" className={`crp-drawer-item ${s.id === currentSecId ? "current" : ""}`} onClick={() => { vibrate(10); setAreaOpen(false); setTimeout(() => scrollToSection(s.id), 100); }}>
                    <div className="crp-drawer-item-left">
                      <div className="crp-drawer-item-title">{s.title}</div>
                      <div className="crp-drawer-badges">
                        {st.ng > 0 && <span className="crp-drawer-badge ng">NG {st.ng}</span>}
                        {st.hold > 0 && <span className="crp-drawer-badge hold">保留 {st.hold}</span>}
                        <span className="crp-drawer-count">{st.done}/{st.total}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 写真モーダル */}
      {photoModal.open && (
        <div className="crp-photo-layer" role="dialog">
          <div className="crp-photo-bg" onClick={closePhotoModal} />
          <div className="crp-photo-card">
            <div className="crp-photo-top">
              <div className="crp-photo-title">写真</div>
              <div className="crp-photo-actions">
                <span className="crp-photo-count">{photoModal.index + 1}/{photoModal.photos.length}</span>
                <button type="button" className="crp-photo-icon-btn" onClick={modalDeleteCurrent}><Trash2 size={16} /></button>
                <button type="button" className="crp-photo-icon-btn" onClick={closePhotoModal}><X size={16} /></button>
              </div>
            </div>
            <div className="crp-photo-main">
              <button type="button" className="crp-photo-nav" onClick={modalPrev} disabled={photoModal.index <= 0}><ChevronLeftIcon size={24} /></button>
              <div className="crp-photo-stage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="crp-photo-img" src={photoModal.photos[photoModal.index]?.dataUrl} alt="拡大写真" />
              </div>
              <button type="button" className="crp-photo-nav" onClick={modalNext} disabled={photoModal.index >= photoModal.photos.length - 1}><ChevronRight size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 改善期日モーダル */}
      {deadlineModalOpen && (
        <div className="crp-sheet-layer" role="dialog">
          <button className="crp-sheet-bg" onClick={() => setDeadlineModalOpen(false)} style={{ border: "none", cursor: "pointer", width: "100%", height: "100%", position: "absolute" }} />
          <div className="crp-sheet-wrap">
            <div className="crp-sheet-card" style={{ padding: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", marginBottom: 6, textAlign: "center" }}>改善報告期日</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 20, textAlign: "center" }}>NG項目の改善を報告する期日を設定してください</div>
              <input type="date" value={improvementDeadline} onChange={e => setImprovementDeadline(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", height: 52, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 17, fontWeight: 700, color: "#1e293b", padding: "0 16px", outline: "none", WebkitAppearance: "none" }} />
              <button type="button" onClick={onDeadlineConfirmed}
                style={{ marginTop: 16, width: "100%", height: 52, borderRadius: 14, border: "none", background: "#1e293b", color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
                この期日で完了する
              </button>
            </div>
            <button type="button" className="crp-sheet-cancel" onClick={() => setDeadlineModalOpen(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* アクションシート */}
      {sheet.open && (
        <div className="crp-sheet-layer" role="dialog">
          <button className="crp-sheet-bg" onClick={() => sheet.onCancel ? sheet.onCancel() : setSheet({ open: false })} style={{ border: "none", cursor: "pointer", width: "100%", height: "100%", position: "absolute" }} />
          <div className="crp-sheet-wrap">
            <div className="crp-sheet-card">
              {sheet.title && <div className="crp-sheet-title">{sheet.title}</div>}
              {sheet.message && <div className="crp-sheet-msg">{sheet.message}</div>}
              {sheet.primaryText && <><div className="crp-sheet-divider" /><button type="button" className={`crp-sheet-btn ${sheet.destructivePrimary ? "destructive" : ""}`} onClick={() => { vibrate(10); sheet.onPrimary?.(); }}>{sheet.primaryText}</button></>}
              {sheet.secondaryText && <><div className="crp-sheet-divider" /><button type="button" className="crp-sheet-btn" onClick={() => { vibrate(10); sheet.onSecondary?.(); }}>{sheet.secondaryText}</button></>}
            </div>
            <button type="button" className="crp-sheet-cancel" onClick={() => { vibrate(10); sheet.onCancel ? sheet.onCancel() : setSheet({ open: false }); }}>{sheet.cancelText ?? "キャンセル"}</button>
          </div>
        </div>
      )}

      {/* 途中保存トースト */}
      {savedToast && (
        <div style={{ position: "fixed", bottom: 120, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "#fff", padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>
          ✅ 途中保存しました
        </div>
      )}

      {/* 写真編集モーダル */}
      <div style={{ position: "fixed", inset: 0, zIndex: Z.editModal, pointerEvents: editPhoto.open ? "auto" : "none" }}>
        <PhotoEditModal open={editPhoto.open} dataUrl={editPhoto.open ? editPhoto.dataUrl : ""} onClose={editPhoto.open ? editPhoto.onClose : () => {}} onSave={editPhoto.open ? editPhoto.onSave : () => {}} />
      </div>

      <input ref={pickPhotoRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={async e => {
          const target = pendingPhotoTarget;
          const picked = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
          e.currentTarget.value = "";
          if (!target || !picked.length) return;
          await addPhotosToItem(target.secId, target.itemId, picked);
          setPendingPhotoTarget(null);
        }}
      />
    </div>
  );
}
