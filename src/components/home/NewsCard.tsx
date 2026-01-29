"use client";

import Link from "next/link";
import type { NewsItem } from "@/lib/api/news";
import { formatYMD } from "@/lib/format/date";

export default function NewsCard({ item }: { item: NewsItem }) {
  const date = formatYMD(item.updatedAt || item.startDate);

  return (
    <Link href={`/news/${item.newsId}`} className="qsc-news" style={{ textDecoration: "none" }}>
      <div className="qsc-news-meta">
        {date && <div className="qsc-news-date">{date}</div>}
        {item.tag && <div className="qsc-news-tag">{item.tag}</div>}
      </div>

      <div className="qsc-news-title">{item.title}</div>

      {item.body && (
        <div className="qsc-news-body">
          {String(item.body).slice(0, 80)}
          {String(item.body).length > 80 ? "…" : ""}
        </div>
      )}
    </Link>
  );
}
