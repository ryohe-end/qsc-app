import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_CheckResults";
const GSI_NAME = "BySubmittedAt";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const userName = url.searchParams.get("userName"); // 検査員フィルタ用
    const limit = Number(url.searchParams.get("limit") ?? "200");

    // GSIでtype="CHECK_RESULT"の全レコードを日付降順で取得
    let lastKey: Record<string, unknown> | undefined = undefined;
    const allItems: Record<string, unknown>[] = [];

    do {
      const res = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI_NAME,
        KeyConditionExpression: "#t = :t",
        ExpressionAttributeNames: { "#t": "type" },
        ExpressionAttributeValues: { ":t": "CHECK_RESULT" },
        ScanIndexForward: false, // 降順（新しい順）
        Limit: limit,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }));

      allItems.push(...(res.Items ?? []));
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;

      // limitに達したら終了
      if (allItems.length >= limit) break;
    } while (lastKey);

    // 必要なフィールドだけ返す（sectionsは含めない → 軽量化）
    const items = allItems.slice(0, limit).map(item => ({
      resultId: item.resultId,
      storeId: item.storeId,
      storeName: item.storeName,
      submittedAt: item.submittedAt,
      userName: item.userName,
      summary: item.summary ? {
        point: (item.summary as Record<string, unknown>).point,
        ok: (item.summary as Record<string, unknown>).ok,
        ng: (item.summary as Record<string, unknown>).ng,
        hold: (item.summary as Record<string, unknown>).hold,
        inspectionDate: (item.summary as Record<string, unknown>).inspectionDate,
        categoryScores: (item.summary as Record<string, unknown>).categoryScores,
      } : undefined,
    }));

    // userName フィルタ（検査員用）
    const filtered = userName
      ? items.filter(i => i.userName === userName)
      : items;

    return NextResponse.json({ items: filtered, count: filtered.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("all-history API error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
