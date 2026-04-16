"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight, ArrowLeft, AlertTriangle, Trophy,
  Target, Home, Loader2, CheckCircle2, Download,
  PauseCircle, TrendingDown, BarChart2, RefreshCw,
  ThumbsUp,
} from "lucide-react";

/* ========================= Types ========================= */
type RankRow = {
  storeId: string;
  storeName: string;
  totalScore: number;
  q_score?: number | null;
  s_score?: number | null;
  c_score?: number | null;
  inspectionDate?: string;
  userName?: string;
};

type CheckItem = {
  id: string;
  label: string;
  note?: string;
  state: "ok" | "ng" | "hold" | "na";
  category?: string;
  photos?: { id?: string; url?: string; key?: string }[];
};

type CheckSection = {
  title: string;
  items: CheckItem[];
};

type ResultDetail = {
  sections: CheckSection[];
  storeName?: string;
  summary?: {
    inspectionDate?: string;
    ok?: number;
    ng?: number;
    hold?: number;
    na?: number;
    point?: number;
    categoryScores?: Record<string, { ok: number; maxScore: number; point: number }>;
  };
};

type HistoryItem = {
  resultId: string;
  submittedAt: string;
  status: string;
  summary?: {
    point?: number;
    ok?: number;
    ng?: number;
    hold?: number;
    inspectionDate?: string;
  };
};

type StoreRow = {
  storeId: string;
  name: string;
  score: number;
  q: number | null;
  s: number | null;
  c: number | null;
  inspectionDate?: string;
};

/* ========================= Quarter helpers ========================= */
type QuarterInfo = { quarter: number; fiscalYear: number; label: string; shortLabel: string };

function buildAllQuarterOptions(): QuarterInfo[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let quarter = month >= 4 && month <= 6 ? 1 : month >= 7 && month <= 9 ? 2 : month >= 10 && month <= 12 ? 3 : 4;
  let fiscalYear = month >= 4 ? year : year - 1;

  const options: QuarterInfo[] = [];
  for (let i = 0; i < 8; i++) {
    const qLabels: Record<number, string> = {
      1: `${fiscalYear} Q1（4〜6月）`,
      2: `${fiscalYear} Q2（7〜9月）`,
      3: `${fiscalYear} Q3（10〜12月）`,
      4: `${fiscalYear} Q4（1〜3月）`,
    };
    options.push({ quarter, fiscalYear, label: qLabels[quarter], shortLabel: `${fiscalYear} Q${quarter}` });
    quarter--;
    if (quarter === 0) { quarter = 4; fiscalYear--; }
  }
  return options;
}

function getUniqueFiscalYears(options: QuarterInfo[]): number[] {
  return Array.from(new Set(options.map(o => o.fiscalYear))).sort((a, b) => b - a);
}

/* ========================= Photo components ========================= */
function PhotoCarousel({ photos, onZoom }: { photos: { url?: string }[]; onZoom: (url: string) => void }) {
  const [idx, setIdx] = useState(0);
  const urls = photos.map(p => p.url).filter((u): u is string => !!u && u.startsWith("http"));
  if (urls.length === 0) return null;
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#e2e8f0", maxWidth: 360 }}>
      <img src={urls[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} onClick={() => onZoom(urls[idx])} />
      <button onClick={() => onZoom(urls[idx])} style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(15,23,42,0.65)", border: "none", borderRadius: 6, padding: 5, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
      </button>
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }} disabled={idx === 0}
            style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", padding: "3px 5px", opacity: idx === 0 ? 0.3 : 1 }}>
            ‹
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.min(urls.length - 1, i + 1)); }} disabled={idx === urls.length - 1}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", padding: "3px 5px", opacity: idx === urls.length - 1 ? 0.3 : 1 }}>
            ›
          </button>
          <div style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "1px 6px", borderRadius: 4 }}>
            {idx + 1}/{urls.length}
          </div>
        </>
      )}
    </div>
  );
}

/* ========================= Color helpers ========================= */
function getScoreColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 75) return "#2563eb";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

/* ========================= CSV Export ========================= */
function exportCSV(storeList: StoreRow[], label: string) {
  const header = ["店舗名", "総合スコア", "Q（品質）", "S（接客）", "C（清潔）", "点検日"];
  const rows = storeList.map(s => [
    s.name,
    s.score,
    s.q ?? "—",
    s.s ?? "—",
    s.c ?? "—",
    s.inspectionDate ?? "—",
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `QSCランキング_${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ========================= Analysis helpers ========================= */
// 常習NGの特定（複数回NGになっている設問）
function findChronicNg(
  currentSections: CheckSection[],
  prevSections: CheckSection[]
): string[] {
  const currentNgIds = new Set(
    currentSections.flatMap(s => s.items.filter(i => i.state === "ng").map(i => i.id))
  );
  return prevSections
    .flatMap(s => s.items.filter(i => i.state === "ng" && currentNgIds.has(i.id)))
    .map(i => i.id);
}

/* ========================= Main Page ========================= */
export default function QuarterAnalyticsPage() {
  const allQuarterOptions = useMemo(() => buildAllQuarterOptions(), []);
  const fiscalYears = useMemo(() => getUniqueFiscalYears(allQuarterOptions), [allQuarterOptions]);

  const [selectedFy, setSelectedFy] = useState<number>(allQuarterOptions[0].fiscalYear);
  const [selectedQ, setSelectedQ] = useState<number>(allQuarterOptions[0].quarter);

  const selectedOption = useMemo(() =>
    allQuarterOptions.find(o => o.fiscalYear === selectedFy && o.quarter === selectedQ) ?? allQuarterOptions[0],
  [allQuarterOptions, selectedFy, selectedQ]);

  const availableQuarters = useMemo(() =>
    allQuarterOptions.filter(o => o.fiscalYear === selectedFy),
  [allQuarterOptions, selectedFy]);

  const [allRows, setAllRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // 詳細データ
  const [currentDetail, setCurrentDetail] = useState<ResultDetail | null>(null);
  const [prevDetail, setPrevDetail] = useState<ResultDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ng" | "ok" | "hold" | "analysis">("ng");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());

  const togglePhotos = (id: string) => {
    setExpandedPhotos(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ランキング取得
  useEffect(() => {
    setLoading(true);
    setSelectedStoreId(null);
    fetch(`/api/ranking?quarter=${selectedOption.quarter}&fiscalYear=${selectedOption.fiscalYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const byStore = new Map<string, RankRow>();
        for (const row of (data.all as RankRow[]) ?? []) {
          const existing = byStore.get(row.storeId);
          if (!existing || row.totalScore > existing.totalScore) {
            byStore.set(row.storeId, row);
          }
        }
        setAllRows([...byStore.values()]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOption.quarter, selectedOption.fiscalYear]);

  // 詳細取得
  useEffect(() => {
    if (!selectedStoreId) { setCurrentDetail(null); setPrevDetail(null); setHistory([]); return; }
    setDetailLoading(true);
    setActiveTab("ng");

    const fetchDetail = async () => {
      try {
        // 履歴取得
        const histRes = await fetch(`/api/check/results/history?storeId=${encodeURIComponent(selectedStoreId)}`, { cache: "no-store" });
        const histJson = histRes.ok ? await histRes.json() : { items: [] };
        const items: HistoryItem[] = Array.isArray(histJson?.items) ? histJson.items : [];
        setHistory(items);

        if (items.length === 0) return;

        // 最新の詳細取得
        const latest = items[0];
        const detailRes = await fetch(
          `/api/check/results/detail?storeId=${encodeURIComponent(selectedStoreId)}&resultId=${encodeURIComponent(latest.resultId)}`,
          { cache: "no-store" }
        );
        if (detailRes.ok) setCurrentDetail(await detailRes.json());

        // 前回の詳細取得
        if (items.length >= 2) {
          const prev = items[1];
          const prevRes = await fetch(
            `/api/check/results/detail?storeId=${encodeURIComponent(selectedStoreId)}&resultId=${encodeURIComponent(prev.resultId)}`,
            { cache: "no-store" }
          );
          if (prevRes.ok) setPrevDetail(await prevRes.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedStoreId]);

  const storeList: StoreRow[] = useMemo(() =>
    [...allRows]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(r => ({ storeId: r.storeId, name: r.storeName, score: r.totalScore, q: r.q_score ?? null, s: r.s_score ?? null, c: r.c_score ?? null, inspectionDate: r.inspectionDate })),
  [allRows]);

  const selectedStore = storeList.find(s => s.storeId === selectedStoreId);
  const avgScore = storeList.length > 0 ? Math.round(storeList.reduce((a, s) => a + s.score, 0) / storeList.length) : 0;

  // 詳細分析データ
  const allItems = useMemo(() =>
    currentDetail?.sections?.flatMap(s => s.items.map(i => ({ ...i, sectionTitle: s.title }))) ?? [],
  [currentDetail]);

  const ngItems = useMemo(() => allItems.filter(i => i.state === "ng"), [allItems]);
  const okItems = useMemo(() => allItems.filter(i => i.state === "ok"), [allItems]);
  const holdItems = useMemo(() => allItems.filter(i => i.state === "hold"), [allItems]);

  const prevAllItems = useMemo(() =>
    prevDetail?.sections?.flatMap(s => s.items.map(i => ({ ...i, sectionTitle: s.title }))) ?? [],
  [prevDetail]);
  const prevNgIds = useMemo(() => new Set(prevAllItems.filter(i => i.state === "ng").map(i => i.id)), [prevAllItems]);

  // 常習NG（今回もNGかつ前回もNG）
  const chronicNgIds = useMemo(() =>
    new Set(ngItems.filter(i => prevNgIds.has(i.id)).map(i => i.id)),
  [ngItems, prevNgIds]);

  // 改善（前回NGで今回OK）
  const improvedIds = useMemo(() =>
    new Set(okItems.filter(i => prevNgIds.has(i.id)).map(i => i.id)),
  [okItems, prevNgIds]);

  // 新規NG（前回OKで今回NG）
  const newNgIds = useMemo(() =>
    new Set(ngItems.filter(i => !prevNgIds.has(i.id)).map(i => i.id)),
  [ngItems, prevNgIds]);

  const currentScore = currentDetail?.summary?.point ?? selectedStore?.score ?? 0;
  const prevScore = history[1]?.summary?.point ?? null;
  const scoreDiff = prevScore !== null ? currentScore - prevScore : null;

  /* ========== ランキング画面 ========== */
  if (!selectedStoreId) {
    return (
      <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", color: "#1e293b" }}>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
          .aq-row:hover { background: #f8fafc !important; }
        `}</style>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <Home size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} color="#cbd5e1" />
            <span style={{ fontWeight: 900, color: "#1e293b" }}>クォーター分析</span>
          </nav>

          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>QSCランキング分析</h1>
              <p style={{ color: "#64748b", fontWeight: 700, marginTop: 4, margin: "4px 0 0" }}>各店舗のクォーター評価と重点改善項目の特定</p>
            </div>
            {/* 年度 + クォーター選択 + CSV */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {/* 年度セレクト */}
              <select
                value={selectedFy}
                onChange={e => {
                  const fy = Number(e.target.value);
                  setSelectedFy(fy);
                  const available = allQuarterOptions.filter(o => o.fiscalYear === fy);
                  if (available.length > 0) setSelectedQ(available[0].quarter);
                }}
                style={{ height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "0 14px", fontSize: 13, fontWeight: 800, color: "#1e293b", background: "#fff", cursor: "pointer", outline: "none" }}
              >
                {fiscalYears.map(fy => <option key={fy} value={fy}>{fy}年度</option>)}
              </select>
              {/* クォータータブ */}
              {availableQuarters.map(q => (
                <button key={q.quarter} onClick={() => setSelectedQ(q.quarter)}
                  style={{ padding: "10px 18px", borderRadius: 12, border: "1.5px solid", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", borderColor: selectedQ === q.quarter ? "#1e293b" : "#e2e8f0", background: selectedQ === q.quarter ? "#1e293b" : "#fff", color: selectedQ === q.quarter ? "#fff" : "#64748b" }}>
                  {q.shortLabel}
                </button>
              ))}
              {/* CSV出力 */}
              <button
                onClick={() => exportCSV(storeList, selectedOption.label)}
                disabled={storeList.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", color: storeList.length === 0 ? "#94a3b8" : "#1e293b", fontSize: 13, fontWeight: 800, cursor: storeList.length === 0 ? "not-allowed" : "pointer" }}>
                <Download size={15} /> CSV出力
              </button>
            </div>
          </header>

          {/* サマリーカード */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
            <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>クォーター平均スコア</div>
              <div style={{ fontSize: 36, fontWeight: 950, color: "#4f46e5" }}>{loading ? "—" : avgScore}<small style={{ fontSize: 16, fontWeight: 700 }}> 点</small></div>
            </div>
            <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>対象店舗数</div>
              <div style={{ fontSize: 36, fontWeight: 950, color: "#0ea5e9" }}>{loading ? "—" : storeList.length}<small style={{ fontSize: 16, fontWeight: 700 }}> 店舗</small></div>
            </div>
            <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>No.1 店舗</div>
              <div style={{ fontSize: 18, fontWeight: 950, display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                {loading ? "—" : storeList.length > 0 ? <><Trophy size={20} color="#f59e0b" /> {storeList[0].name}</> : "データなし"}
              </div>
            </div>
          </div>

          {/* ランキングテーブル */}
          <div style={{ background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 900 }}>ランキング順</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{selectedOption.label}</div>
            </div>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
              </div>
            ) : storeList.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 48, color: "#94a3b8" }}>
                <CheckCircle2 size={40} strokeWidth={1.5} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>このクォーターのデータがありません</span>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>{["RANK", "店舗名", "QSCスコア", "Q", "S", "C", "点検日", ""].map(h => (
                    <th key={h} style={{ padding: "14px 20px", fontSize: 11, fontWeight: 900, color: "#94a3b8" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {storeList.map((store, idx) => (
                    <tr key={store.storeId} className="aq-row"
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.15s", background: "#fff" }}
                      onClick={() => setSelectedStoreId(store.storeId)}>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontSize: 13, fontWeight: 950, background: idx === 0 ? "#fffbeb" : "#f1f5f9", color: idx === 0 ? "#d97706" : "#64748b" }}>{idx + 1}</span>
                      </td>
                      <td style={{ padding: "16px 20px", fontWeight: 800, fontSize: 14 }}>{store.name}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20, fontWeight: 950, color: getScoreColor(store.score) }}>{store.score}</span>
                          <div style={{ width: 72, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${store.score}%`, height: "100%", background: getScoreColor(store.score), borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      {[store.q, store.s, store.c].map((v, i) => (
                        <td key={i} style={{ padding: "16px 20px", fontWeight: 800, fontSize: 14, color: v !== null ? getScoreColor(v) : "#94a3b8" }}>{v ?? "—"}</td>
                      ))}
                      <td style={{ padding: "16px 20px", fontSize: 12, color: "#94a3b8" }}>{store.inspectionDate || "—"}</td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}><ChevronRight size={18} color="#cbd5e1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ========== 店舗別詳細画面 ========== */
  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", color: "#1e293b" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}><Home size={14} /> Dashboard</Link>
          <ChevronRight size={14} color="#cbd5e1" />
          <button onClick={() => setSelectedStoreId(null)} style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>クォーター分析</button>
          <ChevronRight size={14} color="#cbd5e1" />
          <span style={{ fontWeight: 900, color: "#1e293b" }}>{selectedStore?.name}</span>
        </nav>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start", animation: "fadeIn 0.3s ease" }}>

          {/* ===== 左サイドバー ===== */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button onClick={() => setSelectedStoreId(null)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#4f46e5", fontWeight: 800, cursor: "pointer", padding: 0, fontSize: 14 }}>
              <ArrowLeft size={18} /> ランキングに戻る
            </button>

            {/* スコアカード */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#4f46e5", letterSpacing: "0.1em", marginBottom: 6 }}>{selectedOption.label}</div>
              <h2 style={{ fontSize: 20, fontWeight: 950, margin: "0 0 20px", lineHeight: 1.3 }}>{selectedStore?.name}</h2>

              {/* 合計スコア + 前回比 */}
              <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", marginBottom: 16 }}>
                <div style={{ fontSize: 60, fontWeight: 950, color: getScoreColor(currentScore), lineHeight: 1 }}>{currentScore}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", marginTop: 4 }}>総合スコア（点）</div>
                {currentDetail?.summary?.inspectionDate && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>点検日: {currentDetail.summary.inspectionDate}</div>}
                {scoreDiff !== null && (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: scoreDiff >= 0 ? "#f0fdf4" : "#fef2f2", color: scoreDiff >= 0 ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 900 }}>
                    {scoreDiff >= 0 ? "▲" : "▼"} {Math.abs(scoreDiff)}点 前回比
                  </div>
                )}
              </div>

              {/* Q/S/C バー */}
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                {([
                  { label: "Q — Quality（品質）", v: selectedStore?.q, color: "#0ea5e9" },
                  { label: "S — Service（接客）", v: selectedStore?.s, color: "#10b981" },
                  { label: "C — Cleanliness（清潔）", v: selectedStore?.c, color: "#f59e0b" },
                ] as const).map(item => (
                  <div key={item.label} style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 800 }}>
                      <span style={{ color: "#475569" }}>{item.label}</span>
                      <span style={{ color: item.v !== null && item.v !== undefined ? item.color : "#94a3b8", fontWeight: 900 }}>
                        {item.v !== null && item.v !== undefined ? `${item.v}点` : "—"}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.v ?? 0}%`, background: item.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 項目サマリー */}
              {currentDetail?.summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                  <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #d1fae5" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#059669" }}>{currentDetail.summary.ok ?? 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#059669" }}>OK</div>
                  </div>
                  <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #fee2e2" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>{currentDetail.summary.ng ?? 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#dc2626" }}>NG</div>
                  </div>
                  <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #fef3c7" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#d97706" }}>{currentDetail.summary.hold ?? 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#d97706" }}>保留</div>
                  </div>
                </div>
              )}
            </div>

            {/* 前回との比較 */}
            {prevDetail && (
              <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={13} /> 前回との比較
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fee2e2" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                      <RefreshCw size={11} /> 常習NG（連続NG）
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#dc2626" }}>{chronicNgIds.size}件</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fee2e2" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e87500", display: "flex", alignItems: "center", gap: 5 }}>
                      <AlertTriangle size={11} /> 新規NG（初回）
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#e87500" }}>{newNgIds.size}件</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #d1fae5" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 5 }}>
                      <ThumbsUp size={11} /> 改善（前回NGが解消）
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#059669" }}>{improvedIds.size}件</span>
                  </div>
                </div>
              </div>
            )}

            {/* 点検履歴 */}
            {history.length > 0 && (
              <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <BarChart2 size={13} /> 点検履歴
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {history.slice(0, 5).map((h, i) => {
                    const score = h.summary?.point ?? 0;
                    return (
                      <div key={h.resultId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", width: 60, flexShrink: 0 }}>
                          {h.summary?.inspectionDate ?? h.submittedAt?.slice(0, 10) ?? "—"}
                        </div>
                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${score}%`, height: "100%", background: getScoreColor(score), borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: getScoreColor(score), width: 32, textAlign: "right" }}>{score}</div>
                        {i === 0 && <span style={{ fontSize: 9, fontWeight: 800, background: "#eef2ff", color: "#6366f1", padding: "1px 5px", borderRadius: 4 }}>最新</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* ===== 右：詳細タブ ===== */}
          <section>
            {/* タブ */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", padding: 6, borderRadius: 16, border: "1px solid #e2e8f0", width: "fit-content" }}>
              {([
                { key: "ng", label: `NG項目`, count: ngItems.length, color: "#dc2626", bg: "#fef2f2" },
                { key: "hold", label: `保留`, count: holdItems.length, color: "#d97706", bg: "#fffbeb" },
                { key: "ok", label: `OK項目`, count: okItems.length, color: "#059669", bg: "#f0fdf4" },
                { key: "analysis", label: `分析`, count: null, color: "#6366f1", bg: "#eef2ff" },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ padding: "9px 16px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", background: activeTab === tab.key ? tab.bg : "transparent", color: activeTab === tab.key ? tab.color : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  {tab.label}
                  {tab.count !== null && <span style={{ fontSize: 11, fontWeight: 900, padding: "1px 6px", borderRadius: 6, background: activeTab === tab.key ? tab.color : "#f1f5f9", color: activeTab === tab.key ? "#fff" : "#94a3b8" }}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {detailLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60, background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", padding: 24 }}>

                {/* NG タブ */}
                {activeTab === "ng" && (
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 950, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={18} color="#dc2626" /> 最新点検のNG項目
                      {ngItems.length > 0 && <span style={{ fontSize: 12, fontWeight: 900, padding: "2px 8px", borderRadius: 6, background: "#fee2e2", color: "#dc2626" }}>{ngItems.length}件</span>}
                    </h3>
                    {ngItems.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40, color: "#94a3b8" }}>
                        <CheckCircle2 size={40} color="#10b981" strokeWidth={1.5} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>NG項目はありません</span>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 12 }}>
                        {ngItems.map(item => {
                          const isChronic = chronicNgIds.has(item.id);
                          const isNew = newNgIds.has(item.id);
                          return (
                            <div key={item.id} style={{ padding: 18, borderRadius: 16, border: `1.5px solid ${isChronic ? "#fca5a5" : "#fee2e2"}`, background: isChronic ? "#fff7f7" : "#fff", display: "flex", gap: 14, alignItems: "flex-start" }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", flexShrink: 0 }}>
                                <Target size={16} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 11, fontWeight: 900, background: "#f1f5f9", padding: "2px 7px", borderRadius: 5, color: "#64748b" }}>{(item as any).sectionTitle}</span>
                                  {item.category && <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>{item.category}</span>}
                                  {isChronic && <span style={{ fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4, background: "#fee2e2", color: "#dc2626" }}>🔁 常習NG</span>}
                                  {isNew && prevDetail && <span style={{ fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4, background: "#fff7ed", color: "#e87500" }}>🆕 新規</span>}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", lineHeight: 1.4, marginBottom: item.note ? 8 : 0 }}>{item.label}</div>
                                {item.note && (
                                  <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, background: "#fee2e2", borderRadius: 8, padding: "5px 10px", marginBottom: item.photos?.length ? 8 : 0 }}>{item.note}</div>
                                )}
                                {/* 写真ボタン */}
                                {item.photos && item.photos.filter(p => p.url?.startsWith("http")).length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <button onClick={() => togglePhotos(item.id)}
                                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: expandedPhotos.has(item.id) ? "#f1f5f9" : "#fff", fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif" }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                      {expandedPhotos.has(item.id) ? "写真を閉じる" : `写真を表示（${item.photos.filter(p => p.url?.startsWith("http")).length}枚）`}
                                    </button>
                                    {expandedPhotos.has(item.id) && (
                                      <div style={{ marginTop: 10 }}>
                                        <PhotoCarousel photos={item.photos} onZoom={setZoomedImage} />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 保留タブ */}
                {activeTab === "hold" && (
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 950, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <PauseCircle size={18} color="#d97706" /> 保留項目
                      {holdItems.length > 0 && <span style={{ fontSize: 12, fontWeight: 900, padding: "2px 8px", borderRadius: 6, background: "#fef3c7", color: "#d97706" }}>{holdItems.length}件</span>}
                    </h3>
                    {holdItems.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40, color: "#94a3b8" }}>
                        <CheckCircle2 size={40} color="#10b981" strokeWidth={1.5} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>保留項目はありません</span>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {holdItems.map(item => (
                          <div key={item.id} style={{ padding: 16, borderRadius: 14, border: "1.5px solid #fef3c7", background: "#fffdf5", display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <PauseCircle size={15} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 900, background: "#f1f5f9", padding: "2px 7px", borderRadius: 5, color: "#64748b" }}>{(item as any).sectionTitle}</span>
                                {item.category && <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.category}</span>}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", lineHeight: 1.4, marginBottom: item.note ? 6 : 0 }}>{item.label}</div>
                              {item.note && <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600, background: "#fef3c7", borderRadius: 7, padding: "4px 9px" }}>{item.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* OK タブ */}
                {activeTab === "ok" && (
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 950, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={18} color="#059669" /> OK項目
                      {okItems.length > 0 && <span style={{ fontSize: 12, fontWeight: 900, padding: "2px 8px", borderRadius: 6, background: "#d1fae5", color: "#059669" }}>{okItems.length}件</span>}
                    </h3>
                    <div style={{ display: "grid", gap: 8 }}>
                      {okItems.map(item => {
                        const wasNg = prevNgIds.has(item.id);
                        return (
                          <div key={item.id} style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${wasNg ? "#86efac" : "#e2e8f0"}`, background: wasNg ? "#f0fdf4" : "#f8fafc", display: "flex", alignItems: "center", gap: 12 }}>
                            <CheckCircle2 size={16} color={wasNg ? "#059669" : "#94a3b8"} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 10, color: "#94a3b8" }}>{(item as any).sectionTitle}</span>
                                {wasNg && <span style={{ fontSize: 10, fontWeight: 900, padding: "1px 5px", borderRadius: 4, background: "#d1fae5", color: "#059669" }}>✨ 改善</span>}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.label}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 分析タブ */}
                {activeTab === "analysis" && (
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 950, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <BarChart2 size={18} color="#6366f1" /> この店舗の弱点分析
                    </h3>

                    {/* エリア別NG集計 */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", marginBottom: 12 }}>エリア別NG集計</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {(() => {
                          const areaMap = new Map<string, { ng: number; total: number }>();
                          currentDetail?.sections?.forEach(sec => {
                            const ng = sec.items.filter(i => i.state === "ng").length;
                            const total = sec.items.filter(i => i.state !== "na").length;
                            if (total > 0) areaMap.set(sec.title, { ng, total });
                          });
                          return Array.from(areaMap.entries())
                            .sort((a, b) => b[1].ng - a[1].ng)
                            .map(([area, { ng, total }]) => (
                              <div key={area} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: ng > 0 ? "#fff7f7" : "#f8fafc", border: `1px solid ${ng > 0 ? "#fee2e2" : "#e2e8f0"}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", width: 120, flexShrink: 0 }}>{area}</div>
                                <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ width: `${total > 0 ? (ng / total) * 100 : 0}%`, height: "100%", background: ng > 0 ? "#dc2626" : "#e2e8f0", borderRadius: 4 }} />
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: ng > 0 ? "#dc2626" : "#94a3b8", width: 60, textAlign: "right" }}>
                                  NG {ng}/{total}
                                </div>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>

                    {/* 常習NG一覧 */}
                    {chronicNgIds.size > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#dc2626", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <RefreshCw size={13} /> 連続NG（前回も今回もNG）— この店舗の弱点
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {ngItems.filter(i => chronicNgIds.has(i.id)).map(item => (
                            <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, border: "1.5px solid #fca5a5", background: "#fff7f7", display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 11, fontWeight: 900, background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>🔁</span>
                              <div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{(item as any).sectionTitle}</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{item.label}</div>
                                {item.note && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{item.note}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 改善できた項目 */}
                    {improvedIds.size > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#059669", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <ThumbsUp size={13} /> 前回から改善できた項目
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {okItems.filter(i => improvedIds.has(i.id)).map(item => (
                            <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #86efac", background: "#f0fdf4", display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 11, fontWeight: 900, background: "#d1fae5", color: "#059669", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>✨</span>
                              <div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{(item as any).sectionTitle}</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{item.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!prevDetail && (
                      <div style={{ padding: 24, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>
                        前回の点検データがないため比較分析できません
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      {/* Lightbox */}
      {zoomedImage && (
        <div onClick={() => setZoomedImage(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 40 }}>
          <button onClick={() => setZoomedImage(null)}
            style={{ position: "absolute", top: 24, right: 24, background: "#fff", border: "none", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={zoomedImage} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 16, objectFit: "contain", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()} alt="" />
        </div>
      )}
    </main>
  );
}
