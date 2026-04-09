"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  UserCheck,
  BarChart3,
  Search,
  Trophy,
  Loader2,
  Medal,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

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

type HistoryItem = {
  resultId: string;
  storeName: string;
  submittedAt: string;
  status: string;
  userName?: string;
  summary?: {
    point?: number;
    ok?: number;
    ng?: number;
    hold?: number;
    inspectionDate?: string;
  };
};

type NgItem = {
  id: string;
  label: string;
  note: string;
  sectionTitle: string;
  category?: string;
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

function scoreColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 70) return "#2563eb";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function medalColor(idx: number) {
  if (idx === 0) return "#f59e0b";
  if (idx === 1) return "#94a3b8";
  if (idx === 2) return "#b45309";
  return "#e2e8f0";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1  4〜6月",
  2: "Q2  7〜9月",
  3: "Q3 10〜12月",
  4: "Q4  1〜3月",
};

/* ========================= ScoreRing ========================= */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={size * 0.08} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.08}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

/* ========================= Store Detail View ========================= */
function StoreDetailView({
  storeId,
  storeName,
  score,
  onBack,
}: {
  storeId: string;
  storeName: string;
  score: RankRow;
  onBack?: () => void;
}) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ngItems, setNgItems] = useState<NgItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingNg, setLoadingNg] = useState(false);

  // 点検履歴を取得
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/check/results/history?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setHistory(Array.isArray(data?.items) ? data.items : []))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [storeId]);

  // 最新結果のNG項目を取得
  useEffect(() => {
    if (!history.length) return;
    const latest = history[0];
    if (!latest?.resultId) return;
    setLoadingNg(true);
    fetch(`/api/check/results/detail?storeId=${encodeURIComponent(storeId)}&resultId=${encodeURIComponent(latest.resultId)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.sections) return;
        const ngs: NgItem[] = [];
        for (const sec of data.sections) {
          for (const item of sec.items ?? []) {
            if (item.state === "ng") {
              ngs.push({ id: item.id, label: item.label, note: item.note || "", sectionTitle: sec.title, category: item.category });
            }
          }
        }
        setNgItems(ngs);
      })
      .catch(console.error)
      .finally(() => setLoadingNg(false));
  }, [history, storeId]);

  const totalSc = score.totalScore;
  const color = scoreColor(totalSc);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .rv-card { animation: fadeUp 0.3s ease both; border-radius: 24px; border: 1px solid #e2e8f0; background: #fff; overflow: hidden; }
        .rv-card:nth-child(2) { animation-delay: 0.05s; }
        .rv-card:nth-child(3) { animation-delay: 0.10s; }
        .rv-card:nth-child(4) { animation-delay: 0.15s; }
      `}</style>

      {/* 戻るボタン */}
      {onBack ? (
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={18} /> 店舗一覧に戻る
        </button>
      ) : (
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", textDecoration: "none" }}>
          <ChevronLeft size={18} /> ホームへ
        </Link>
      )}

      {/* スコアヒーローカード */}
      <div className="rv-card" style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e40af 100%)",
        border: "none", color: "#fff", padding: "24px 20px",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{storeName}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>TOTAL SCORE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, color: "#fff" }}>{totalSc}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>点</span>
            </div>
          </div>
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <ScoreRing score={totalSc} size={80} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>
              {totalSc}%
            </div>
          </div>
        </div>

        {/* Q/S/C */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
          {([
            { k: "Q", v: score.q_score, color: "#38bdf8" },
            { k: "S", v: score.s_score, color: "#34d399" },
            { k: "C", v: score.c_score, color: "#fbbf24" },
          ] as const).map(item => (
            <div key={item.k} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: item.color, marginBottom: 2 }}>{item.k}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
                {item.v !== null && item.v !== undefined ? item.v : "—"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>点</div>
            </div>
          ))}
        </div>
      </div>

      {/* QSCバー */}
      <div className="rv-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#ede9fe", display: "grid", placeItems: "center" }}>
            <BarChart3 size={15} color="#7c3aed" />
          </div>
          カテゴリ別スコア
        </div>
        {([
          { label: "Q — Quality（品質）", v: score.q_score, color: "#0ea5e9", track: "#e0f2fe" },
          { label: "S — Service（接客）", v: score.s_score, color: "#10b981", track: "#d1fae5" },
          { label: "C — Cleanliness（清潔）", v: score.c_score, color: "#f59e0b", track: "#fef3c7" },
        ] as const).map(item => (
          <div key={item.label} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 6 }}>
              <span>{item.label}</span>
              <span style={{ color: item.v !== null && item.v !== undefined ? item.color : "#94a3b8", fontWeight: 900 }}>
                {item.v !== null && item.v !== undefined ? `${item.v}点` : "—"}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: item.track, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${item.v ?? 0}%`, borderRadius: 999, background: item.color, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* NG項目 */}
      <div className="rv-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fee2e2", display: "grid", placeItems: "center" }}>
            <AlertTriangle size={15} color="#dc2626" />
          </div>
          改善が必要な項目
          {ngItems.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 900, padding: "2px 8px", borderRadius: 8, background: "#fee2e2", color: "#dc2626" }}>
              {ngItems.length}件
            </span>
          )}
        </div>
        {loadingNg ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#dc2626" }} />
          </div>
        ) : ngItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, fontWeight: 700, color: "#059669" }}>
            ✨ NG項目なし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ngItems.map((item, idx) => (
              <div key={idx} style={{ borderRadius: 14, border: "1px solid #fee2e2", background: "#fff7f7", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 3 }}>
                  {item.sectionTitle}{item.category ? ` · ${item.category}` : ""}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", lineHeight: 1.4, marginBottom: item.note ? 6 : 0 }}>
                  {item.label}
                </div>
                {item.note && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fee2e2", borderRadius: 8, padding: "6px 10px" }}>
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 点検履歴 */}
      <div className="rv-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#dbeafe", display: "grid", placeItems: "center" }}>
            <TrendingUp size={15} color="#2563eb" />
          </div>
          点検履歴
        </div>
        {loadingHistory ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>
            履歴がありません
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(0, 6).map((h, idx) => {
              const pt = h.summary?.point;
              const inspDate = h.summary?.inspectionDate || formatDate(h.submittedAt);
              return (
                <div key={h.resultId} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 16,
                  background: idx === 0 ? "#f8fafc" : "#fff",
                  border: `1px solid ${idx === 0 ? "#e2e8f0" : "#f1f5f9"}`,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
                      <Calendar size={13} color="#94a3b8" /> {inspDate}
                      {idx === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 5, background: "#1e293b", color: "#fff" }}>最新</span>
                      )}
                    </div>
                    {h.userName && (
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2, paddingLeft: 19 }}>
                        <UserCheck size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                        {h.userName}
                      </div>
                    )}
                  </div>
                  {pt !== undefined ? (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor(pt) }}>{pt}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>点</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= Admin Dashboard View ========================= */
function AdminDashboardView({
  onSelect,
}: {
  onSelect: (row: RankRow) => void;
}) {
  const { quarter: initQ, fiscalYear: initFY } = getCurrentQuarter();
  const [selectedQuarter, setSelectedQuarter] = useState(initQ);
  const [selectedFiscalYear] = useState(initFY);
  const [allRows, setAllRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ranking?quarter=${selectedQuarter}&fiscalYear=${selectedFiscalYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // all から store ごとに最新1件を抽出してスコア降順
        const byStore = new Map<string, RankRow>();
        for (const row of (data.all as RankRow[]) ?? []) {
          const existing = byStore.get(row.storeId);
          if (!existing || (row.totalScore ?? 0) > (existing.totalScore ?? 0)) {
            byStore.set(row.storeId, row);
          }
        }
        const sorted = [...byStore.values()].sort((a, b) => b.totalScore - a.totalScore);
        setAllRows(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedQuarter, selectedFiscalYear]);

  const filtered = useMemo(() =>
    allRows.filter(r => r.storeName?.includes(q)),
    [allRows, q]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .rv-adm-card { animation: fadeUp 0.3s ease both; }
        .rv-store-row:hover { background: #f8fafc !important; }
      `}</style>

      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#64748b", textDecoration: "none" }}>
        <ChevronLeft size={18} /> ホームへ
      </Link>

      {/* ヘッダー */}
      <div className="rv-adm-card" style={{
        background: "linear-gradient(135deg, #1e293b, #334155)",
        borderRadius: 24, padding: "20px", color: "#fff",
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>RESULTS</div>
        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>全店舗 分析結果</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6, fontWeight: 600 }}>
          {filtered.length} 店舗 · {QUARTER_LABELS[selectedQuarter]}
        </div>
      </div>

      {/* クォーター選択 */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
        {([1, 2, 3, 4] as const).map(qt => (
          <button key={qt} onClick={() => setSelectedQuarter(qt)} style={{
            flexShrink: 0, padding: "7px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 800, cursor: "pointer", border: "1.5px solid",
            borderColor: selectedQuarter === qt ? "#1e293b" : "#e2e8f0",
            background: selectedQuarter === qt ? "#1e293b" : "#fff",
            color: selectedQuarter === qt ? "#fff" : "#64748b",
            transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
            {QUARTER_LABELS[qt]}
          </button>
        ))}
      </div>

      {/* 検索 */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input
          placeholder="店舗名で検索…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", height: 48,
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
            paddingLeft: 44, fontSize: 14, fontWeight: 700, outline: "none",
          }}
        />
      </div>

      {/* 店舗リスト */}
      <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 900, color: "#1e293b" }}>
            <Trophy size={15} color="#ca8a04" /> ランキング順
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{filtered.length}店舗</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>
            {q ? "該当する店舗がありません" : "このクォーターのデータがありません"}
          </div>
        ) : (
          filtered.map((row, idx) => (
            <button
              key={row.storeId}
              className="rv-store-row"
              onClick={() => onSelect(row)}
              style={{
                width: "100%", textAlign: "left", padding: "14px 20px",
                border: "none", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                background: "transparent", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 14, transition: "background 0.15s",
              }}
            >
              {/* 順位 */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: idx < 3 ? medalColor(idx) : "#f1f5f9",
                display: "grid", placeItems: "center",
              }}>
                {idx < 3 ? (
                  <Medal size={14} color="#fff" />
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>{idx + 1}</span>
                )}
              </div>

              {/* 店舗名 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.storeName}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  {([
                    { k: "Q", v: row.q_score, c: "#0ea5e9" },
                    { k: "S", v: row.s_score, c: "#10b981" },
                    { k: "C", v: row.c_score, c: "#f59e0b" },
                  ] as const).map(item => (
                    <span key={item.k} style={{ fontSize: 11, fontWeight: 800, color: item.v !== null && item.v !== undefined ? item.c : "#cbd5e1" }}>
                      {item.k}: {item.v !== null && item.v !== undefined ? item.v : "—"}
                    </span>
                  ))}
                </div>
              </div>

              {/* スコア */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor(row.totalScore) }}>{row.totalScore}</span>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================= Main ========================= */
export default function ResultsPage() {
  const { session, loading } = useSession();
  const [selectedStore, setSelectedStore] = useState<RankRow | null>(null);
  const [myScore, setMyScore] = useState<RankRow | null>(null);
  const [loadingMyScore, setLoadingMyScore] = useState(true);

  const { quarter, fiscalYear } = getCurrentQuarter();

  // 店舗ユーザーの場合は自分のスコアを取得
  useEffect(() => {
    if (loading) return;
    const role = session?.role as string;
    if (role !== "manager" && role !== "store") { setLoadingMyScore(false); return; }
    const storeId = (session as any)?.storeId;
    if (!storeId) { setLoadingMyScore(false); return; }

    fetch(`/api/ranking?quarter=${quarter}&fiscalYear=${fiscalYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const found = (data?.all as RankRow[])?.find(r => r.storeId === storeId);
        setMyScore(found ?? { storeId, storeName: session?.name ?? "自店舗", totalScore: 0 });
      })
      .catch(console.error)
      .finally(() => setLoadingMyScore(false));
  }, [loading, session, quarter, fiscalYear]);

  if (loading || loadingMyScore) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
        <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
      </div>
    );
  }

  const role = session?.role as string;
  const isStoreUser = role === "manager" || role === "store";

  // 店舗ユーザー → 自店舗詳細
  if (isStoreUser) {
    const score = myScore ?? { storeId: "", storeName: session?.name ?? "", totalScore: 0 };
    return (
      <StoreDetailView
        storeId={score.storeId}
        storeName={score.storeName}
        score={score}
      />
    );
  }

  // 管理者 → 選択した店舗詳細
  if (selectedStore) {
    return (
      <StoreDetailView
        storeId={selectedStore.storeId}
        storeName={selectedStore.storeName}
        score={selectedStore}
        onBack={() => setSelectedStore(null)}
      />
    );
  }

  // 管理者 → 全店舗一覧
  return <AdminDashboardView onSelect={setSelectedStore} />;
}

