"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNews, type NewsItem } from "@/app/(app)/lib/api/news";
import NewsCard from "@/app/(app)/components/home/NewsCard";

export default function NewsListPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await fetchNews();
        const sorted = [...all].sort((a, b) => {
          const ta = new Date(a.updatedAt || a.startDate || 0).getTime();
          const tb = new Date(b.updatedAt || b.startDate || 0).getTime();
          return tb - ta;
        });
        if (alive) setItems(sorted);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => items, [items]);

  return (
    <main className="qsc-page qsc-mobile">
      <section className="qsc-shell" aria-label="お知らせ一覧">
        <header className="qsc-top">
          <h1 className="qsc-title">お知らせ</h1>
          <p className="qsc-sub">最新の更新・連絡事項を確認できます。</p>
        </header>

        <section className="qsc-panel" aria-label="一覧">
          {err ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>取得に失敗しました: {err}</div>
          ) : list.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>お知らせはありません</div>
          ) : (
            <div className="qsc-news-list">
              {list.map((n) => (
                <NewsCard key={n.newsId} item={n} />
              ))}
            </div>
          )}
        </section>

        <div className="qsc-safe-bottom" aria-hidden="true" />
      </section>
    </main>
  );
}
