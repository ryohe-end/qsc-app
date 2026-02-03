"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { RankingType } from "@/app/(app)/lib/api/ranking";
import { fetchRanking } from "@/app/(app)/lib/api/ranking";
import { useEffect, useState } from "react";

const LABEL: Record<RankingType, string> = {
  overall: "総合",
  q: "Q",
  s: "S",
  c: "C",
};

export default function RankingPage() {
  const sp = useSearchParams();
  const type = (sp.get("type") as RankingType) || "overall";
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);

  const pageSize = 20;

  const [rows, setRows] = useState<{ storeId: string; storeName: string; score: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchRanking(type);
        if (!alive) return;
        setRows(res.rows);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [type]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / pageSize));
  }, [rows.length]);

  return (
    <main className="qsc-page qsc-mobile">
      <section className="qsc-shell" aria-label="ランキング一覧">
        <header className="qsc-top">
          <h1 className="qsc-title">ランキング（{LABEL[type]}）</h1>
          <p className="qsc-sub">上位から順に表示しています。</p>
        </header>

        <section className="qsc-panel" aria-label="ランキング">
          {err ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>取得に失敗しました: {err}</div>
          ) : (
            <ul className="qsc-rank-list">
              {paged.map((r, idx) => {
                const no = (page - 1) * pageSize + idx + 1;
                return (
                  <li key={r.storeId} className="qsc-rank-row">
                    <div className="qsc-rank-left">
                      <div className="qsc-rank-no">{no}</div>
                      <div className="qsc-rank-store">{r.storeName}</div>
                    </div>
                    <div className="qsc-rank-score">{r.score.toFixed(1)}</div>
                  </li>
                );
              })}
            </ul>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <a
              className="qsc-btn qsc-btn-secondary"
              href={`/ranking?type=${type}&page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              style={{ pointerEvents: page <= 1 ? "none" : "auto", opacity: page <= 1 ? 0.5 : 1 }}
            >
              前へ
            </a>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, alignSelf: "center" }}>
              {page} / {totalPages}
            </div>
            <a
              className="qsc-btn qsc-btn-secondary"
              href={`/ranking?type=${type}&page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              style={{
                pointerEvents: page >= totalPages ? "none" : "auto",
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              次へ
            </a>
          </div>
        </section>

        <div className="qsc-safe-bottom" aria-hidden="true" />
      </section>
    </main>
  );
}
