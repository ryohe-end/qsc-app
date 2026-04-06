import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";
const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "QSC_CheckResults";

export async function GET() {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
    }));

    const items = res.Items || [];

    // スコアが高い順に並び替え
    // ※テーブルの項目名が totalScore, q_score 等であることを想定
    const getTop5 = (list: any[], key: string) => 
      [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 5);

    return NextResponse.json({
      all: items,
      rankings: {
        overall: getTop5(items, 'totalScore'),
        q: getTop5(items, 'q_score'),
        s: getTop5(items, 's_score'),
        c: getTop5(items, 'c_score'),
      }
    });
  } catch (e: any) {
    console.error("Ranking API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}