import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_NewsTable";

export async function GET() {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
    }));

    // 日付の降順（新しい順）に並び替えて返す
    const items = (res.Items || []).sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.startDate || 0).getTime();
      const dateB = new Date(b.updatedAt || b.startDate || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(items);
  } catch (e: any) {
    console.error("Fetch News Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}