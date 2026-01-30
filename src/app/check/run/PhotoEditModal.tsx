// src/app/check/run/PhotoEditModal.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Check, Circle, MoveRight, RotateCcw, Trash2, Minus, Plus } from "lucide-react";

type Props = {
  open: boolean;
  dataUrl: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

type Tool = "circle" | "arrow";
type Pt = { x: number; y: number };
type ImgSize = { w: number; h: number };

type Shape =
  | { kind: "circle"; a: { nx: number; ny: number }; b: { nx: number; ny: number }; color: string; widthPx: number }
  | { kind: "arrow"; a: { nx: number; ny: number }; b: { nx: number; ny: number }; color: string; widthPx: number };

export default function PhotoEditModal({ open, dataUrl, onClose, onSave }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const prevRef = useRef<HTMLCanvasElement | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgSizeRef = useRef<ImgSize>({ w: 1, h: 1 });

  const tfRef = useRef<{ scale: number; ox: number; oy: number; cw: number; ch: number }>({
    scale: 1,
    ox: 0,
    oy: 0,
    cw: 1,
    ch: 1,
  });

  const [tool, setTool] = useState<Tool>("circle");
  const [color, setColor] = useState("#ff3b30");
  const [width, setWidth] = useState(6);

  const [drawing, setDrawing] = useState(false);
  const startRef = useRef<Pt | null>(null);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const undoRef = useRef<Shape[][]>([]);
  const canUndo = shapes.length > 0 && undoRef.current.length > 0;

  const swatches = useMemo(
    () => ["#ff3b30", "#ffcc00", "#34c759", "#007aff", "#af52de", "#ffffff", "#000000"],
    []
  );

  // ✅ iOS Safariの「戻るスワイプ」や背面タップ貫通を抑える
  // ✅ passive event error回避：preventDefaultするリスナーは {passive:false} で付ける
  useEffect(() => {
    if (!open) return;

    const stop = (e: Event) => {
      const anyE = e as any;
      if (anyE && anyE.cancelable && typeof anyE.preventDefault === "function") anyE.preventDefault();
      if (typeof anyE.stopPropagation === "function") anyE.stopPropagation();
    };

    const opts: AddEventListenerOptions = { passive: false };

    document.addEventListener("touchmove", stop, opts);
    document.addEventListener("gesturestart", stop as any, opts);
    document.addEventListener("gesturechange", stop as any, opts);

    return () => {
      document.removeEventListener("touchmove", stop as any);
      document.removeEventListener("gesturestart", stop as any);
      document.removeEventListener("gesturechange", stop as any);
    };
  }, [open]);

  // ===== load image =====
  useEffect(() => {
    if (!open) return;

    setDrawing(false);
    startRef.current = null;
    undoRef.current = [];
    setShapes([]);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      imgSizeRef.current = { w: img.width || 1, h: img.height || 1 };
      requestAnimationFrame(() => resizeAndRedraw());
    };
    img.src = dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataUrl]);

  // ===== resize observer =====
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => resizeAndRedraw());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shapes]);

  const getDpr = () => window.devicePixelRatio || 1;

  const resizeCanvas = (c: HTMLCanvasElement, cssW: number, cssH: number) => {
    const dpr = getDpr();
    c.width = Math.max(1, Math.round(cssW * dpr));
    c.height = Math.max(1, Math.round(cssH * dpr));
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;

    const ctx = c.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const computeTransform = (cw: number, ch: number) => {
    const { w: iw, h: ih } = imgSizeRef.current;
    const scale = Math.min(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const ox = (cw - drawW) / 2;
    const oy = (ch - drawH) / 2;
    tfRef.current = { scale, ox, oy, cw, ch };
  };

  const clear = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    ctx.clearRect(0, 0, cw, ch);
  };

  const drawImageContained = (ctx: CanvasRenderingContext2D) => {
    const img = imgRef.current;
    if (!img) return;
    const { scale, ox, oy } = tfRef.current;
    const { w: iw, h: ih } = imgSizeRef.current;
    ctx.drawImage(img, 0, 0, iw, ih, ox, oy, iw * scale, ih * scale);
  };

  const toNorm = (p: Pt) => {
    const { scale, ox, oy } = tfRef.current;
    const { w: iw, h: ih } = imgSizeRef.current;

    const xIn = (p.x - ox) / scale;
    const yIn = (p.y - oy) / scale;

    const cx = Math.min(iw, Math.max(0, xIn));
    const cy = Math.min(ih, Math.max(0, yIn));

    return { nx: cx / iw, ny: cy / ih };
  };

  const toCanvas = (n: { nx: number; ny: number }) => {
    const { scale, ox, oy } = tfRef.current;
    const { w: iw, h: ih } = imgSizeRef.current;
    return { x: ox + n.nx * iw * scale, y: oy + n.ny * ih * scale };
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, a: Pt, b: Pt, col: string, w: number) => {
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, a: Pt, b: Pt, col: string, w: number) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;

    const headLen = Math.max(14, w * 3.2);
    const headWidth = Math.max(12, w * 2.6);

    const ux = dx / len;
    const uy = dy / len;

    const bx = b.x - ux * headLen;
    const by = b.y - uy * headLen;

    const px = -uy;
    const py = ux;

    const lx = bx + px * (headWidth / 2);
    const ly = by + py * (headWidth / 2);
    const rx = bx - px * (headWidth / 2);
    const ry = by - py * (headWidth / 2);

    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawAll = () => {
    const base = baseRef.current;
    const prev = prevRef.current;
    const stage = stageRef.current;
    if (!base || !prev || !stage) return;

    const bctx = base.getContext("2d");
    const pctx = prev.getContext("2d");
    if (!bctx || !pctx) return;

    const cw = stage.clientWidth;
    const ch = stage.clientHeight;

    clear(bctx, cw, ch);
    clear(pctx, cw, ch);

    drawImageContained(bctx);

    bctx.save();
    bctx.lineCap = "round";
    bctx.lineJoin = "round";

    for (const s of shapes) {
      const a = toCanvas(s.a);
      const b = toCanvas(s.b);
      const displayWidth = s.widthPx * tfRef.current.scale;
      if (s.kind === "circle") drawCircle(bctx, a, b, s.color, displayWidth);
      if (s.kind === "arrow") drawArrow(bctx, a, b, s.color, displayWidth);
    }

    bctx.restore();
  };

  const clearPreview = () => {
    const prev = prevRef.current;
    const stage = stageRef.current;
    if (!prev || !stage) return;
    const pctx = prev.getContext("2d");
    if (!pctx) return;
    clear(pctx, stage.clientWidth, stage.clientHeight);
  };

  const drawPreview = (a: Pt, b: Pt) => {
    const prev = prevRef.current;
    const stage = stageRef.current;
    if (!prev || !stage) return;
    const pctx = prev.getContext("2d");
    if (!pctx) return;

    clear(pctx, stage.clientWidth, stage.clientHeight);

    pctx.save();
    pctx.lineCap = "round";
    pctx.lineJoin = "round";

    if (tool === "circle") drawCircle(pctx, a, b, color, width);
    if (tool === "arrow") drawArrow(pctx, a, b, color, width);

    pctx.restore();
  };

  const resizeAndRedraw = () => {
    const stage = stageRef.current;
    const base = baseRef.current;
    const prev = prevRef.current;
    const img = imgRef.current;
    if (!stage || !base || !prev || !img) return;

    const cw = Math.max(1, stage.clientWidth);
    const ch = Math.max(1, stage.clientHeight);

    resizeCanvas(base, cw, ch);
    resizeCanvas(prev, cw, ch);

    computeTransform(cw, ch);
    drawAll();
  };

  const getPos = (e: React.PointerEvent) => {
    const canvas = prevRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imgRef.current) return;
    const canvas = prevRef.current;
    if (!canvas) return;

    canvas.setPointerCapture?.(e.pointerId);

    setDrawing(true);
    const p = getPos(e);
    startRef.current = p;
    drawPreview(p, p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing || !startRef.current) return;
    const p = getPos(e);
    drawPreview(startRef.current, p);
  };

  const commit = (a: Pt, b: Pt) => {
    undoRef.current.push(shapes.map((x) => x));
    if (undoRef.current.length > 50) undoRef.current.shift();

    const na = toNorm(a);
    const nb = toNorm(b);

    const wImg = Math.max(2, Math.round(width / tfRef.current.scale));

    const next: Shape =
      tool === "circle"
        ? { kind: "circle", a: na, b: nb, color, widthPx: wImg }
        : { kind: "arrow", a: na, b: nb, color, widthPx: wImg };

    setShapes((prev) => prev.concat(next));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing || !startRef.current) return;

    const a = startRef.current;
    const b = getPos(e);

    setDrawing(false);
    startRef.current = null;

    clearPreview();
    commit(a, b);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => drawAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, open]);

  const undo = () => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    setShapes(prev);
  };

  const clearMarks = () => {
    undoRef.current.push(shapes.map((x) => x));
    setShapes([]);
    clearPreview();
  };

  const save = () => {
    const img = imgRef.current;
    if (!img) return;

    const { w: iw, h: ih } = imgSizeRef.current;
    const off = document.createElement("canvas");
    off.width = iw;
    off.height = ih;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, iw, ih);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const toImg = (n: { nx: number; ny: number }) => ({ x: n.nx * iw, y: n.ny * ih });

    for (const s of shapes) {
      const a = toImg(s.a);
      const b = toImg(s.b);
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.widthPx;

      if (s.kind === "circle") {
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.beginPath();
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) continue;

        const headLen = Math.max(12, s.widthPx * 3.2);
        const headWidth = Math.max(10, s.widthPx * 2.6);

        const ux = dx / len;
        const uy = dy / len;

        const bx = b.x - ux * headLen;
        const by = b.y - uy * headLen;

        const px = -uy;
        const py = ux;

        const lx = bx + px * (headWidth / 2);
        const ly = by + py * (headWidth / 2);
        const rx = bx - px * (headWidth / 2);
        const ry = by - py * (headWidth / 2);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();

    const out = off.toDataURL("image/jpeg", 0.92);
    onSave(out);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shapes]);

  if (!open) return null;

  return (
    <div
      style={S.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="写真編集"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={S.sheet} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        {/* top */}
        <div style={S.top}>
          <button type="button" onClick={onClose} style={S.iconBtn} aria-label="閉じる">
            <X size={18} />
          </button>

          <div style={S.title}>写真に書き込み</div>

          <button type="button" onClick={save} style={{ ...S.iconBtn, ...S.primary }} aria-label="保存">
            <Check size={18} />
          </button>
        </div>

        {/* tools */}
        <div style={S.tools}>
          <div style={S.seg}>
            <button type="button" onClick={() => setTool("circle")} style={segBtn(tool === "circle")}>
              <Circle size={16} /> 丸
            </button>
            <button type="button" onClick={() => setTool("arrow")} style={segBtn(tool === "arrow")}>
              <MoveRight size={16} /> 矢印
            </button>
          </div>

          <div style={S.right}>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              style={{ ...S.iconBtnSm, opacity: canUndo ? 1 : 0.35 }}
              aria-label="戻る"
            >
              <RotateCcw size={16} />
            </button>
            <button type="button" onClick={clearMarks} style={S.iconBtnSm} aria-label="クリア">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* controls */}
        <div style={S.controls}>
          <div style={S.swatches}>
            {swatches.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} style={swatchBtn(c, color)} aria-label={`color ${c}`} />
            ))}
            <label style={S.colorPick}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={S.colorInput}
                aria-label="カスタム色"
              />
            </label>
          </div>

          <div style={S.widthCtl}>
            <button type="button" onClick={() => setWidth((w) => Math.max(2, w - 1))} style={S.iconBtnSm}>
              <Minus size={16} />
            </button>
            <input
              type="range"
              min={2}
              max={18}
              step={1}
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value, 10))}
              style={S.slider}
              aria-label="太さ"
            />
            <button type="button" onClick={() => setWidth((w) => Math.min(18, w + 1))} style={S.iconBtnSm}>
              <Plus size={16} />
            </button>
            <div style={S.widthLabel}>{width}px</div>
          </div>
        </div>

        {/* stage */}
        <div ref={stageRef} style={S.stage}>
          <canvas ref={baseRef} style={S.canvas} />
          <canvas
            ref={prevRef}
            style={{ ...S.canvas, ...S.canvasTop }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </div>
  );
}

/* ===== styles (スマホ最適化) ===== */
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.72)",
    zIndex: 20000,
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    padding: 0,
    overscrollBehavior: "contain",
    touchAction: "none",
  },
  sheet: {
    width: "100%",
    height: "100%",
    background: "rgba(12,12,14,.98)",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    paddingTop: "env(safe-area-inset-top, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  top: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },
  title: { color: "rgba(255,255,255,.92)", fontWeight: 800, fontSize: 14 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  primary: {
    background: "rgba(0,122,255,.22)",
    border: "1px solid rgba(0,122,255,.35)",
  },
  tools: {
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  seg: { display: "flex", gap: 8 },
  right: { display: "flex", gap: 8 },
  iconBtnSm: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  controls: {
    padding: "0 12px 10px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  swatches: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    paddingTop: 6,
  },
  colorPick: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    overflow: "hidden",
    display: "inline-flex",
  },
  colorInput: { width: 32, height: 32, border: "none", padding: 0, background: "transparent" },
  widthCtl: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px auto",
    gap: 8,
    alignItems: "center",
    paddingTop: 6,
  },
  slider: { width: "100%", accentColor: "#ffffff" },
  widthLabel: { color: "rgba(255,255,255,.70)", fontWeight: 800, fontSize: 12, paddingLeft: 2 },
  stage: {
    position: "relative",
    flex: 1,
    background: "rgba(0,0,0,.22)",
    overflow: "hidden",
  },
  canvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block",
    touchAction: "none",
  },
  canvasTop: {},
};

function segBtn(on: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: on ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    userSelect: "none",
  };
}

function swatchBtn(c: string, cur: string): React.CSSProperties {
  const on = c.toLowerCase() === cur.toLowerCase();
  return {
    width: 26,
    height: 26,
    borderRadius: 999,
    background: c,
    border: on ? "2px solid rgba(255,255,255,.92)" : "1px solid rgba(255,255,255,.18)",
    boxShadow: on ? "0 0 0 3px rgba(255,255,255,.10)" : "none",
    cursor: "pointer",
  };
}
