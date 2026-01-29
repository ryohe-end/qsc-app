"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchNewsById, type NewsItem } from "@/lib/api/news";
import { formatYMD } from "@/lib/format/date";

export default function NewsDetailPage() {
  const params = useParams<{ newsId: string }>();
  const newsId = params?.newsId;

  const [item, setItem] = useState<NewsItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!newsId) return;
        const found = await fetchNewsById(newsId);
        if (!alive) return;
        setItem(found);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [newsId]);

  return (
    <main className="qsc-page qsc-mobile">
      <section className="qsc-shell" aria-label="お知らせ詳細">
        <section className="qsc-panel" aria-label="本文">
          {err ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>取得に失敗しました: {err}</div>
          ) : !item ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>見つかりませんでした</div>
          ) : (
            <>
              <div className="qsc-news-meta">
                {formatYMD(item.updatedAt || item.startDate) && (
                  <div className="qsc-news-date">{formatYMD(item.updatedAt || item.startDate)}</div>
                )}
                {item.tag && <div className="qsc-news-tag">{item.tag}</div>}
              </div>

              <div className="qsc-news-title" style={{ fontSize: 16 }}>
                {item.title}
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.82, whiteSpace: "pre-wrap" }}>
                {item.body ?? ""}
              </div>
            </>
          )}
        </section>

        <div className="qsc-safe-bottom" aria-hidden="true" />
      </section>
    </main>
  );
}
