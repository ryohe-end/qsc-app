import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await docClient.send(
      new ScanCommand({
        TableName: "QSC_CheckResults",
        // [修正1] 日付フィルターを削除（過去データも含めて完了済み店舗を返す）
        // [修正2] storeId が空文字のため PK（大文字）から取得する
        // [修正3] PK も DynamoDB の予約語のためエイリアス #pk が必要
        FilterExpression: "#st = :done",
        ExpressionAttributeNames: {
          "#st": "status", // status は予約語のためエイリアスが必要
          "#pk": "PK",     // PK（大文字）も予約語のためエイリアスが必要
        },
        ExpressionAttributeValues: {
          ":done": "done",
        },
        ProjectionExpression: "#pk",
      })
    );

    // PK の "STORE#S_327" → "S_327" に変換して重複除去
    const doneStoreIds = Array.from(
      new Set(
        (res.Items ?? [])
          .map((item) => String(item.PK ?? "").replace(/^STORE#/, ""))
          .filter(Boolean)
      )
    );

    return NextResponse.json({ doneStoreIds });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Summary API Error:", msg);
    // エラー時は空配列を返してフロントがクラッシュするのを防ぐ
    return NextResponse.json({ doneStoreIds: [] });
  }
}