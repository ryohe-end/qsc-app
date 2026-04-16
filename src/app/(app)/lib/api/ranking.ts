export type RankingType = "overall" | "q" | "s" | "c";

export type RankRow = {
  storeId: string;
  storeName: string;
  score: number; // 例: 92.4
};

export type RankingResponse = {
  type: RankingType;
  updatedAt: string;
  rows: RankRow[];
};

// ✅ いまはモック
const MOCK: Record<RankingType, RankRow[]> = {
  overall: [
    { storeId: "S001", storeName: "JOYFIT 渋谷", score: 97.2 },
    { storeId: "S002", storeName: "JOYFIT 池袋", score: 96.5 },
    { storeId: "S003", storeName: "JOYFIT 新宿", score: 95.9 },
    { storeId: "S004", storeName: "JOYFIT 横浜", score: 95.3 },
    { storeId: "S005", storeName: "JOYFIT 大宮", score: 94.8 },
    { storeId: "S006", storeName: "JOYFIT 千葉", score: 94.2 },
  ],
  q: [
    { storeId: "S001", storeName: "JOYFIT 渋谷", score: 98.0 },
    { storeId: "S004", storeName: "JOYFIT 横浜", score: 96.1 },
    { storeId: "S003", storeName: "JOYFIT 新宿", score: 95.0 },
    { storeId: "S002", storeName: "JOYFIT 池袋", score: 94.4 },
    { storeId: "S005", storeName: "JOYFIT 大宮", score: 93.8 },
    { storeId: "S006", storeName: "JOYFIT 千葉", score: 92.9 },
  ],
  s: [
    { storeId: "S002", storeName: "JOYFIT 池袋", score: 97.0 },
    { storeId: "S001", storeName: "JOYFIT 渋谷", score: 96.2 },
    { storeId: "S005", storeName: "JOYFIT 大宮", score: 95.5 },
    { storeId: "S003", storeName: "JOYFIT 新宿", score: 94.1 },
    { storeId: "S004", storeName: "JOYFIT 横浜", score: 93.6 },
    { storeId: "S006", storeName: "JOYFIT 千葉", score: 93.0 },
  ],
  c: [
    { storeId: "S004", storeName: "JOYFIT 横浜", score: 97.8 },
    { storeId: "S003", storeName: "JOYFIT 新宿", score: 96.0 },
    { storeId: "S001", storeName: "JOYFIT 渋谷", score: 95.1 },
    { storeId: "S006", storeName: "JOYFIT 千葉", score: 94.7 },
    { storeId: "S002", storeName: "JOYFIT 池袋", score: 94.0 },
    { storeId: "S005", storeName: "JOYFIT 大宮", score: 93.2 },
  ],
};

export async function fetchRanking(type: RankingType): Promise<RankingResponse> {
  const res = await fetch(`/api/ranking`, { cache: "no-store" });
  if (!res.ok) throw new Error("ランキング取得に失敗しました");
  const data = await res.json();

  const rankingKey = type === "overall" ? "overall" : type;
  const items: { storeId: string; storeName: string; totalScore?: number; q_score?: number | null; s_score?: number | null; c_score?: number | null }[] =
    data.rankings?.[rankingKey] ?? [];

  const scoreKey = type === "overall" ? "totalScore"
    : type === "q" ? "q_score"
    : type === "s" ? "s_score"
    : "c_score";

  const rows: RankRow[] = items
    .map(item => ({
      storeId: item.storeId,
      storeName: item.storeName,
      score: Number(item[scoreKey] ?? 0),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    type,
    updatedAt: new Date().toISOString(),
    rows,
  };
}
