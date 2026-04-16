"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CloudSun,
  Megaphone,
  Trophy,
  TrendingUp,
  Loader2,
  Medal,
} from "lucide-react";

import { useSession } from "@/app/(app)/lib/auth";
import styles from "./HomePage.module.css";

export const dynamic = "force-dynamic";

/* ========================= Types ========================= */
type NewsItem = {
  newsId: string;
  title: string;
  body?: string | null;
  updatedAt?: string;
  viewScope?: "all" | "direct" | "fc";
};

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

type RankType = "overall" | "q" | "s" | "c";

const RANK_TABS: { key: RankType; label: string; color: string }[] = [
  { key: "overall", label: "総合", color: "#6366f1" },
  { key: "q",       label: "Q",    color: "#0ea5e9" },
  { key: "s",       label: "S",    color: "#10b981" },
  { key: "c",       label: "C",    color: "#f59e0b" },
];

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1  4〜6月",
  2: "Q2  7〜9月",
  3: "Q3 10〜12月",
  4: "Q4  1〜3月",
};

/* ========================= Helpers ========================= */
function getCurrentQuarter(): { quarter: number; fiscalYear: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 4 && month <= 6)  return { quarter: 1, fiscalYear: year };
  if (month >= 7 && month <= 9)  return { quarter: 2, fiscalYear: year };
  if (month >= 10 && month <= 12) return { quarter: 3, fiscalYear: year };
  return { quarter: 4, fiscalYear: year - 1 };
}

function formatDateJp(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function scopeLabel(scope?: NewsItem["viewScope"]) {
  if (scope === "direct") return "直営";
  if (scope === "fc") return "FC";
  return "全体";
}

function dowJa(d: Date) {
  return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function weatherLabelFromCode(code?: number): { label: string; emoji: string } | null {
  if (code == null) return null;
  if (code === 0) return { label: "快晴", emoji: "☀️" };
  if ([1, 2].includes(code)) return { label: "晴れ", emoji: "🌤" };
  if (code === 3) return { label: "くもり", emoji: "☁️" };
  if ([61, 63, 65].includes(code)) return { label: "雨", emoji: "🌧" };
  return { label: "天気", emoji: "🌡" };
}

function medalColor(idx: number) {
  if (idx === 0) return "#f59e0b";
  if (idx === 1) return "#94a3b8";
  if (idx === 2) return "#b45309";
  return "#e2e8f0";
}

function scoreColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 70) return "#2563eb";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

/* ========================= HOME Widget ========================= */
function HomeWidget() {
  const [today] = useState(() => new Date());
  const [weatherInfo, setWeatherInfo] = useState<{ label: string; emoji: string } | null>(null);
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();
        setWeatherInfo(weatherLabelFromCode(data.current_weather.weathercode));
        setTemp(Math.round(data.current_weather.temperature));
      } catch { /* ignore */ }
    });
  }, []);

  return (
    <section style={{
      background: "linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e40af 100%)",
      borderRadius: 28, padding: "24px 20px 20px",
      color: "#fff", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", marginBottom: 4 }}>TODAY</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1 }}>
              {pad2(today.getMonth() + 1)}/{pad2(today.getDate())}
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{today.getFullYear()}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>（{dowJa(today)}）</span>
            </div>
          </div>
        </div>
        {weatherInfo && temp !== null ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 36 }}>{weatherInfo.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{temp}°</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{weatherInfo.label}</div>
          </div>
        ) : (
          <CloudSun size={32} style={{ opacity: 0.3 }} />
        )}
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "6px 12px",
        fontSize: 12, fontWeight: 800,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
        QSC Check
      </div>
    </section>
  );
}

/* ========================= Main Page ========================= */
export default function HomePage() {
  const { session, loading: sessionLoading } = useSession();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [rankings, setRankings] = useState<Record<RankType, RankRow[]>>({ overall: [], q: [], s: [], c: [] });
  const [myScore, setMyScore] = useState<RankRow | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState<RankType>("overall");

  const { quarter: initQ, fiscalYear: initFY } = getCurrentQuarter();
  const [selectedQuarter, setSelectedQuarter] = useState(initQ);
  const [selectedFiscalYear] = useState(initFY);

  useEffect(() => {
    if (sessionLoading) return;
    fetch("/api/news").then(r => r.ok ? r.json() : []).then(d => {
      setNews(Array.isArray(d) ? d.slice(0, 3) : []);
      setNewsLoading(false);
    }).catch(() => setNewsLoading(false));
  }, [sessionLoading]);

  useEffect(() => {
    if (sessionLoading) return;
    setRankLoading(true);
    fetch(`/api/ranking?quarter=${selectedQuarter}&fiscalYear=${selectedFiscalYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setRankings({ overall: data.rankings?.overall ?? [], q: data.rankings?.q ?? [], s: data.rankings?.s ?? [], c: data.rankings?.c ?? [] });
        // assignedStoreIds（配列）または assignedStoreId（単数）から自店舗を特定
        const ids: string[] = [];
        const multiIds = (session as any)?.assignedStoreIds;
        const singleId = (session as any)?.assignedStoreId;
        if (Array.isArray(multiIds) && multiIds.length > 0) {
          ids.push(...multiIds);
        } else if (singleId) {
          ids.push(singleId);
        }
        const allRows = (data.all as RankRow[]) ?? [];
        const found = ids.length > 0
          ? allRows.find(d => ids.includes(d.storeId))
          : null;
        setMyScore(found ?? null);
      })
      .catch(console.error)
      .finally(() => { setRankLoading(false); setDataLoading(false); });
  }, [session, sessionLoading, selectedQuarter, selectedFiscalYear]);

  if (sessionLoading) return null;

  const isStoreUser = (session?.role as string) === "manager" || (session?.role as string) === "store";
  const currentRows = rankings[activeRankTab] ?? [];
  const activeTab = RANK_TABS.find(t => t.key === activeRankTab)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .hp-card { animation: fadeUp 0.35s ease both; }
        .hp-card:nth-child(2) { animation-delay:0.06s; }
        .hp-card:nth-child(3) { animation-delay:0.12s; }
        .hp-news-row { transition: background 0.15s; }
        .hp-news-row:hover { background: #f8fafc !important; }
      `}</style>

      {/* ① HOMEウィジェット */}
      <div className="hp-card"><HomeWidget /></div>

      {/* ② お知らせ */}
      <div className="hp-card" style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fef3c7", display: "grid", placeItems: "center" }}>
              <Megaphone size={15} color="#d97706" />
            </div>
            お知らせ
          </div>
          <Link href="/news" style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800, color: "#94a3b8", textDecoration: "none" }}>
            すべて <ChevronRight size={14} />
          </Link>
        </div>
        <div style={{ marginTop: 12 }}>
          {newsLoading ? (
            <div style={{ padding: "12px 20px 16px", color: "#94a3b8", fontSize: 13 }}>読み込み中…</div>
          ) : news.length === 0 ? (
            <div style={{ padding: "12px 20px 16px", color: "#94a3b8", fontSize: 13 }}>お知らせはありません</div>
          ) : news.map((n, idx) => (
            <Link key={n.newsId} href={`/news/${n.newsId}`} className="hp-news-row" style={{
              display: "block", padding: "12px 20px", textDecoration: "none",
              borderTop: idx === 0 ? "1px solid #f1f5f9" : "1px solid #f1f5f9",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{formatDateJp(n.updatedAt)}</span>
                <span style={{ fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 5, background: "#f1f5f9", color: "#64748b" }}>
                  {scopeLabel(n.viewScope)}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.45 }}>{n.title}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ③ スコア / ランキング */}
      {isStoreUser ? (
        <div className="hp-card" style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px 16px", fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#ede9fe", display: "grid", placeItems: "center" }}>
              <TrendingUp size={15} color="#7c3aed" />
            </div>
            自店舗スコア
          </div>

          {dataLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
            </div>
          ) : myScore ? (
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 12 }}>
                {myScore.storeName} · {myScore.inspectionDate}
              </div>
              <div style={{
                background: "linear-gradient(135deg, #1e293b, #334155)",
                borderRadius: 20, padding: "20px 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>TOTAL SCORE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 52, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>{myScore.totalScore}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>点</span>
                  </div>
                </div>
                <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#6366f1" strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - myScore.totalScore / 100)}`}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {([
                  { k: "Q", v: myScore.q_score, color: "#0ea5e9", bg: "#f0f9ff" },
                  { k: "S", v: myScore.s_score, color: "#10b981", bg: "#f0fdf4" },
                  { k: "C", v: myScore.c_score, color: "#f59e0b", bg: "#fffbeb" },
                ] as const).map(item => (
                  <div key={item.k} style={{ background: item.bg, borderRadius: 16, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: item.color, marginBottom: 2 }}>{item.k}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#1e293b" }}>
                      {item.v !== null && item.v !== undefined ? item.v : "—"}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>点</div>
                  </div>
                ))}
              </div>
              <Link href="/results" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 10, padding: "12px", borderRadius: 14,
                background: "#f8fafc", border: "1px solid #e2e8f0",
                fontSize: 13, fontWeight: 800, color: "#1e293b", textDecoration: "none",
              }}>
                詳細分析を見る <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>スコアデータがありません</div>
          )}
        </div>
      ) : (
        <div className="hp-card" style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {/* ヘッダー */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px 12px", fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fef9c3", display: "grid", placeItems: "center" }}>
              <Trophy size={15} color="#ca8a04" />
            </div>
            ランキング
          </div>

          {/* クォーター選択（横スクロール） */}
          <div style={{ display: "flex", gap: 6, padding: "0 20px 12px", overflowX: "auto", scrollbarWidth: "none" }}>
            {([1, 2, 3, 4] as const).map(q => (
              <button key={q} onClick={() => setSelectedQuarter(q)} style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: 10,
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                border: "1.5px solid",
                borderColor: selectedQuarter === q ? "#1e293b" : "#e2e8f0",
                background: selectedQuarter === q ? "#1e293b" : "#fff",
                color: selectedQuarter === q ? "#fff" : "#64748b",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
                {QUARTER_LABELS[q]}
              </button>
            ))}
          </div>

          {/* カテゴリタブ */}
          <div style={{ display: "flex", gap: 6, padding: "0 20px 16px" }}>
            {RANK_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveRankTab(tab.key)} style={{
                flex: 1, padding: "9px 4px", borderRadius: 12, border: "none",
                fontSize: 13, fontWeight: 900, cursor: "pointer",
                background: activeRankTab === tab.key ? tab.color : "#f1f5f9",
                color: activeRankTab === tab.key ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* リスト */}
          {rankLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
            </div>
          ) : currentRows.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 700, paddingBottom: 24 }}>
              このクォーターのデータがありません
            </div>
          ) : (
            <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {currentRows.map((r, idx) => {
                const score = activeRankTab === "q" ? r.q_score : activeRankTab === "s" ? r.s_score : activeRankTab === "c" ? r.c_score : r.totalScore;
                const sc = Number(score ?? 0);
                return (
                  <div key={`${r.storeId}-${idx}`} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16,
                    background: idx === 0 ? "linear-gradient(135deg, #fef3c7, #fef9c3)" : idx === 1 ? "#fafafa" : "#f8fafc",
                    border: idx === 0 ? "1px solid #fcd34d" : "1px solid transparent",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: idx < 3 ? medalColor(idx) : "#e2e8f0",
                      display: "grid", placeItems: "center",
                    }}>
                      {idx < 3 ? (
                        <Medal size={14} color="#fff" />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>{idx + 1}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.storeName}
                      </div>
                      {r.inspectionDate && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{r.inspectionDate}</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor(sc) }}>{sc}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>点</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
