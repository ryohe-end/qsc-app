"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
  Calendar,
  UserCheck,
  ChevronRight,
  BarChart3
} from "lucide-react";
import styles from "./ResultsPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

export default function ResultsPage() {
  const { session, loading } = useSession();

  // モックデータ
  const currentScore = {
    total: 94,
    q: 98,
    s: 92,
    c: 92,
  };

  const history = [
    { date: "2026/02/01", score: 94, inspector: "佐藤 監査員" },
    { date: "2026/01/15", score: 88, inspector: "田中 監査員" },
    { date: "2025/12/20", score: 91, inspector: "佐藤 監査員" },
    { date: "2025/11/05", score: 85, inspector: "鈴木 監査員" },
  ];

  const weaknesses = [
    "マシン清掃の徹底 (C)",
    "入店時の挨拶 (S)",
    "トイレ備品補充の頻度 (C)",
  ];

  if (loading) return null;

  const storeDisplayName = session?.name ? session.name.split(" ")[0] : "自店舗";

  return (
    <div className={styles.page}>
      {/* Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
           <ChevronLeft size={16} /> ホームへ
        </Link>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{storeDisplayName} 分析結果</h1>
        <p className={styles.sub}>
          直近の点検データに基づいたパフォーマンス詳細です。
        </p>
      </header>

      {/* スコア表示（ランキングなし） */}
      <section className={styles.card}>
        <div className={styles.sectionTitle} style={{ opacity: 0.6 }}>
           <BarChart3 size={16} /> 最新スコア
        </div>
        
        <div className={styles.scoreRow}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span className={styles.scoreVal}>{currentScore.total}</span>
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
              <span>{currentScore.q}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillQ}`} style={{width: `${currentScore.q}%`}} />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span>Service (接客)</span>
              <span>{currentScore.s}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillS}`} style={{width: `${currentScore.s}%`}} />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span>Cleanliness (清潔)</span>
              <span>{currentScore.c}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={`${styles.barFill} ${styles.fillC}`} style={{width: `${currentScore.c}%`}} />
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
          {weaknesses.map((w, i) => (
            <div key={i} className={styles.weakTag}>{w}</div>
          ))}
        </div>
      </section>

      {/* 履歴（縦に長く伸びてもスクロール可能） */}
      <section className={styles.card}>
        <div className={styles.sectionTitle} style={{ color: "#2f8ce6" }}>
           <TrendingUp size={18} /> 点検履歴
        </div>
        <div className={styles.histList}>
          {history.map((h, i) => (
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