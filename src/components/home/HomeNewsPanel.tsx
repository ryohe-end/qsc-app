// src/components/home/HomeNewsPanel.tsx
import Link from "next/link";

type News = {
  newsId: string;
  title: string;
  body?: string;
  updatedAt?: string;
};

export default async function HomeNewsPanel() {
  // TODO: 後で /api/news に差し替え
  const news: News[] = [
    {
      newsId: "1",
      title: "QSC点検ルール更新のお知らせ",
      body: "一部項目の判定基準が変更されました。",
      updatedAt: "2026-01-25",
    },
    {
      newsId: "2",
      title: "2月の重点確認項目について",
      body: "Cleanliness項目を重点的に確認してください。",
      updatedAt: "2026-01-22",
    },
    {
      newsId: "3",
      title: "システムメンテナンス予定",
      body: "2/5 02:00-04:00 に実施予定です。",
      updatedAt: "2026-01-20",
    },
  ];

  return (
    <section className="qsc-panel" aria-labelledby="home-news-title">
      <div className="qsc-panel-head">
        <h2 id="home-news-title" className="qsc-panel-title">
          お知らせ
        </h2>
        <Link href="/news" className="qsc-panel-link">
          すべて見る
        </Link>
      </div>

      <div className="qsc-news-list">
        {news.slice(0, 3).map((n) => (
          <div key={n.newsId} className="qsc-news">
            <div className="qsc-news-meta">
              <span className="qsc-news-date">{n.updatedAt}</span>
            </div>
            <div className="qsc-news-title">{n.title}</div>
            {n.body && <div className="qsc-news-body">{n.body}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
