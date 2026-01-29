// src/lib/api/news.ts
export type NewsItem = {
  newsId: string;
  title: string;
  body?: string | null;
  updatedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  viewScope?: "all" | "direct" | "fc" | string; // 使ってなければ無視でOK
};

/** =========================
 * Utils
 * ========================= */

/** 相対/絶対どっちでもOKな URL を作る（SSR/CSR 両対応） */
function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;

  // SSR で絶対URLが必要な場合に備えて env を優先
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  if (base) return `${base.replace(/\/$/, "")}${p}`;

  // base が無ければ相対で（ブラウザならOK）
  return p;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** data が [] or {items: []} どっちでも配列に寄せる */
function toArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  if (isRecord(data) && Array.isArray((data as Record<string, unknown>).items)) {
    return (data as Record<string, unknown>).items as unknown[];
  }

  return [];
}

/** unknown を NewsItem に正規化（落ちないように安全に） */
function normalize(raw: unknown): NewsItem {
  const obj: Record<string, unknown> = isRecord(raw) ? raw : {};

  const newsId =
    typeof obj.newsId === "string"
      ? obj.newsId
      : typeof obj.id === "string"
      ? obj.id
      : typeof obj.news_id === "string"
      ? obj.news_id
      : "";

  const title =
    typeof obj.title === "string"
      ? obj.title
      : typeof obj.name === "string"
      ? obj.name
      : "";

  const body =
    typeof obj.body === "string"
      ? obj.body
      : obj.body == null
      ? null
      : String(obj.body);

  const updatedAt =
    typeof obj.updatedAt === "string"
      ? obj.updatedAt
      : typeof obj.updated_at === "string"
      ? obj.updated_at
      : null;

  const startDate =
    typeof obj.startDate === "string"
      ? obj.startDate
      : typeof obj.start_date === "string"
      ? obj.start_date
      : null;

  const endDate =
    typeof obj.endDate === "string"
      ? obj.endDate
      : typeof obj.end_date === "string"
      ? obj.end_date
      : null;

  const viewScope =
    typeof obj.viewScope === "string"
      ? obj.viewScope
      : typeof obj.view_scope === "string"
      ? obj.view_scope
      : undefined;

  return {
    newsId,
    title,
    body,
    updatedAt,
    startDate,
    endDate,
    viewScope,
  };
}

/** =========================
 * API
 * ========================= */

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(apiUrl("/api/news"), {
    method: "GET",
    // Next App Router: SSRでキャッシュしたくない場合
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // ここは運用に合わせて握りつぶしてOK
    throw new Error(`fetchNews failed: ${res.status} ${res.statusText}`);
  }

  const data: unknown = await res.json().catch(() => []);
  const arr = toArray(data);

  // ✅ strict 対応：x を NewsItem として扱う
  return arr
    .map(normalize)
    .filter((x: NewsItem) => !!(x.newsId && x.title));
}

export async function fetchNewsById(newsId: string): Promise<NewsItem | null> {
  if (!newsId) return null;

  const res = await fetch(apiUrl(`/api/news/${encodeURIComponent(newsId)}`), {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`fetchNewsById failed: ${res.status} ${res.statusText}`);
  }

  const data: unknown = await res.json().catch(() => null);
  if (!data) return null;

  const item = normalize(data);
  return item.newsId ? item : null;
}
