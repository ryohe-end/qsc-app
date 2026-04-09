"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight, ArrowLeft, AlertTriangle, Trophy,
  Target, Home, Loader2, CheckCircle2,
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

type NgItem = {
  id: string;
  label: string;
  note: string;
  sectionTitle: string;
  category?: string;
};

type StoreRow = {
  storeId: string;
  name: string;
  score: number;
  q: number | null;
  s: number | null;
  c: number | null;
  ngCount: number;
  inspectionDate?: string;
};

/* ========================= Quarter helpers ========================= */
type QuarterInfo = { quarter: number; fiscalYear: number; label: string };

function getCurrentQuarter(): QuarterInfo {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 4 && month <= 6)  return { quarter: 1, fiscalYear: year,     label: `${year} Q1（4〜6月）` };
  if (month >= 7 && month <= 9)  return { quarter: 2, fiscalYear: year,     label: `${year} Q2（7〜9月）` };
  if (month >= 10 && month <= 12) return { quarter: 3, fiscalYear: year,    label: `${year} Q3（10〜12月）` };
  return                                 { quarter: 4, fiscalYear: year - 1, label: `${year - 1} Q4（1〜3月）` };
}

function buildQuarterOptions(): QuarterInfo[] {
  const cur = getCurrentQuarter();
  const options: QuarterInfo[] = [];
  // 現在のクォーターから過去4クォーター分を生成
  let { quarter, fiscalYear } = cur;
  for (let i = 0; i < 4; i++) {
    const labels: Record<number, string> = {
      1: `${fiscalYear} Q1（4〜6月）`,
      2: `${fiscalYear} Q2（7〜9月）`,
      3: `${fiscalYear} Q3（10〜12月）`,
      4: `${fiscalYear} Q4（1〜3月）`,
    };
    options.push({ quarter, fiscalYear, label: labels[quarter] });
    // 1つ前のクォーターへ
    quarter--;
    if (quarter === 0) { quarter = 4; fiscalYear--; }
  }
  return options;
}

/* ========================= Color helpers ========================= */
function getScoreColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 75) return "#2563eb";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

/* ========================= Main Page ========================= */
export default function QuarterAnalyticsPage() {
  const quarterOptions = useMemo(() => buildQuarterOptions(), []);
  const [selectedQIdx, setSelectedQIdx] = useState(0); // 0 = 現在のクォーター
  const [allRows, setAllRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [ngItems, setNgItems] = useState<NgItem[]>([]);
  const [ngLoading, setNgLoading] = useState(false);

  const selected = quarterOptions[selectedQIdx];

  // ランキングAPIからデータ取得
  useEffect(() => {
    setLoading(true);
    setSelectedStoreId(null);
    fetch(`/api/ranking?quarter=${selected.quarter}&fiscalYear=${selected.fiscalYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // all から店舗ごとに最高スコアの1件を抽出
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
  }, [selected.quarter, selected.fiscalYear]);

  // 店舗選択時にNG項目を取得
  useEffect(() => {
    if (!selectedStoreId) { setNgItems([]); return; }
    setNgLoading(true);
    // まずhistoryAPIで最新のresultIdを取得
    fetch(`/api/check/results/history?storeId=${encodeURIComponent(selectedStoreId)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(async data => {
        const items = Array.isArray(data?.items) ? data.items : [];
        const latest = items[0];
        if (!latest?.resultId) return;
        const detail = await fetch(
          `/api/check/results/detail?storeId=${encodeURIComponent(selectedStoreId)}&resultId=${encodeURIComponent(latest.resultId)}`,
          { cache: "no-store" }
        );
        if (!detail.ok) return;
        const dJson = await detail.json();
        const ngs: NgItem[] = [];
        for (const sec of dJson.sections ?? []) {
          for (const item of sec.items ?? []) {
            if (item.state === "ng") {
              ngs.push({ id: item.id, label: item.label, note: item.note || "", sectionTitle: sec.title, category: item.category });
            }
          }
        }
        setNgItems(ngs);
      })
      .catch(console.error)
      .finally(() => setNgLoading(false));
  }, [selectedStoreId]);

  // ランキング順に並び替え
  const storeList: StoreRow[] = useMemo(() =>
    [...allRows]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(r => ({
        storeId: r.storeId,
        name: r.storeName,
        score: r.totalScore,
        q: r.q_score ?? null,
        s: r.s_score ?? null,
        c: r.c_score ?? null,
        ngCount: 0, // 一覧画面ではNG数は取得しない
        inspectionDate: r.inspectionDate,
      })),
    [allRows]
  );

  const selectedStore = storeList.find(s => s.storeId === selectedStoreId);

  const avgScore = storeList.length > 0
    ? Math.round(storeList.reduce((a, s) => a + s.score, 0) / storeList.length)
    : 0;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", color: "#1e293b" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .aq-row:hover { background: #f8fafc !important; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} color="#cbd5e1" />
          <button onClick={() => setSelectedStoreId(null)}
            style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: selectedStoreId ? 700 : 900, color: selectedStoreId ? "#64748b" : "#1e293b", cursor: selectedStoreId ? "pointer" : "default" }}>
            クォーター分析
          </button>
          {selectedStore && (
            <>
              <ChevronRight size={14} color="#cbd5e1" />
              <span style={{ fontWeight: 900, color: "#1e293b" }}>{selectedStore.name}</span>
            </>
          )}
        </nav>

        {!selectedStoreId ? (
          /* ========== ランキング画面 ========== */
          <div style={{ display: "grid", gap: 32, animation: "fadeIn 0.3s ease" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>QSCランキング分析</h1>
                <p style={{ color: "#64748b", fontWeight: 700, marginTop: 4, margin: "4px 0 0" }}>各店舗のクォーター評価と重点改善項目の特定</p>
              </div>
              {/* クォーター選択 */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {quarterOptions.map((q, i) => (
                  <button key={i} onClick={() => setSelectedQIdx(i)}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", borderColor: selectedQIdx === i ? "#1e293b" : "#e2e8f0", background: selectedQIdx === i ? "#1e293b" : "#fff", color: selectedQIdx === i ? "#fff" : "#64748b", whiteSpace: "nowrap" }}>
                    {q.label}
                  </button>
                ))}
              </div>
            </header>

            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>クォーター平均スコア</div>
                <div style={{ fontSize: 32, fontWeight: 950, color: "#4f46e5" }}>
                  {loading ? "—" : avgScore}<small style={{ fontSize: 16, fontWeight: 700 }}> 点</small>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>対象店舗数</div>
                <div style={{ fontSize: 32, fontWeight: 950, color: "#0ea5e9" }}>
                  {loading ? "—" : storeList.length}<small style={{ fontSize: 16, fontWeight: 700 }}> 店舗</small>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>No.1 店舗</div>
                <div style={{ fontSize: 18, fontWeight: 950, display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  {loading ? "—" : storeList.length > 0 ? (
                    <><Trophy size={20} color="#f59e0b" /> {storeList[0].name}</>
                  ) : "データなし"}
                </div>
              </div>
            </div>

            {/* ランキングテーブル */}
            <div style={{ background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>ランキング順</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{selected.label}</div>
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
                    <tr>
                      {["RANK", "店舗名", "QSCスコア", "Q", "S", "C", "点検日", ""].map(h => (
                        <th key={h} style={{ padding: "16px 20px", fontSize: 11, fontWeight: 900, color: "#94a3b8", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storeList.map((store, idx) => (
                      <tr key={store.storeId} className="aq-row"
                        style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.15s" }}
                        onClick={() => setSelectedStoreId(store.storeId)}>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%", display: "inline-grid", placeItems: "center",
                            fontSize: 13, fontWeight: 950,
                            background: idx === 0 ? "#fffbeb" : idx === storeList.length - 1 ? "#fef2f2" : "#f1f5f9",
                            color: idx === 0 ? "#d97706" : idx === storeList.length - 1 ? "#dc2626" : "#64748b",
                          }}>{idx + 1}</span>
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
                          <td key={i} style={{ padding: "16px 20px", fontWeight: 800, fontSize: 14, color: v !== null ? getScoreColor(v) : "#94a3b8" }}>
                            {v !== null ? v : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
                          {store.inspectionDate || "—"}
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <ChevronRight size={18} color="#cbd5e1" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* ========== 店舗別ドリルダウン ========== */
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 32, animation: "fadeIn 0.3s ease", alignItems: "start" }}>

            {/* 左：スコアサマリー */}
            <aside>
              <button onClick={() => setSelectedStoreId(null)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#4f46e5", fontWeight: 800, cursor: "pointer", marginBottom: 24, padding: 0, fontSize: 14 }}>
                <ArrowLeft size={18} /> ランキングに戻る
              </button>

              <div style={{ background: "#fff", padding: 28, borderRadius: 28, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#4f46e5", letterSpacing: "0.1em", marginBottom: 6 }}>{selected.label}</div>
                <h2 style={{ fontSize: 24, fontWeight: 950, margin: "0 0 24px" }}>{selectedStore?.name}</h2>

                {/* 合計スコア */}
                <div style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", marginBottom: 20 }}>
                  <div style={{ fontSize: 64, fontWeight: 950, color: getScoreColor(selectedStore!.score), lineHeight: 1 }}>{selectedStore?.score}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#94a3b8", marginTop: 6 }}>総合スコア（点）</div>
                  {selectedStore?.inspectionDate && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>点検日: {selectedStore.inspectionDate}</div>
                  )}
                </div>

                {/* Q/S/C バー */}
                <div style={{ display: "grid", gap: 14 }}>
                  {([
                    { label: "Q — Quality（品質）", v: selectedStore?.q, color: "#0ea5e9" },
                    { label: "S — Service（接客）", v: selectedStore?.s, color: "#10b981" },
                    { label: "C — Cleanliness（清潔）", v: selectedStore?.c, color: "#f59e0b" },
                  ] as const).map(item => (
                    <div key={item.label} style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 800 }}>
                        <span style={{ color: "#475569" }}>{item.label}</span>
                        <span style={{ color: item.v !== null && item.v !== undefined ? item.color : "#94a3b8", fontWeight: 900 }}>
                          {item.v !== null && item.v !== undefined ? `${item.v}点` : "—"}
                        </span>
                      </div>
                      <div style={{ height: 7, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${item.v ?? 0}%`, background: item.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* 右：NG項目一覧 */}
            <section>
              <div style={{ background: "#fff", padding: 28, borderRadius: 28, border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: 18, fontWeight: 950, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={20} color="#dc2626" />
                  最新点検のNG項目
                  {!ngLoading && ngItems.length > 0 && (
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 900, padding: "3px 10px", borderRadius: 8, background: "#fee2e2", color: "#dc2626" }}>
                      {ngItems.length}件
                    </span>
                  )}
                </h3>

                {ngLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#dc2626" }} />
                  </div>
                ) : ngItems.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40, color: "#94a3b8" }}>
                    <CheckCircle2 size={40} color="#10b981" strokeWidth={1.5} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>NG項目はありません</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {ngItems.map((item, i) => (
                      <div key={item.id} style={{ padding: 20, borderRadius: 20, border: "1px solid #fee2e2", display: "flex", gap: 16, alignItems: "flex-start", background: i === 0 ? "#fff7f7" : "#fff" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <Target size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 900, background: "#f1f5f9", padding: "2px 8px", borderRadius: 5, color: "#64748b" }}>
                              {item.sectionTitle}
                            </span>
                            {item.category && (
                              <span style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8" }}>
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", lineHeight: 1.4, marginBottom: item.note ? 8 : 0 }}>
                            {item.label}
                          </div>
                          {item.note && (
                            <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, background: "#fee2e2", borderRadius: 8, padding: "6px 10px" }}>
                              {item.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
