export type NewsItem = {
  newsId: string;
  title: string;
  body?: string | null;
  updatedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tag?: string | null; // 任意（無ければ出さない）
};

function normalize(item: any): NewsItem {
  return {
    newsId: String(item?.newsId ?? item?.id ?? ""),
    title: String(item?.title ?? ""),
    body: item?.body ?? item?.content ?? null,
    updatedAt: item?.updatedAt ?? item?.updated_at ?? null,
    startDate: item?.startDate ?? item?.start_date ?? null,
    endDate: item?.endDate ?? item?.end_date ?? null,
    tag: item?.tag ?? item?.category ?? null,
  };
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch("/api/news", { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchNews failed: ${res.status}`);
  const data = await res.json();

  // 返り値が { items: [] } / [] どっちでも耐える
  const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return arr.map(normalize).filter((x) => x.newsId && x.title);
}

export async function fetchNewsById(newsId: string): Promise<NewsItem | null> {
  const all = await fetchNews();
  return all.find((n) => n.newsId === newsId) ?? null;
}
