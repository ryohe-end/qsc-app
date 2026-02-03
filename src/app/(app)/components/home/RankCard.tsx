"use client";

import Link from "next/link";
import type { RankRow, RankingType } from "@/app/(app)/lib/api/ranking";

const LABEL: Record<RankingType, string> = {
  overall: "総合",
  q: "Q",
  s: "S",
  c: "C",
};

export default function RankCard({
  type,
  rows,
}: {
  type: RankingType;
  rows: RankRow[];
}) {
  const top5 = rows.slice(0, 5);

  return (
    <div className="qsc-rank-card" role="listitem" aria-label={`${LABEL[type]}ランキング`}>
      <div className="qsc-rank-head">
        <div className="qsc-rank-title">
          ランキング <span className="qsc-rank-sub">{LABEL[type]}</span>
        </div>
        <Link className="qsc-rank-more" href={`/ranking?type=${type}&page=1`}>
          もっと見る
        </Link>
      </div>

      <ul className="qsc-rank-list">
        {top5.map((r, idx) => (
          <li key={r.storeId} className="qsc-rank-row">
            <div className="qsc-rank-left">
              <div className="qsc-rank-no">{idx + 1}</div>
              <div className="qsc-rank-store">{r.storeName}</div>
            </div>
            <div className="qsc-rank-score">{r.score.toFixed(1)}</div>
          </li>
        ))}
      </ul>

      <div className="qsc-rank-foot">
        <div className="qsc-rank-footnote">※ 上位5店舗のみ表示</div>
      </div>
    </div>
  );
}
