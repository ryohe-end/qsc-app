"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  BarChart3, Search, Loader2, CheckCircle2, XCircle,
  PauseCircle, MinusCircle, Calendar, UserCheck,
} from "lucide-react";
import { useSession } from "@/app/(app)/lib/auth";

/* ========================= Types ========================= */
type HistoryItem = {
  resultId: string;
  storeId: string;
  storeName: string;
  submittedAt: string;
  userName?: string;
  summary?: {
    point?: number;
    ok?: number;
    ng?: number;
    hold?: number;
    inspectionDate?: string;
    categoryScores?: Record<string, { ok: number; maxScore: number; point: number }>;
  };
};

type DetailItem = {
  id: string;
  label: string;
  state: "ok" | "ng" | "hold" | "na";
  note?: string;
  category?: string;
};

type DetailSection = {
  title: string;
  items: DetailItem[];
};

type DetailResult = {
  sections: DetailSection[];
  summary?: {
    point?: number;
    categoryScores?: Record<string, { ok: number; maxScore: number; point: number }>;
  };
  storeName?: string;
  userName?: string;
  submittedAt?: string;
};

/* ========================= Helpers ========================= */
function scoreColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 70) return "#2563eb";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeCategory(v?: string) {
  if (!v) return "";
  return v.normalize("NFKC").trim().toUpperCase();
}

// 4月始まりの年度・クォーターを計算
function getFiscalInfo(date: Date) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const fiscalYear = month >= 4 ? year : year - 1;
  let quarter: number;
  if (month >= 4 && month <= 6) quarter = 1;
  else if (month >= 7 && month <= 9) quarter = 2;
  else if (month >= 10 && month <= 12) quarter = 3;
  else quarter = 4;
  return { fiscalYear, quarter };
}

function getFiscalQuarterRange(fiscalYear: number, quarter: number): { start: Date; end: Date } {
  const quarterMonths = [
    { start: 4, end: 6 },
    { start: 7, end: 9 },
    { start: 10, end: 12 },
    { start: 1, end: 3 },
  ];
  const q = quarterMonths[quarter - 1];
  const startYear = quarter === 4 ? fiscalYear + 1 : fiscalYear;
  const endYear = quarter === 4 ? fiscalYear + 1 : fiscalYear;
  const start = new Date(startYear, q.start - 1, 1);
  const end = new Date(endYear, q.end, 0, 23, 59, 59);
  return { start, end };
}

function getFiscalYearRange(fiscalYear: number): { start: Date; end: Date } {
  return {
    start: new Date(fiscalYear, 3, 1), // 4/1
    end: new Date(fiscalYear + 1, 2, 31, 23, 59, 59), // 3/31
  };
}

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ok:   { label: "OK",   color: "#059669", bg: "#f0fdf4", icon: <CheckCircle2 size={14} color="#059669" /> },
  ng:   { label: "NG",   color: "#dc2626", bg: "#fef2f2", icon: <XCircle size={14} color="#dc2626" /> },
  hold: { label: "保留", color: "#d97706", bg: "#fffbeb", icon: <PauseCircle size={14} color="#d97706" /> },
  na:   { label: "N/A",  color: "#94a3b8", bg: "#f8fafc", icon: <MinusCircle size={14} color="#94a3b8" /> },
};

const CAT_TABS = [
  { key: "Q" as const, label: "Quality（品質）",     color: "#0ea5e9", bg: "#f0f9ff" },
  { key: "S" as const, label: "Service（接客）",     color: "#10b981", bg: "#f0fdf4" },
  { key: "C" as const, label: "Cleanliness（清潔）", color: "#f59e0b", bg: "#fffbeb" },
];

/* ========================= ScoreRing ========================= */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={size*0.09}
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

/* ========================= DetailPage ========================= */
function DetailPage({ storeId, resultId, storeName, onBack }: {
  storeId: string; resultId: string; storeName: string; onBack: () => void;
}) {
  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"Q" | "S" | "C">("Q");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/check/results/detail?storeId=${encodeURIComponent(storeId)}&resultId=${encodeURIComponent(resultId)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setDetail(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, resultId]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const categorizedSections = useMemo(() => {
    if (!detail?.sections) return { Q: [], S: [], C: [] } as Record<string, DetailSection[]>;
    const result: Record<string, DetailSection[]> = { Q: [], S: [], C: [] };
    for (const sec of detail.sections) {
      const cats = new Set(sec.items.map(i => normalizeCategory(i.category)).filter(Boolean));
      if (cats.has("S")) result["S"].push(sec);
      else if (cats.has("C")) result["C"].push(sec);
      else result["Q"].push(sec);
    }
    return result;
  }, [detail]);

  const catScores = detail?.summary?.categoryScores ?? {};
  const totalScore = detail?.summary?.point ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .dt-sec:hover{background:#fafafa;}
      `}</style>

      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <ChevronLeft size={18} /> 一覧に戻る
      </button>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
        </div>
      ) : !detail ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>データが見つかりません</div>
      ) : <>
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e40af 100%)", borderRadius: 24, padding: 20, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{storeName}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
            {formatDate(detail.submittedAt)}{detail.userName ? ` · ${detail.userName}` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>TOTAL SCORE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1 }}>{totalScore}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>点</span>
              </div>
            </div>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <ScoreRing score={totalScore} size={72} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>{totalScore}%</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            {CAT_TABS.map(cat => {
              const sc = catScores[cat.key];
              return (
                <div key={cat.key} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: cat.color, marginBottom: 2 }}>{cat.key}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{sc?.point ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>点</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {CAT_TABS.map(cat => {
            const pt = catScores[cat.key]?.point;
            const isActive = activeCategory === cat.key;
            return (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 14, border: "1.5px solid",
                borderColor: isActive ? cat.color : "#e2e8f0",
                background: isActive ? cat.bg : "#fff",
                color: isActive ? cat.color : "#94a3b8",
                fontSize: 12, fontWeight: 900, cursor: "pointer", transition: "all 0.15s",
              }}>
                {cat.key}
                {pt !== undefined && (
                  <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{pt}<span style={{ fontSize: 10, fontWeight: 700 }}>点</span></div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(categorizedSections[activeCategory] ?? []).length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13, fontWeight: 700, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
              このカテゴリのデータがありません
            </div>
          ) : (categorizedSections[activeCategory] ?? []).map(sec => {
            const isExpanded = expandedSections.has(sec.title);
            const ngCount = sec.items.filter(i => i.state === "ng").length;
            const okCount = sec.items.filter(i => i.state === "ok").length;
            const validCount = sec.items.filter(i => i.state !== "na").length;

            return (
              <div key={sec.title} style={{ borderRadius: 18, border: `1.5px solid ${ngCount > 0 ? "#fee2e2" : "#e2e8f0"}`, background: "#fff", overflow: "hidden" }}>
                <button onClick={() => toggleSection(sec.title)} className="dt-sec"
                  style={{ width: "100%", textAlign: "left", padding: "14px 16px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{sec.title}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#059669" }}>OK {okCount}</span>
                      {ngCount > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "#dc2626" }}>NG {ngCount}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>全{validCount}問</span>
                    </div>
                  </div>
                  {ngCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 8, background: "#fee2e2", color: "#dc2626" }}>NG {ngCount}</span>
                  )}
                  {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                </button>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f1f5f9" }}>
                    {sec.items.map((item, idx) => {
                      const cfg = STATE_CONFIG[item.state] ?? STATE_CONFIG.na;
                      return (
                        <div key={item.id} style={{
                          padding: "12px 16px",
                          borderBottom: idx < sec.items.length - 1 ? "1px solid #f8fafc" : "none",
                          background: item.state === "ng" ? "#fff7f7" : "#fff",
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ marginTop: 1, flexShrink: 0 }}>{cfg.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.4 }}>{item.label}</div>
                              {item.note && item.state === "ng" && (
                                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fee2e2", borderRadius: 8, padding: "5px 10px" }}>
                                  {item.note}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 8, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

/* ========================= ResultList ========================= */
function ResultList({ items, onSelect, title, loading }: {
  items: HistoryItem[]; onSelect: (item: HistoryItem) => void; title: string; loading: boolean;
}) {
  const [q, setQ] = useState("");

  // 年度・クォーターフィルター
  const today = new Date();
  const { fiscalYear: currentFY, quarter: currentQ } = getFiscalInfo(today);
  const [selectedFY, setSelectedFY] = useState<number>(currentFY);
  const [selectedQ, setSelectedQ] = useState<number>(0); // 0=全クォーター

  // 利用可能な年度を生成（現在年度から3年前まで）
  const fiscalYears = useMemo(() => {
    const years = [];
    for (let y = currentFY; y >= currentFY - 2; y--) years.push(y);
    return years;
  }, [currentFY]);

  const filtered = useMemo(() => {
    let result = items;

    // 年度フィルター
    const { start: fyStart, end: fyEnd } = getFiscalYearRange(selectedFY);
    result = result.filter(i => {
      const d = new Date(i.submittedAt);
      return d >= fyStart && d <= fyEnd;
    });

    // クォーターフィルター
    if (selectedQ > 0) {
      const { start: qStart, end: qEnd } = getFiscalQuarterRange(selectedFY, selectedQ);
      result = result.filter(i => {
        const d = new Date(i.submittedAt);
        return d >= qStart && d <= qEnd;
      });
    }

    // テキスト検索
    if (q) {
      result = result.filter(i =>
        i.storeName?.includes(q) || i.userName?.includes(q) || formatDate(i.submittedAt).includes(q)
      );
    }

    return result;
  }, [items, selectedFY, selectedQ, q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .rl-row:hover{background:#f8fafc !important;}
      `}</style>

      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", textDecoration: "none" }}>
        <ChevronLeft size={18} /> ホームへ
      </Link>

      <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 24, padding: 20, color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>RESULTS</div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{filtered.length}件の点検結果</div>
      </div>

      {/* 年度・クォーターフィルター */}
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={selectedFY}
          onChange={e => { setSelectedFY(Number(e.target.value)); setSelectedQ(0); }}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", padding: "0 12px", fontSize: 14, fontWeight: 700, outline: "none" }}
        >
          {fiscalYears.map(y => (
            <option key={y} value={y}>{y}年度</option>
          ))}
        </select>
        <select
          value={selectedQ}
          onChange={e => setSelectedQ(Number(e.target.value))}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", padding: "0 12px", fontSize: 14, fontWeight: 700, outline: "none" }}
        >
          <option value={0}>全クォーター</option>
          <option value={1}>Q1（4〜6月）</option>
          <option value={2}>Q2（7〜9月）</option>
          <option value={3}>Q3（10〜12月）</option>
          <option value={4}>Q4（1〜3月）</option>
        </select>
      </div>

      {/* テキスト検索 */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input placeholder="店舗名・検査員名で検索…" value={q} onChange={e => setQ(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", height: 46, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, paddingLeft: 40, fontSize: 14, fontWeight: 700, outline: "none" }} />
      </div>

      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>点検結果がありません</div>
        ) : filtered.map((item, idx) => {
          const pt = item.summary?.point;
          const ng = item.summary?.ng ?? 0;
          const inspDate = item.summary?.inspectionDate || formatDate(item.submittedAt);
          return (
            <button key={item.resultId} className="rl-row" onClick={() => onSelect(item)}
              style={{ width: "100%", textAlign: "left", padding: "14px 18px", border: "none", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "background 0.15s" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: pt !== undefined ? `${scoreColor(pt)}18` : "#f1f5f9", display: "grid", placeItems: "center", flexShrink: 0 }}>
                {pt !== undefined ? <span style={{ fontSize: 16, fontWeight: 900, color: scoreColor(pt) }}>{pt}</span> : <BarChart3 size={18} color="#94a3b8" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.storeName}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><Calendar size={11} /> {inspDate}</span>
                  {item.userName && <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><UserCheck size={11} /> {item.userName}</span>}
                  {ng > 0 && <span style={{ fontSize: 11, fontWeight: 900, padding: "1px 6px", borderRadius: 6, background: "#fef2f2", color: "#dc2626" }}>NG {ng}</span>}
                </div>
              </div>
              <ChevronRight size={16} color="#cbd5e1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========================= Main ========================= */
export default function ResultsPage() {
  const { session, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const role = (session?.role as string) ?? "";
  const isStore = role === "store" || role === "manager";
  const isInspector = role === "inspector";

  useEffect(() => {
    if (sessionLoading) return;
    const fetch_ = async () => {
      setLoadingItems(true);
      try {
        if (isStore) {
          const assignedStoreIds = (session as Record<string, unknown>)?.assignedStoreIds as string[] | undefined;
          const storeIds = Array.isArray(assignedStoreIds) && assignedStoreIds.length > 0 ? assignedStoreIds : [];
          if (storeIds.length === 0) return;
          const allItems: HistoryItem[] = [];
          await Promise.allSettled(storeIds.map(async storeId => {
            const res = await fetch(`/api/check/results/history?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            for (const item of (data.items ?? [])) {
              allItems.push({ ...item, storeId, storeName: item.storeName || "自店舗" });
            }
          }));
          allItems.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
          setItems(allItems);
        } else {
          const myName = isInspector ? (session?.name ?? "") : "";
          const url = myName
            ? `/api/check/results/all-history?userName=${encodeURIComponent(myName)}`
            : `/api/check/results/all-history`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingItems(false);
      }
    };
    fetch_();
  }, [sessionLoading, session, isStore, isInspector]);

  if (sessionLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  const listTitle = isStore ? "自店舗の点検結果" : isInspector ? "自分の点検結果" : "全店舗の点検結果";

  if (selected) {
    return (
      <DetailPage
        storeId={selected.storeId}
        resultId={selected.resultId}
        storeName={selected.storeName}
        onBack={() => setSelected(null)}
      />
    );
  }

  return <ResultList items={items} onSelect={setSelected} title={listTitle} loading={loadingItems} />;
}
