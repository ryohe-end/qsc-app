import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const MASTER_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

/* ========================= GET: 自分が managers に入っている店舗一覧 ========================= */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get("qsc_user_id")?.value ?? "");

    if (!userEmail) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const email = userEmail.toLowerCase();

    // QSC_MasterTable をスキャンして managers に自分のメールが含まれる店舗を取得
    const res = await docClient.send(new ScanCommand({
      TableName: MASTER_TABLE,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: { ":sk": "METADATA" },
      ProjectionExpression: "PK, storeId, #n, brandName, bizName, areaId, areaName, managers",
      ExpressionAttributeNames: { "#n": "name" },
    }));

    const items = (res.Items ?? []).filter(item => {
      const managers: { email: string }[] = item.managers ?? [];
      return managers.some(m => m.email?.toLowerCase() === email);
    }).map(item => ({
      storeId: item.storeId || String(item.PK ?? "").replace(/^STORE#/, ""),
      name: item.name ?? "",
      brandName: item.brandName ?? "",
      bizName: item.bizName ?? "",
      areaId: item.areaId ?? "",
      areaName: item.areaName ?? "",
    }));

    return NextResponse.json({ items });
  } catch (e: unknown) {
    console.error("[GET /api/user/areas]", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
