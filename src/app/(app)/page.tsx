"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Loader2,
} from "lucide-react";

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
  viewScope?: "all" | "direct" | "fc";
};

type RankRow = {
  storeId: string;
  storeName: string;
  totalScore: number;
  q_score?: number;
  s_score?: number;
  c_score?: number;
  email?: string;
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function weatherLabelFromCode(code?: number) {
  if (code == null) return "—";
  if (code === 0) return "快晴";
  if ([1, 2].includes(code)) return "晴れ";
  if (code === 3) return "くもり";
  if ([61, 63, 65].includes(code)) return "雨";
  return "天気";
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="qsc-pill">
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* =========================
   HOME Widget
   ========================= */
function HomeWidget() {
  const [today] = useState(() => new Date());
  const [dayTopic, setDayTopic] = useState<string>("取得中…");
  const [weather, setWeather] = useState<string>("—");
  const [temp, setTemp] = useState<string>("—");
  const [place, setPlace] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const m = pad2(today.getMonth() + 1);
        const d = pad2(today.getDate());
        const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/ja/onthisday/events/${m}/${d}`);
        const data = await res.json();
        setDayTopic(data.events?.[0]?.text || "今日は何の日？");
      } catch { setDayTopic("—"); }
    })();
  }, [today]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        setWeather(weatherLabelFromCode(data.current_weather.weathercode));
        setTemp(`${Math.round(data.current_weather.temperature)}℃`);
        setPlace("現在地");
      } catch { /* ignore */ }
    });
  }, []);

  return (
    <section className={styles.homeWidget} aria-label="HOMEウィジェット">
      <div className={styles.top}>
        <Badge icon={<HomeIcon size={14} />} label="HOME" />
        <div className={styles.dateWrap}>
          <div className={styles.dateBig}>
            <span className={styles.mmdd}>{pad2(today.getMonth() + 1)}/{pad2(today.getDate())}</span>
            <span className={styles.yearWrap}>
              <span className={styles.year}>{today.getFullYear()}</span>
              <span className={styles.dow}>（{dowJa(today)}）</span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.tile} ${styles.tileWide}`}>
          <div className={styles.key}><Sparkles size={16} /><span>なんの日</span></div>
          <div className={styles.val}>{dayTopic}</div>
        </div>

        <div className={styles.tile}>
          <div className={styles.key}><CloudSun size={16} /><span>天気</span></div>
          <div className={styles.val}>
            {weather}
            {place && <span className={styles.valMini}><MapPin size={10} /> {place}</span>}
          </div>
        </div>

        <div className={styles.tile}>
          <div className={styles.key}><Thermometer size={16} /><span>気温</span></div>
          <div className={styles.val}>{temp}</div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   Main Page
   ========================= */
export default function HomePage() {
  const { session, loading: sessionLoading } = useSession();
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [rankings, setRankings] = useState<Record<string, RankRow[]>>({});
  const [myScore, setMyScore] = useState<RankRow | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;

    const loadData = async () => {
      try {
        // 1. お知らせ取得
        const nRes = await fetch("/api/news");
        if (nRes.ok) {
          const nData = await nRes.json();
          setNews(Array.isArray(nData) ? nData.slice(0, 3) : []);
        }

        // 2. ランキング・スコア取得
        const rRes = await fetch("/api/ranking");
        if (rRes.ok) {
          const rData = await rRes.json();
          setRankings(rData.rankings || {});
          
          // 店舗ユーザー用フィルタリング
          const found = rData.all?.find((d: any) => 
            d.storeId === (session as any)?.storeId || d.email === session?.email
          );
          setMyScore(found || null);
        }
      } catch (e) {
        console.error("Data fetch error", e);
      } finally {
        setNewsLoading(false);
        setDataLoading(false);
      }
    };

    loadData();
  }, [session, sessionLoading]);

  if (sessionLoading) return null;

  const isStoreUser = session?.role === "manager" || session?.role === "store";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <HomeWidget />

      {/* お知らせパネル */}
      <section className="qsc-panel">
        <div className="qsc-panel-head">
          <Badge icon={<Megaphone size={14} />} label="お知らせ" />
          <Link className="qsc-panel-link" href="/news">
            すべて <ChevronRight size={16} />
          </Link>
        </div>
        <div className="qsc-news-list">
          {newsLoading ? (
            <div className="qsc-news">読み込み中…</div>
          ) : news.length === 0 ? (
            <div className="qsc-news">お知らせはありません</div>
          ) : (
            news.map((n) => (
              <Link key={n.newsId} href={`/news/${n.newsId}`} className="qsc-news">
                <div className="qsc-news-meta">
                  <div className="qsc-news-date">{formatDateJp(n.updatedAt)}</div>
                  <div className="qsc-news-tag">{scopeLabel(n.viewScope)}</div>
                </div>
                <div className="qsc-news-title">{n.title}</div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ロール別表示 */}
      {isStoreUser ? (
        <section className="qsc-panel">
          <div className="qsc-panel-head">
            <Badge icon={<TrendingUp size={14} />} label="自店舗スコア" />
          </div>
          {dataLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}><Loader2 className="animate-spin" /></div>
          ) : myScore ? (
            <div style={{ padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#666", fontWeight: 700, marginBottom: 4 }}>{myScore.storeName}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#2f8ce6" }}>
                {Number(myScore.totalScore || 0).toFixed(1)}<span style={{ fontSize: 18 }}>点</span>
              </div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { k: "Q", v: myScore.q_score },
                  { k: "S", v: myScore.s_score },
                  { k: "C", v: myScore.c_score }
                ].map(item => (
                  <div key={item.k} style={{ background: "#f6f8fb", padding: 8, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>{item.k}</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{item.v || 0}</div>
                  </div>
                ))}
              </div>
              <Link href="/results" style={{ display: "block", marginTop: 16, fontSize: 13, fontWeight: 900, color: "#2f8ce6", textDecoration: "none" }}>
                詳細分析を見る &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>スコアデータがありません</div>
          )}
        </section>
      ) : (
        <section className="qsc-panel">
          <div className="qsc-panel-head">
            <Badge icon={<Trophy size={14} />} label="ランキング" />
          </div>
          <div className="qsc-rank-carousel">
            <div className="qsc-rank-carousel-inner">
              {RANK_TABS.map((tab) => {
                const rows = rankings[tab.key] || [];
                return (
                  <div key={tab.key} className="qsc-rank-card">
                    <div className="qsc-rank-head">
                      <div className="qsc-rank-title">{tab.label}ランキング</div>
                    </div>
                    <ol className="qsc-rank-list">
                      {rows.length > 0 ? rows.map((r, idx) => (
                        <li key={`${tab.key}-${idx}`} className="qsc-rank-row">
                          <div className="qsc-rank-left">
                            <div className="qsc-rank-no">{idx + 1}</div>
                            <div className="qsc-rank-store">{r.storeName}</div>
                          </div>
                          <div className="qsc-rank-score">{Number(r.totalScore || 0).toFixed(1)}</div>
                        </li>
                      )) : (
                        <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#999" }}>データなし</div>
                      )}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}