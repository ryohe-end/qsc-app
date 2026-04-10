"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Home, ChevronRight, Printer,
  AlertCircle, MessageSquare, User, Calendar,
  Clock, CheckCircle2, XCircle, PauseCircle, Image,
} from "lucide-react";

type CategoryScore = { score: number; maxScore: number };

type SummaryData = {
  ok: number;       // 合計◯数
  hold: number;
  ng: number;
  na: number;
  unset: number;
  total: number;
  maxScore: number; // 合計分母（対象外以外の設問数）
  point: number;    // 合計点数（切り捨て）
  photoCount: number;
  inspectionDate: string;
  improvementDeadline: string;
  categoryScores?: Record<string, { ok: number; maxScore: number; point: number }>;
};

type HistoryItem = {
  resultId: string;
  submittedAt: string;
  status: string;
  summary?: SummaryData;
};

type ItemData = {
  id: string;
  label: string;
  state: string;
  note?: string;
  holdNote?: string;
  category?: string;
  photos?: { id: string; url: string }[];
  correctionStatus?: string;
};

type SectionData = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  items: ItemData[];
};

type ResultData = {
  summary: SummaryData;
  sections: SectionData[];
  storeName: string;
  userName: string;
};

// カテゴリの表示名マッピング
const CATEGORY_LABEL: Record<string, string> = {
  Q: "Q（クオリティ）",
  S: "S（サービス）",
  C: "C（クレンリネス）",
};

// 全角→半角正規化（"Ｑ"→"Q", "Ｓ"→"S", "Ｃ"→"C" など）
function normalizeCategory(cat: string): string {
  return cat
    .normalize("NFKC") // 全角英数を半角に変換
    .trim()
    .toUpperCase();
}

function CategoryScoreCard({
  category,
  ok,
  maxScore,
  point,
}: {
  category: string;
  ok: number;
  maxScore: number;
  point: number;
}) {
  const label = CATEGORY_LABEL[category] ?? category;
  const color = point >= 80 ? "#2563eb" : point >= 60 ? "#d97706" : "#dc2626";
  const bg    = point >= 80 ? "#eff6ff" : point >= 60 ? "#fffbeb" : "#fef2f2";
  const border= point >= 80 ? "#bfdbfe" : point >= 60 ? "#fef3c7" : "#fee2e2";

  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "12px", fontWeight: 800, color, opacity: 0.8 }}>{label}</div>
      {/* 点数（大きく） */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{ fontSize: "40px", fontWeight: 900, color, letterSpacing: "-2px", lineHeight: 1 }}>{point}</span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#94a3b8" }}>点</span>
      </div>
      {/* ◯数/分母 */}
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
        ◯ {ok} / {maxScore}問
      </div>
      <div style={{ height: "5px", borderRadius: "3px", background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${point}%`, background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [prevPoint, setPrevPoint] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResult() {
      if (!params?.id) return;
      try {
        // 今回の結果を取得
        const res = await fetch(`/api/check/results?storeId=${params.id}`);
        if (!res.ok) throw new Error("Not Found");
        const json = await res.json();
        setData(json);

        // 前回の結果を historyAPI から取得
        const storeId = String(json.storeId || "").replace(/^STORE#/, "");
        if (storeId) {
          const histRes = await fetch(
            `/api/check/results/history?storeId=${encodeURIComponent(storeId)}`,
            { cache: "no-store" }
          );
          if (histRes.ok) {
            const histJson = await histRes.json();
            const items: HistoryItem[] = Array.isArray(histJson?.items) ? histJson.items : [];
            // 今回の resultId を除いた直前の結果を取得
            const prev = items.find((item) => item.resultId !== params.id);
            if (prev?.summary?.point !== undefined) {
              setPrevPoint(prev.summary.point);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [params?.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", background: "#f8fafc" }}>
        <Loader2 size={40} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>レポートを読み込み中...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
        データが見つかりません
      </div>
    );
  }

  const { summary, sections, storeName, userName } = data;

  // 合計点数の色（切り捨て済みの point を使用）
  const totalPct = summary.point ?? 0;
  const mainColor = totalPct >= 80 ? "#2563eb" : totalPct >= 60 ? "#d97706" : "#dc2626";
  const mainBg    = totalPct >= 80 ? "#eff6ff" : totalPct >= 60 ? "#fffbeb" : "#fef2f2";
  const mainBorder= totalPct >= 80 ? "#bfdbfe" : totalPct >= 60 ? "#fef3c7" : "#fee2e2";

  // カテゴリ別にエリアを振り分け
  // 各エリアは「設問のcategoryの最多値」で1つのカテゴリに所属（重複なし）
  const categoryAreaMap = new Map<string, { id: string; title: string; ok: number; maxScore: number }[]>();
  for (const sec of sections) {
    const catCount: Record<string, number> = {};
    let okCount = 0;
    let maxCount = 0;
    for (const item of sec.items) {
      if (item.state !== "na") {
        maxCount++;
        if (item.state === "ok") okCount++;
      }
      // categoryのカウントはna含む全設問で行う（設問自体の属性なので）
      const cat = normalizeCategory(String(item.category || ""));
      if (cat) catCount[cat] = (catCount[cat] ?? 0) + 1;
    }

    // categoryが1種類もなければ「その他」
    const entries = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
    const dominantCat = entries.length > 0 ? entries[0][0] : "その他";

    if (!categoryAreaMap.has(dominantCat)) categoryAreaMap.set(dominantCat, []);
    categoryAreaMap.get(dominantCat)!.push({ id: sec.id, title: sec.title, ok: okCount, maxScore: maxCount });
  }

  // NG・保留項目を抽出
  const ngItems = sections.flatMap((sec) =>
    sec.items
      .filter((item) => item.state === "ng")
      .map((item) => ({ ...item, sectionTitle: sec.title }))
  );
  const holdItems = sections.flatMap((sec) =>
    sec.items
      .filter((item) => item.state === "hold")
      .map((item) => ({ ...item, sectionTitle: sec.title }))
  );

  // Q/S/C別スコアの有無チェック
  const categoryScores = summary.categoryScores ?? {};
  const hasCategoryScores = Object.keys(categoryScores).length > 0;

  // カテゴリを Q→S→C→その他 の順に並べる
  const categoryOrder = ["Q", "S", "C"];
  // categoryScores のキーを正規化してマージ
  const normalizedCategoryScores: Record<string, { ok: number; maxScore: number; point: number }> = {};
  for (const [key, val] of Object.entries(categoryScores)) {
    const nk = normalizeCategory(key);
    if (!normalizedCategoryScores[nk]) {
      normalizedCategoryScores[nk] = { ok: 0, maxScore: 0, point: 0 };
    }
    normalizedCategoryScores[nk].ok += val.ok;
    normalizedCategoryScores[nk].maxScore += val.maxScore;
  }
  // point を再計算
  for (const nk of Object.keys(normalizedCategoryScores)) {
    const v = normalizedCategoryScores[nk];
    v.point = v.maxScore > 0 ? Math.floor((v.ok / v.maxScore) * 100) : 0;
  }

  const sortedCategories = [
    ...categoryOrder.filter((c) => normalizedCategoryScores[c]),
    ...Object.keys(normalizedCategoryScores).filter((c) => !categoryOrder.includes(c)),
  ];
  // 重複を除去
  const uniqueSortedCategories = [...new Set(sortedCategories)];

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px 16px 60px",
        fontFamily: "sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ヘッダー */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
          <Home size={14} onClick={() => router.push("/")} style={{ cursor: "pointer" }} />
          <ChevronRight size={12} />
          <span>点検レポート</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 800, color: "#1e293b" }}>{storeName}</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#1e293b", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 800, fontSize: "13px" }}
        >
          <Printer size={15} /> PDF/印刷
        </button>
      </div>

      {/* 合計スコアカード */}
      <div
        style={{
          background: mainBg,
          border: `2px solid ${mainBorder}`,
          borderRadius: "28px",
          padding: "32px 24px",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 900, color: mainColor, opacity: 0.7, letterSpacing: "2px", marginBottom: "8px" }}>
          TOTAL SCORE
        </div>

        {/* 合計点数（大きく） */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "80px", fontWeight: 900, color: mainColor, letterSpacing: "-4px", lineHeight: 1 }}>
            {summary.point ?? 0}
          </span>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#94a3b8" }}>点</span>
          {/* 前回比較 */}
          {prevPoint !== null && (
            <span style={{
              fontSize: "14px", fontWeight: 800, marginLeft: "4px",
              color: (summary.point ?? 0) >= prevPoint ? "#059669" : "#dc2626",
            }}>
              {(summary.point ?? 0) >= prevPoint ? "▲" : "▼"}
              {Math.abs((summary.point ?? 0) - prevPoint)}
            </span>
          )}
        </div>
        {/* ◯数/分母 と 前回点数 */}
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
          ◯ {summary.ok} / {summary.maxScore}問
          {prevPoint !== null && (
            <span style={{ marginLeft: "12px", color: "#cbd5e1" }}>前回 {prevPoint}点</span>
          )}
        </div>

        {/* 内訳バッジ */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", margin: "12px 0 20px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "8px", background: "#d1fae5", color: "#059669", fontSize: "12px", fontWeight: 800 }}>
            <CheckCircle2 size={13} /> OK {summary.ok}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", fontSize: "12px", fontWeight: 800 }}>
            <XCircle size={13} /> NG {summary.ng}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", fontSize: "12px", fontWeight: 800 }}>
            <PauseCircle size={13} /> 保留 {summary.hold}
          </span>
          {summary.photoCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "8px", background: "#e0e7ff", color: "#4f46e5", fontSize: "12px", fontWeight: 800 }}>
              <Image size={13} /> 写真 {summary.photoCount}枚
            </span>
          )}
        </div>

        {/* 日付情報 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={{ background: "#fff", padding: "12px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}>
              <Calendar size={13} /> 点検日
            </div>
            <div style={{ fontWeight: 900, color: "#1e293b", fontSize: "14px" }}>{summary.inspectionDate}</div>
          </div>
          <div style={{ background: "#fff", padding: "12px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}>
              <Clock size={13} /> 改善期限
            </div>
            <div style={{ fontWeight: 900, color: "#dc2626", fontSize: "14px" }}>{summary.improvementDeadline}</div>
          </div>
        </div>
      </div>

      {/* Q/S/C 別スコア */}
      {/* スコア内訳 */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#94a3b8", marginBottom: "12px", letterSpacing: "1px" }}>
          SCORES
        </h3>

        {/* Q/S/C が揃っている場合：カテゴリ別カード＋エリア内訳 */}
        {Object.keys(normalizedCategoryScores).length > 0 && !Object.keys(normalizedCategoryScores).includes("その他") ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {uniqueSortedCategories.map((cat) => {
              const areas = categoryAreaMap.get(cat) ?? [];
              const cs = normalizedCategoryScores[cat];
              const color = cs.point >= 80 ? "#2563eb" : cs.point >= 60 ? "#d97706" : "#dc2626";
              const bg    = cs.point >= 80 ? "#eff6ff" : cs.point >= 60 ? "#fffbeb" : "#fef2f2";
              const border= cs.point >= 80 ? "#bfdbfe" : cs.point >= 60 ? "#fef3c7" : "#fee2e2";
              return (
                <div key={cat} style={{ background: "#fff", border: `1.5px solid ${border}`, borderRadius: "20px", overflow: "hidden" }}>
                  {/* カテゴリヘッダー */}
                  <div style={{ background: bg, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color, opacity: 0.8 }}>
                        {CATEGORY_LABEL[cat] ?? cat}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                        <span style={{ fontSize: "32px", fontWeight: 900, color, lineHeight: 1 }}>{cs.point}</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>点</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", textAlign: "right" }}>
                      ◯ {cs.ok}/{cs.maxScore}問
                    </div>
                  </div>
                  {/* エリア内訳 */}
                  {areas.length > 0 && (
                    <div style={{ padding: "4px 20px 12px" }}>
                      {areas.map((area, idx) => (
                        <div key={area.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: idx < areas.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>{area.title}</span>
                          <span style={{ fontSize: "13px", fontWeight: 900, color: "#1e293b" }}>
                            {area.ok}<span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>/{area.maxScore}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* category 未設定の場合：エリア一覧のみ */
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden" }}>
            {sections.map((sec, idx) => {
              const okCount = sec.items.filter((i) => i.state === "ok").length;
              const maxCount = sec.items.filter((i) => i.state !== "na").length;
              return (
                <div key={sec.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: idx < sections.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{sec.title}</span>
                  <span style={{ fontSize: "14px", fontWeight: 900, color: "#1e293b" }}>
                    {okCount}<span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>/{maxCount}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NG項目リスト */}
      {ngItems.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#dc2626", marginBottom: "12px", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={14} /> 改善が必要な項目 ({ngItems.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ngItems.map((item, idx) => (
              <div
                key={idx}
                style={{ background: "#fff", borderRadius: "16px", borderLeft: "5px solid #dc2626", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", marginBottom: "4px" }}>
                  {item.sectionTitle}{item.category ? ` · ${item.category}` : ""}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginBottom: "10px", lineHeight: 1.4 }}>
                  {item.label}
                </div>
                {item.note && (
                  <div style={{ background: "#fff1f2", padding: "10px 12px", borderRadius: "10px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <MessageSquare size={14} color="#dc2626" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div style={{ fontSize: "13px", color: "#9f1239", fontWeight: 600 }}>{item.note}</div>
                  </div>
                )}
                {item.photos && item.photos.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    {item.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url} alt="証拠写真" style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", border: "1px solid #fee2e2" }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保留項目リスト */}
      {holdItems.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#d97706", marginBottom: "12px", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
            <PauseCircle size={14} /> 保留項目 ({holdItems.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {holdItems.map((item, idx) => (
              <div
                key={idx}
                style={{ background: "#fff", borderRadius: "16px", borderLeft: "5px solid #d97706", padding: "16px" }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", marginBottom: "4px" }}>{item.sectionTitle}</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginBottom: item.holdNote ? "10px" : "0", lineHeight: 1.4 }}>
                  {item.label}
                </div>
                {item.holdNote && (
                  <div style={{ background: "#fffbeb", padding: "10px 12px", borderRadius: "10px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <MessageSquare size={14} color="#d97706" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div style={{ fontSize: "13px", color: "#92400e", fontWeight: 600 }}>{item.holdNote}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NGも保留もない場合 */}
      {ngItems.length === 0 && holdItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px", background: "#f0fdf4", borderRadius: "20px", color: "#15803d", fontWeight: 800, marginBottom: "20px" }}>
          ✨ 全項目合格です！素晴らしい！
        </div>
      )}

      {/* 署名 */}
      <div
        style={{
          background: "#1e293b",
          padding: "20px 24px",
          borderRadius: "20px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, marginBottom: "4px" }}>STORE / AUDITOR</div>
          <div style={{ fontSize: "16px", fontWeight: 900 }}>{storeName}</div>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
            <User size={13} /> {userName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, marginBottom: "4px" }}>TOTAL</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: mainColor === "#2563eb" ? "#60a5fa" : mainColor === "#d97706" ? "#fbbf24" : "#f87171" }}>
            {summary.point ?? 0}<span style={{ fontSize: "14px", fontWeight: 700, color: "#475569" }}>点</span>
          </div>
        </div>
      </div>
    </div>
  );
}