"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  BarChart3,
  Search,
  MapPin,
  ExternalLink,
  Download,
  TrendingUp,
  Home,
  Target,
  Award
} from "lucide-react";

/** =========================
 * 型定義 & モックデータ
 * ========================= */
type Quarter = "2025-Q4" | "2026-Q1";

const QUARTER_STORES: Record<Quarter, any[]> = {
  "2026-Q1": [
    { id: "ST-001", name: "新宿西口店", score: 68, issues: 18, critical: 4, q: 70, s: 60, c: 74 },
    { id: "ST-002", name: "札幌大通店", score: 82, issues: 12, critical: 1, q: 85, s: 80, c: 81 },
    { id: "ST-003", name: "大阪梅田店", score: 94, issues: 5, critical: 0, q: 98, s: 92, c: 92 },
    { id: "ST-004", name: "福岡天神店", score: 72, issues: 10, critical: 2, q: 65, s: 75, c: 76 },
  ],
  "2025-Q4": [
    { id: "ST-001", name: "新宿西口店", score: 75, issues: 14, critical: 2, q: 72, s: 78, c: 75 },
    { id: "ST-002", name: "札幌大通店", score: 78, issues: 15, critical: 3, q: 75, s: 82, c: 77 },
    { id: "ST-003", name: "大阪梅田店", score: 88, issues: 8, critical: 1, q: 90, s: 85, c: 89 },
    { id: "ST-004", name: "福岡天神店", score: 80, issues: 12, critical: 1, q: 82, s: 78, c: 80 },
  ]
};

/** =========================
 * UI Components
 * ========================= */

// スコアに応じた色を返す関数
const getScoreColor = (score: number) => {
  if (score >= 90) return "#10b981"; // Excellent
  if (score >= 75) return "#3b82f6"; // Good
  if (score >= 60) return "#f59e0b"; // Warning
  return "#f43f5e"; // Critical
};

/** =========================
 * Main Page
 * ========================= */
export default function QuarterAnalyticsPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>("2026-Q1");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // ランキング順（スコア昇順・降順）の店舗リスト
  const storeList = useMemo(() => {
    return [...QUARTER_STORES[selectedQuarter]].sort((a, b) => b.score - a.score);
  }, [selectedQuarter]);

  const selectedStore = useMemo(() => 
    storeList.find(s => s.id === selectedStoreId), 
  [selectedStoreId, storeList]);

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", fontFamily: "'Inter', sans-serif", color: "#1e293b" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Home size={14} /><span>Dashboard</span>
          </Link>
          <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
          <button 
            onClick={() => setSelectedStoreId(null)}
            style={{ background: "none", border: "none", padding: 0, color: selectedStoreId ? "#64748b" : "#1e293b", fontSize: 13, fontWeight: selectedStoreId ? 700 : 900, cursor: selectedStoreId ? "pointer" : "default" }}
          >
            クォーター分析
          </button>
        </nav>

        {!selectedStoreId ? (
          /* ==========================================================
             クォーター・ランキング画面
             ========================================================== */
          <div style={{ display: "grid", gap: 32 }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>QSCランキング分析</h1>
                <p style={{ color: "#64748b", fontWeight: 700, marginTop: 4 }}>各店舗のクォーター評価とワースト項目の特定</p>
              </div>
              <div style={{ display: "flex", background: "#fff", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                {(["2025-Q4", "2026-Q1"] as Quarter[]).map(q => (
                  <button key={q} onClick={() => setSelectedQuarter(q)} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 800, cursor: "pointer", background: selectedQuarter === q ? "#1e293b" : "transparent", color: selectedQuarter === q ? "#fff" : "#64748b", transition: "0.2s" }}>
                    {q}
                  </button>
                ))}
              </div>
            </header>

            {/* スコア分布サマリー */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>クォーター平均スコア</div>
                <div style={{ fontSize: 32, fontWeight: 950, color: "#4f46e5" }}>
                  {Math.round(storeList.reduce((acc, s) => acc + s.score, 0) / storeList.length)} <small style={{ fontSize: 16 }}>点</small>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>重大な指摘事項（全店）</div>
                <div style={{ fontSize: 32, fontWeight: 950, color: "#f43f5e" }}>
                  {storeList.reduce((acc, s) => acc + s.critical, 0)} <small style={{ fontSize: 16 }}>件</small>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>No.1 店舗</div>
                <div style={{ fontSize: 20, fontWeight: 950, display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Trophy size={20} color="#fbbf24" /> {storeList[0].name}
                </div>
              </div>
            </div>

            {/* ランキングテーブル */}
            <div style={{ background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "20px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>RANK</th>
                    <th style={{ padding: "20px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>店舗名</th>
                    <th style={{ padding: "20px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>QSCスコア</th>
                    <th style={{ padding: "20px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>不備件数</th>
                    <th style={{ padding: "20px 24px", fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>重大不備</th>
                    <th style={{ padding: "20px 24px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {storeList.map((store, index) => (
                    <tr key={store.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => setSelectedStoreId(store.id)}>
                      <td style={{ padding: "20px 24px" }}>
                        <span style={{ 
                          width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 950,
                          background: index === 0 ? "#fffbeb" : index >= storeList.length - 1 ? "#fef2f2" : "#f1f5f9",
                          color: index === 0 ? "#d97706" : index >= storeList.length - 1 ? "#ef4444" : "#64748b"
                        }}>
                          {index + 1}
                        </span>
                      </td>
                      <td style={{ padding: "20px 24px", fontWeight: 800 }}>{store.name}</td>
                      <td style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18, fontWeight: 950, color: getScoreColor(store.score) }}>{store.score}</span>
                          <div style={{ width: 80, height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                            <div style={{ width: `${store.score}%`, height: "100%", background: getScoreColor(store.score), borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "20px 24px", fontWeight: 700 }}>{store.issues}件</td>
                      <td style={{ padding: "20px 24px" }}>
                        {store.critical > 0 && (
                          <span style={{ background: "#fef2f2", color: "#ef4444", fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <AlertTriangle size={12} /> {store.critical}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "20px 24px", textAlign: "right" }}><ChevronRight size={18} color="#cbd5e1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ==========================================================
             店舗別ドリルダウン画面
             ========================================================== */
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 32, animation: "fadeIn 0.4s ease" }}>
            
            {/* 左：詳細サマリー */}
            <aside>
              <button onClick={() => setSelectedStoreId(null)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#4f46e5", fontWeight: 800, cursor: "pointer", marginBottom: 24, padding: 0 }}>
                <ArrowLeft size={18} /> ランキングに戻る
              </button>
              
              <div style={{ background: "#fff", padding: 32, borderRadius: 32, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#4f46e5", marginBottom: 8 }}>{selectedQuarter} SCORE</div>
                <h2 style={{ fontSize: 28, fontWeight: 950, marginBottom: 24 }}>{selectedStore?.name}</h2>
                
                <div style={{ textAlign: "center", padding: "32px 0", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 56, fontWeight: 950, color: getScoreColor(selectedStore!.score), lineHeight: 1 }}>{selectedStore?.score}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#94a3b8", marginTop: 8 }}>総合評価</div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  {["Q", "S", "C"].map(type => (
                    <div key={type} style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 13 }}>{type === "Q" ? "品質 (Quality)" : type === "S" ? "サービス (Service)" : "清潔感 (Cleanliness)"}</span>
                        <span style={{ fontWeight: 950, color: "#1e293b" }}>{type === "Q" ? selectedStore?.q : type === "S" ? selectedStore?.s : selectedStore?.c}点</span>
                      </div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${type === "Q" ? selectedStore?.q : type === "S" ? selectedStore?.s : selectedStore?.c}%`, background: "#4f46e5", borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* 右：改善が必要な不備（ワースト項目） */}
            <section>
              <div style={{ background: "#fff", padding: 32, borderRadius: 32, border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: 18, fontWeight: 950, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={20} color="#f43f5e" /> {selectedQuarter} の重点改善項目
                </h3>
                
                <div style={{ display: "grid", gap: 16 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ padding: "20px", borderRadius: 24, border: "1px solid #f1f5f9", display: "flex", gap: 20, alignItems: "start" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: "#fef2f2", color: "#f43f5e", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Target size={20} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>重大不備</span>
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8" }}>CATEGORY: CLEANLINESS</span>
                        </div>
                        <h4 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>シャワーブースの排水口の清掃が行き届いていない</h4>
                        <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600, margin: 0 }}>
                          前回のチェックから改善されていません。カビの発生リスクがあるため即時対応が必要です。
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button style={{ width: "100%", marginTop: 32, height: 56, borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Download size={18} /> クォーター改善指示書をDL
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}