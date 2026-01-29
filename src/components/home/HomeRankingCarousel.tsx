// src/components/home/HomeRankingCarousel.tsx
import Link from "next/link";

type Rank = {
  store: string;
  score: number;
};

const RANKING_TYPES = [
  { key: "total", label: "総合" },
  { key: "q", label: "Q" },
  { key: "s", label: "S" },
  { key: "c", label: "C" },
];

const dummyRanks: Rank[] = [
  { store: "新宿店", score: 98 },
  { store: "渋谷店", score: 96 },
  { store: "池袋店", score: 95 },
  { store: "横浜店", score: 94 },
  { store: "大宮店", score: 93 },
];

export default function HomeRankingCarousel() {
  return (
    <section className="qsc-panel" aria-labelledby="home-ranking-title">
      <div className="qsc-panel-head">
        <h2 id="home-ranking-title" className="qsc-panel-title">
          ランキング
        </h2>
        <span className="qsc-swipehint">横にスワイプ</span>
      </div>

      <div className="qsc-rank-carousel">
        <div className="qsc-rank-carousel-inner">
          {RANKING_TYPES.map((t) => (
            <div key={t.key} className="qsc-rank-card">
              <div className="qsc-rank-head">
                <div className="qsc-rank-title">
                  {t.label}
                  <span className="qsc-rank-sub">TOP5</span>
                </div>
                <Link
                  href={`/ranking?type=${t.key}`}
                  className="qsc-rank-more"
                >
                  詳細
                </Link>
              </div>

              <ul className="qsc-rank-list">
                {dummyRanks.map((r, i) => (
                  <li key={r.store} className="qsc-rank-row">
                    <div className="qsc-rank-left">
                      <span className="qsc-rank-no">{i + 1}</span>
                      <span className="qsc-rank-store">{r.store}</span>
                    </div>
                    <span className="qsc-rank-score">{r.score}</span>
                  </li>
                ))}
              </ul>

              <div className="qsc-rank-foot">
                <span className="qsc-rank-footnote">
                  ※ 仮データ
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
