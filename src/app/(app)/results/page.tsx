"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
  Calendar,
  UserCheck,
  ChevronRight,
  BarChart3,
  Search,
  Trophy,
  MapPin
} from "lucide-react";
import styles from "./ResultsPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

/* =========================================
   Mock Data
   ========================================= */
const MOCK_STORES = [
  { id: "S001", name: "JOYFIT 札幌大通", score: 96, q: 98, s: 94, c: 96 },
  { id: "S002", name: "JOYFIT 仙台駅前", score: 95, q: 94, s: 96, c: 95 },
  { id: "S003", name: "JOYFIT 新宿西口", score: 94, q: 98, s: 92, c: 92 },
  { id: "S004", name: "JOYFIT 名古屋栄", score: 94, q: 95, s: 93, c: 94 },
  { id: "S005", name: "JOYFIT 梅田", score: 93, q: 92, s: 94, c: 93 },
  { id: "S006", name: "JOYFIT 広島", score: 92, q: 90, s: 93, c: 93 },
  { id: "S007", name: "JOYFIT 福岡天神", score: 92, q: 91, s: 92, c: 93 },
];

const HISTORY_MOCK = [
  { date: "2026/02/01", score: 94, inspector: "佐藤 監査員" },
  { date: "2026/01/15", score: 88, inspector: "田中 監査員" },
  { date: "2025/12/20", score: 91, inspector: "佐藤 監査員" },
  { date: "2025/11/05", score: 85, inspector: "鈴木 監査員" },
];

const WEAKNESSES_MOCK = [
  "マシン清掃の徹底 (C)",
  "入店時の挨拶 (S)",
  "トイレ備品補充の頻度 (C)",
];

/* =========================================
   Components
   ========================================= */

/**
 * 店舗詳細ビュー（自店舗または選択した店舗の分析）
 */
function StoreDetailView({ 
  storeName, 
  scoreData, 
  onBack 
}: { 
  storeName: string; 
  scoreData: { total: number, q: number, s: number, c: number };
  onBack?: () => void; 
}) {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {onBack ? (
          <button 
            onClick={onBack} 
            className="qsc-btn qsc-btn-secondary" 
            style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}
          >
             <ChevronLeft size={16} /> 店舗一覧に戻る
          </button>
        ) : (
          <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
             <ChevronLeft size={16} /> ホームへ
          </Link>
        )}
      </div>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{storeName} 分析結果</h1>
        <p className={styles.sub}>
          直近の点検データに基づいたパフォーマンス詳細です。
        </p>
      </header>

      {/* スコア表示 */}
      <section className={styles.card}>
        <div className={styles.sectionTitle} style={{ opacity: 0.6 }}>
           <BarChart3 size={16} /> 最新スコア
        </div>
        
        <div className={styles.scoreRow}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span className={styles.scoreVal}>{scoreData.total}</span>
            <span className={styles.scoreUnit}>点</span>
          </div>
          <div style={{ fontSize: 12, color: "#2f8ce6", fontWeight: 800, marginTop: 8 }}>
            前回の点検より +6点 向上
          </div>
        </div>

        <div className={styles.barGroup}>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span>Quality (品質)</span>
              <span>{scoreData.q}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillQ}`} style={{width: `${scoreData.q}%`}} />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span>Service (接客)</span>
              <span>{scoreData.s}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillS}`} style={{width: `${scoreData.s}%`}} />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span>Cleanliness (清潔)</span>
              <span>{scoreData.c}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillC}`} style={{width: `${scoreData.c}%`}} />
            </div>
          </div>
        </div>
      </section>

      {/* 改善項目 */}
      <section className={styles.card}>
        <div className={styles.sectionTitle} style={{ color: "#ff3b30" }}>
           <AlertTriangle size={18} /> 重点改善が必要な項目
        </div>
        <div className={styles.weakList}>
          {WEAKNESSES_MOCK.map((w, i) => (
            <div key={i} className={styles.weakTag}>{w}</div>
          ))}
        </div>
      </section>

      {/* 履歴 */}
      <section className={styles.card}>
        <div className={styles.sectionTitle} style={{ color: "#2f8ce6" }}>
           <TrendingUp size={18} /> 点検履歴
        </div>
        <div className={styles.histList}>
          {HISTORY_MOCK.map((h, i) => (
            <div key={i} className={styles.histItem}>
              <div>
                <div className={styles.histDate}>
                  <Calendar size={14} color="#999" /> {h.date}
                </div>
                <div className={styles.histMeta}>
                  <UserCheck size={12} style={{ display:"inline", verticalAlign:"-1px", marginRight:4 }}/>
                  {h.inspector}
                </div>
              </div>
              <div className={styles.histScore}>{h.score}点</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * 管理者向けダッシュボード（店舗一覧・ランキング）
 */
function AdminDashboardView({ 
  onSelect 
}: { 
  onSelect: (store: typeof MOCK_STORES[0]) => void 
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return MOCK_STORES.filter(s => s.name.includes(q));
  }, [q]);

  return (
    <div className={styles.page}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
           <ChevronLeft size={16} /> ホームへ
        </Link>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>全店舗 分析結果</h1>
        <p className={styles.sub}>
          全店舗のQSCスコア状況一覧です。店舗を選択して詳細を確認できます。
        </p>
      </header>

      {/* 検索ボックス */}
      <div style={{ position: "relative" }}>
        <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input 
          placeholder="店舗名で検索..." 
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: "100%", height: 48, background: "#fff", border: "1px solid rgba(15,17,21,0.1)", borderRadius: 16, paddingLeft: 44, fontWeight: 700, outline: "none", fontSize: 14 }}
        />
      </div>

      {/* 店舗リスト */}
      <section className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(15,17,21,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={16} color="#fbbf24" /> ランキング順
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{filtered.length} 店舗</span>
        </div>
        
        <div>
          {filtered.map((store, idx) => (
            <button
              key={store.id}
              onClick={() => onSelect(store)}
              style={{
                width: "100%", textAlign: "left", padding: "16px 20px", border: "none", background: "transparent",
                borderBottom: "1px solid rgba(15,17,21,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", transition: "background 0.1s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ 
                  width: 28, height: 28, borderRadius: 10, background: idx < 3 ? "#fffbeb" : "#f1f5f9", 
                  color: idx < 3 ? "#d97706" : "#64748b", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 
                }}>
                  {idx + 1}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{store.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "flex", gap: 8, marginTop: 2 }}>
                    <span>Q: {store.q}</span>
                    <span>S: {store.s}</span>
                    <span>C: {store.c}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#2f8ce6" }}>{store.score}</span>
                <ChevronRight size={18} color="#cbd5e1" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>
              該当する店舗がありません
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================
   Main Page Component
   ========================================= */
export default function ResultsPage() {
  const { session, loading } = useSession();
  const [selectedStore, setSelectedStore] = useState<typeof MOCK_STORES[0] | null>(null);

  // ローディング中
  if (loading) return null;

  const role = session?.role || "viewer";
  const isManager = role === "manager";

  // ① 店舗ユーザーの場合: 「自店舗の詳細」を強制表示
  if (isManager) {
    const storeDisplayName = session?.name ? session.name.split(" ")[0] : "自店舗";
    // モックデータから適当に1つ使用（実際はAPIで自店舗データを取得）
    const myStoreData = MOCK_STORES[2]; 
    const scoreData = { total: myStoreData.score, q: myStoreData.q, s: myStoreData.s, c: myStoreData.c };

    return (
      <StoreDetailView 
        storeName={storeDisplayName} 
        scoreData={scoreData}
        // onBack は無し（ホームへ戻るのみ）
      />
    );
  }

  // ② 管理者・その他: 「一覧」⇔「詳細」を行き来可能
  if (selectedStore) {
    const scoreData = { total: selectedStore.score, q: selectedStore.q, s: selectedStore.s, c: selectedStore.c };
    return (
      <StoreDetailView 
        storeName={selectedStore.name} 
        scoreData={scoreData} 
        onBack={() => setSelectedStore(null)} 
      />
    );
  }

  // デフォルト: 管理者用一覧ダッシュボード
  return <AdminDashboardView onSelect={setSelectedStore} />;
}