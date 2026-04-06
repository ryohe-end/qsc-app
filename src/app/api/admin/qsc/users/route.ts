import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

/**
 * データをフロントエンド用の型に整える共通関数
 */
function toUserRow(item: any) {
  const id = item.userId || item.PK?.replace("USER#", "") || "";
  return {
    userId: String(id),
    name: item.name || "名称未設定",
    email: item.email || "",
    role: item.role || "inspector",
    corpId: item.corpId || "",
    status: item.status || "invited",
    clubCodes: Array.isArray(item.clubCodes) ? item.clubCodes : [],
    lastLogin: item.lastLogin || null,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

/** =========================
 * GET: ユーザー一覧取得
 * ========================= */
export async function GET() {
  try {
    const res = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(PK, :prefix)",
        ExpressionAttributeValues: { ":prefix": "USER#" },
      })
    );
    const items = (res.Items || []).map(toUserRow);
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** =========================
 * POST / PUT 共通保存処理
 * ========================= */
async function handleSave(req: NextRequest, isUpdate: boolean) {
  try {
    const body = await req.json();
    const userId = body.userId;
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const now = new Date().toISOString();

    // 【最重要】SK を "METADATA" に固定することで既存レコードを確実に上書き
    const item = {
      ...body,
      PK: `USER#${userId}`,
      SK: "METADATA", 
      userId: userId,
      updatedAt: now,
      ...(isUpdate ? {} : { createdAt: now }) // 新規のみ createdAt を追加
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return NextResponse.json({ ok: true, item: toUserRow(item) });
  } catch (e: any) {
    console.error("Save Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return handleSave(req, false); }
export async function PUT(req: NextRequest) { return handleSave(req, true); }

/** =========================
 * DELETE: 削除
 * ========================= */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: "METADATA", // 削除時も METADATA を指定
      },
    }));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}