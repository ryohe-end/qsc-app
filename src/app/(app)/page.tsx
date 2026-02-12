// src/app/(app)/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Home as HomeIcon,
  Sparkles,
  CloudSun,
  Thermometer,
  MapPin,
  Megaphone,
  Trophy,
  TrendingUp,
} from "lucide-react";

// ✅ 認証フックをインポート
import { useSession } from "@/app/(app)/lib/auth";
import styles from "./HomePage.module.css";

export const dynamic = "force-dynamic";

/* =========================
   Types
   ========================= */
type NewsItem = {
  newsId: string;
  title: string;
  body?: string | null;
  updatedAt?: string;
  startDate?: string;
  endDate?: string;
  viewScope?: "all" | "direct" | "fc";
};

type RankRow = {
  storeId: string;
  storeName: string;
  score: number;
};

type RankType = "overall" | "q" | "s" | "c";

const RANK_TABS: { key: RankType; label: string }[] = [
  { key: "overall", label: "総合" },
  { key: "q", label: "Q" },
  { key: "s", label: "S" },
  { key: "c", label: "C" },
];

/* =========================
   Helpers
   ========================= */
function formatDateJp(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function scopeLabel(scope?: NewsItem["viewScope"]) {
  if (scope === "direct") return "直営";
  if (scope === "fc") return "FC";
  return "全体";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dowJa(d: Date) {
  return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
}
function clampText(s: string, max = 56) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function weatherLabelFromCode(code?: number) {
  if (code == null) return "—";
  if (code === 0) return "快晴";
  if (code === 1 || code === 2) return "晴れ";
  if (code === 3) return "くもり";
  if (code === 45 || code === 48) return "霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
  if ([61, 63, 65, 66, 67].includes(code)) return "雨";
  if ([71, 73, 75, 77].includes(code)) return "雪";
  if ([80, 81, 82].includes(code)) return "にわか雨";
  if ([85, 86].includes(code)) return "にわか雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天気";
}

function Badge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="qsc-pill">
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* =========================
   HOME Widget (Module化)
   ========================= */
function HomeWidget() {
  const [today] = useState(() => new Date());
  const [dayTopic, setDayTopic] = useState<string>("読み込み中…");
  const [wxStatus, setWxStatus] = useState<"idle" | "loading" | "ok" | "blocked" | "error">("idle");
  const [weather, setWeather] = useState<string>("—");
  const [temp, setTemp] = useState<string>("—");
  const [place, setPlace] = useState<string>("");

  const mmdd = `${pad2(today.getMonth() + 1)}/${pad2(today.getDate())}`;
  const yyyy = today.getFullYear();
  const dow = dowJa(today);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resH = await fetch("https://holidays-jp.github.io/api/v1/date.json", { cache: "no-store" });
        const holidays = (await resH.json()) as Record<string, string>;
        const h = holidays?.[ymd(today)];
        if (alive && h) {
          setDayTopic(`祝日：${h}`);
          return;
        }
        const m = pad2(today.getMonth() + 1);
        const d = pad2(today.getDate());
        const url = `https://api.wikimedia.org/feed/v1/wikipedia/ja/onthisday/events/${m}/${d}`;
        const resW = await fetch(url, { cache: "no-store" });
        const data = (await resW.json()) as any;
        const events: any[] = Array.isArray(data?.events) ? data.events : [];
        if (!events.length) {
          if (alive) setDayTopic("—");
          return;
        }
        const pick = events[0];
        const year = typeof pick?.year === "number" ? String(pick.year) : "";
        const text = typeof pick?.text === "string" ? pick.text : "";
        const label = year ? `${year}年：${clampText(text, 64)}` : clampText(text, 64);
        if (alive) setDayTopic(label || "—");
      } catch {
        if (alive) setDayTopic("—");
      }
    })();
    return () => { alive = false; };
  }, [today]);

  useEffect(() => {
    let alive = true;
    const run = async (lat: number, lon: number) => {
      try {
        setWxStatus("loading");
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&timezone=Asia%2FTokyo`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("weather fetch failed");
        const data = (await res.json()) as any;
        const cw = data?.current_weather;
        const t = typeof cw?.temperature === "number" ? (cw.temperature as number) : null;
        const code = typeof cw?.weathercode === "number" ? (cw.weathercode as number) : null;
        if (!alive) return;
        setWeather(weatherLabelFromCode(code ?? undefined));
        setTemp(t == null ? "—" : `${t.toFixed(1)}℃`);
        setWxStatus("ok");
      } catch {
        if (!alive) return;
        setWxStatus("error");
      }
    };

    if (!navigator?.geolocation) {
      setWxStatus("blocked");
      return;
    }
    setWxStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive) return;
        setPlace("現在地");
        run(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        if (!alive) return;
        setWxStatus("blocked");
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 10 * 60 * 1000 }
    );
    return () => { alive = false; };
  }, []);

  return (
    <section className={styles.homeWidget} aria-label="HOMEウィジェット">
      <div className={styles.top}>
        <Badge icon={<HomeIcon size={14} />} label="HOME" />
        <div className={styles.dateWrap}>
          <div className={styles.dateBig} aria-label="日付">
            <span className={styles.mmdd}>{mmdd}</span>
            <span className={styles.yearWrap}>
              <span className={styles.year}>{yyyy}</span>
              <span className={styles.dow}>（{dow}）</span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.tile} ${styles.tileWide}`}>
          <div className={styles.key}>
            <Sparkles size={16} />
            <span>なんの日</span>
          </div>
          <div className={styles.val}>{dayTopic}</div>
        </div>

        <div className={styles.tile}>
          <div className={styles.key}>
            <CloudSun size={16} />
            <span>天気</span>
          </div>
          <div className={styles.val}>
            {wxStatus === "loading" ? "取得中…" : wxStatus === "blocked" ? "位置情報を許可" : wxStatus === "error" ? "取得失敗" : weather}
            {place ? <span className={styles.valMini}><MapPin size={12} style={{ verticalAlign: "-2px" }} /> {place}</span> : null}
          </div>
        </div>

        <div className={styles.tile}>
          <div className={styles.key}>
            <Thermometer size={16} />
            <span>気温</span>
          </div>
          <div className={styles.val}>
            {wxStatus === "loading" ? "取得中…" : wxStatus === "ok" ? temp : "—"}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   Page
   ========================= */
export default function HomePage() {
  const { session, loading } = useSession(); // ✅ セッション情報取得
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setNewsLoading(true);
        const res = await fetch("/api/news", { cache: "no-store" });
        if (!res.ok) throw new Error(`news fetch failed: ${res.status}`);
        const data = (await res.json()) as any;
        const items: NewsItem[] = Array.isArray(data) ? data : data?.items ?? [];
        const sorted = [...items].sort((a, b) => {
          const ta = new Date(a.updatedAt || a.startDate || 0).getTime();
          const tb = new Date(b.updatedAt || b.startDate || 0).getTime();
          return tb - ta;
        });
        if (alive) setNews(sorted.slice(0, 3));
      } catch {
        if (alive) setNews([]);
      } finally {
        if (alive) setNewsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const mock = useMemo(() => {
    const base: RankRow[] = [
      { storeId: "S001", storeName: "札幌大通", score: 96.2 },
      { storeId: "S002", storeName: "仙台駅前", score: 95.1 },
      { storeId: "S003", storeName: "新宿西口", score: 94.9 },
      { storeId: "S004", storeName: "名古屋栄", score: 94.2 },
      { storeId: "S005", storeName: "梅田", score: 93.8 },
      { storeId: "S006", storeName: "広島紙屋町", score: 92.9 },
      { storeId: "S007", storeName: "福岡天神", score: 92.4 },
    ];
    const jitter = (n: number, seed: number) => Math.max(0, Math.min(100, Math.round((n + (seed % 7) * 0.35) * 10) / 10));
    const byType: Record<RankType, RankRow[]> = {
      overall: base.map((r, i) => ({ ...r, score: jitter(r.score, i + 1) })),
      q: base.map((r, i) => ({ ...r, score: jitter(r.score - 1.2, i + 2) })),
      s: base.map((r, i) => ({ ...r, score: jitter(r.score - 0.4, i + 3) })),
      c: base.map((r, i) => ({ ...r, score: jitter(r.score - 2.0, i + 4) })),
    };
    for (const k of Object.keys(byType) as RankType[]) {
      byType[k] = [...byType[k]].sort((a, b) => b.score - a.score);
    }
    return byType;
  }, []);

  if (loading) return null; // 初期ロード中のちらつき防止

  // ✅ ロール判定
  const isStoreUser = session?.role === "manager";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <HomeWidget />

      {/* お知らせ（共通） */}
      <section className="qsc-panel" aria-label="お知らせ">
        <div className="qsc-panel-head">
          <Badge icon={<Megaphone size={14} />} label="お知らせ" />
          <Link className="qsc-panel-link" href="/news">
            すべて <ChevronRight size={16} style={{ verticalAlign: "-3px" }} />
          </Link>
        </div>
        {newsLoading ? (
          <div className="qsc-news" aria-busy="true">
            <div className="qsc-news-title">読み込み中…</div>
            <div className="qsc-news-body">お知らせを取得しています。</div>
          </div>
        ) : news.length === 0 ? (
          <div className="qsc-news">
            <div className="qsc-news-title">お知らせはありません</div>
            <div className="qsc-news-body">配信があるとここに最大3件表示されます。</div>
          </div>
        ) : (
          <div className="qsc-news-list">
            {news.map((n) => {
              const date = formatDateJp(n.updatedAt || n.startDate);
              return (
                <Link
                  key={n.newsId}
                  href={`/news/${encodeURIComponent(n.newsId)}`}
                  className="qsc-news"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div className="qsc-news-meta">
                    <div className="qsc-news-date">{date || "—"}</div>
                    <div className="qsc-news-tag">{scopeLabel(n.viewScope)}</div>
                  </div>
                  <div className="qsc-news-title">{n.title}</div>
                  {n.body ? (
                    <div className="qsc-news-body">{n.body.length > 80 ? n.body.slice(0, 80) + "…" : n.body}</div>
                  ) : (
                    <div className="qsc-news-body">詳細を開く</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ✅ ロールごとの出し分け */}
      {isStoreUser ? (
        // --- 店舗ユーザー: 自店舗スコア ---
        <section className="qsc-panel" aria-label="自店舗の状況">
          <div className="qsc-panel-head">
             <Badge icon={<TrendingUp size={14} />} label="自店舗スコア" />
          </div>
          <div style={{ padding: "10px 0", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>2026 Q1</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#2f8ce6", lineHeight: 1.2 }}>94<span style={{fontSize:18}}>点</span></div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>ランク: <span style={{fontWeight:900, color:"#111"}}>A</span> (上位 5%)</div>
            
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
               <div style={{ background: "#f6f8fb", padding: 8, borderRadius: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>Q</div>
                 <div style={{ fontSize: 16, fontWeight: 900 }}>98</div>
               </div>
               <div style={{ background: "#f6f8fb", padding: 8, borderRadius: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>S</div>
                 <div style={{ fontSize: 16, fontWeight: 900 }}>92</div>
               </div>
               <div style={{ background: "#f6f8fb", padding: 8, borderRadius: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>C</div>
                 <div style={{ fontSize: 16, fontWeight: 900 }}>92</div>
               </div>
            </div>
            
            <Link href="/results" style={{ display: "block", marginTop: 16, fontSize: 13, fontWeight: 900, color: "#2f8ce6", textDecoration: "none" }}>
              詳細分析を見る &rarr;
            </Link>
          </div>
        </section>
      ) : (
        // --- 管理者/チェック者: ランキング ---
        <section className="qsc-panel" aria-label="ランキング">
          <div className="qsc-panel-head">
            <Badge icon={<Trophy size={14} />} label="ランキング" />
            <span className="qsc-swipehint">横にスワイプ</span>
          </div>
          <div className="qsc-rank-carousel" aria-label="ランキング切替">
            <div className="qsc-rank-carousel-inner" role="list">
              {RANK_TABS.map((t) => {
                const rows = mock[t.key].slice(0, 5);
                return (
                  <div key={t.key} className="qsc-rank-card" role="listitem">
                    <div className="qsc-rank-head">
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <div className="qsc-rank-title">{t.label}ランキング</div>
                        <div className="qsc-rank-sub">TOP5</div>
                      </div>
                      <Link className="qsc-rank-more" href={`/ranking?type=${t.key}`} aria-label={`${t.label}ランキングをもっと見る`}>
                        もっと <ChevronRight size={16} style={{ verticalAlign: "-3px" }} />
                      </Link>
                    </div>
                    <ol className="qsc-rank-list" aria-label={`${t.label}上位5店舗`}>
                      {rows.map((r, idx) => (
                        <li key={r.storeId} className="qsc-rank-row">
                          <div className="qsc-rank-left">
                            <div className="qsc-rank-no">{idx + 1}</div>
                            <div className="qsc-rank-store">{r.storeName}</div>
                          </div>
                          <div className="qsc-rank-score">{r.score.toFixed(1)}</div>
                        </li>
                      ))}
                    </ol>
                    <div className="qsc-rank-foot">
                      <div className="qsc-rank-footnote">※以降は「もっと」から確認</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div style={{ height: 8 }} aria-hidden="true" />
    </div>
  );
}