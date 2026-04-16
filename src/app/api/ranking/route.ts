import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_CheckResults";

// 全角→半角正規化
function normalizeCategory(cat: string): string {
  return cat.normalize("NFKC").trim().toUpperCase();
}

// クォーターの開始・終了日を返す
function getQuarterRange(quarter: number, fiscalYear: number): { start: string; end: string } {
  // Q1: 4〜6月, Q2: 7〜9月, Q3: 10〜12月, Q4: 翌年1〜3月
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${fiscalYear}-04-01`,     end: `${fiscalYear}-06-30` },
    2: { start: `${fiscalYear}-07-01`,     end: `${fiscalYear}-09-30` },
    3: { start: `${fiscalYear}-10-01`,     end: `${fiscalYear}-12-31` },
    4: { start: `${fiscalYear + 1}-01-01`, end: `${fiscalYear + 1}-03-31` },
  };
  return ranges[quarter] ?? ranges[1];
}

// 現在のクォーターと年度を返す
function getCurrentQuarter(): { quarter: number; fiscalYear: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 4 && month <= 6)  return { quarter: 1, fiscalYear: year };
  if (month >= 7 && month <= 9)  return { quarter: 2, fiscalYear: year };
  if (month >= 10 && month <= 12) return { quarter: 3, fiscalYear: year };
  return { quarter: 4, fiscalYear: year - 1 }; // 1〜3月はQ4（前年度）
}

// categoryScores から正規化して Q/S/C の point を再計算
function calcCategoryScores(
  categoryScores: Record<string, { ok: number | string; maxScore: number | string }>
): { q: number | null; s: number | null; c: number | null } {
  // 全角半角を正規化して ok / maxScore を合算
  const merged: Record<string, { ok: number; maxScore: number }> = {};
  for (const [key, val] of Object.entries(categoryScores)) {
    const nk = normalizeCategory(key);
    if (!merged[nk]) merged[nk] = { ok: 0, maxScore: 0 };
    merged[nk].ok += Number(val.ok ?? 0);
    merged[nk].maxScore += Number(val.maxScore ?? 0);
  }

  const calc = (cat: string): number | null => {
    const v = merged[cat];
    if (!v || v.maxScore === 0) return null;
    return Math.floor((v.ok / v.maxScore) * 100);
  };

  return { q: calc("Q"), s: calc("S"), c: calc("C") };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // クォーターと年度をクエリパラメータから取得（なければ現在）
    const { quarter: currentQ, fiscalYear: currentFY } = getCurrentQuarter();
    const quarter = Number(searchParams.get("quarter") ?? currentQ);
    const fiscalYear = Number(searchParams.get("fiscalYear") ?? currentFY);
    const { start, end } = getQuarterRange(quarter, fiscalYear);

    // DynamoDB から done のデータを全件取得
    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#t = :type AND #st = :done AND (attribute_not_exists(checkType) OR checkType <> :self)",
      ExpressionAttributeNames: { "#t": "type", "#st": "status" },
      ExpressionAttributeValues: { ":type": "CHECK_RESULT", ":done": "done", ":self": "self" },
    }));

    const items = res.Items ?? [];

    // クォーター内のデータに絞り込み（inspectionDate で判定）
    const inQuarter = items.filter((item) => {
      const date = String(item.summary?.inspectionDate ?? item.createdAt ?? "").slice(0, 10);
      return date >= start && date <= end;
    });

    // ランキング用データに変換
    const rows = inQuarter.map((item) => {
      const summary = item.summary ?? {};
      const categoryScores = summary.categoryScores ?? {};
      const { q, s, c } = calcCategoryScores(categoryScores);

      return {
        storeId: String(item.PK ?? "").replace(/^STORE#/, ""),
        storeName: String(item.storeName ?? ""),
        userName: String(item.userName ?? ""),
        totalScore: Number(summary.point ?? 0),
        q_score: q,
        s_score: s,
        c_score: c,
        inspectionDate: String(summary.inspectionDate ?? ""),
        submittedAt: String(item.submittedAt ?? item.createdAt ?? ""),
      };
    });

    // TOP10（同じ店舗の複数回分も含む、クォーター内の全結果から）
    const getTop10 = (key: keyof typeof rows[number]) =>
      [...rows]
        .filter((r) => r[key] !== null && r[key] !== undefined)
        .sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))
        .slice(0, 10);

    return NextResponse.json({
      quarter,
      fiscalYear,
      quarterRange: { start, end },
      all: rows,
      rankings: {
        overall: getTop10("totalScore"),
        q: getTop10("q_score"),
        s: getTop10("s_score"),
        c: getTop10("c_score"),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Ranking API Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

