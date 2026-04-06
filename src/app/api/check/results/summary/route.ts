import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 今日の日付を取得 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // QSC_CheckResults テーブルから本日の完了データを取得
    // ※ 運用に合わせて Query に変更することを推奨しますが、まずは Scan で動作確認
    const res = await docClient.send(new ScanCommand({
      TableName: "QSC_CheckResults",
      FilterExpression: "begins_with(updatedAt, :today)",
      ExpressionAttributeValues: {
        ":today": today,
      },
      ProjectionExpression: "storeId", // storeId だけ取れば軽量
    }));

    // 重複を除去した storeId の配列を作成
    const doneStoreIds = Array.from(new Set(res.Items?.map((item) => item.storeId) || []));

    return NextResponse.json({ doneStoreIds });
  } catch (e: any) {
    console.error("Summary API Error:", e);
    // エラー時は空配列を返して、フロントがクラッシュするのを防ぐ
    return NextResponse.json({ doneStoreIds: [] });
  }
}