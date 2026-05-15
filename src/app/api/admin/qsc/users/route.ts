import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { sendWelcomeEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function GET() {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: { ":sk": "METADATA" },
    }));
    const items = (res.Items ?? []).map(item => ({
      userId: item.userId || item.email,
      name: item.name || "",
      email: item.email || "",
      role: item.role || "store",
      corpId: item.corpId || "",
      status: item.status || "invited",
      assignedStoreIds: item.assignedStoreIds || [],
      lastLogin: item.lastLogin,
      createdAt: item.createdAt || "",
      updatedAt: item.updatedAt || "",
    }));
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sendWelcomeEmail: shouldSendEmail, ...userData } = body;

    if (!userData.email || !userData.name) {
      return NextResponse.json({ error: "email と name は必須です" }, { status: 400 });
    }
    if (!userData.password) {
      return NextResponse.json({ error: "password は必須です" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const item = {
      email: userData.email.toLowerCase(),
      SK: "METADATA",
      userId: userData.userId,
      name: userData.name,
      password: userData.password,
      role: userData.role || "store",
      corpId: userData.corpId || "",
      status: "invited",
      assignedStoreIds: userData.assignedStoreIds || [],
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    if (shouldSendEmail) {
      try {
        await sendWelcomeEmail({
          to: userData.email,
          name: userData.name,
          email: userData.email,
          password: userData.password,
        });
      } catch (mailErr) {
        console.error("メール送信失敗:", mailErr);
        return NextResponse.json({ ok: true, item, mailError: "メール送信に失敗しました" });
      }
    }

    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Users POST Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sendWelcomeEmail: _unused, ...userData } = body;

    if (!userData.email) {
      return NextResponse.json({ error: "email は必須です" }, { status: 400 });
    }

    const lowerEmail = userData.email.toLowerCase();

    // ✅ 既存レコードを取得してpasswordなど重要フィールドを保持
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: lowerEmail, SK: "METADATA" },
    }));

    const existingItem = existing.Item || {};
    const now = new Date().toISOString();

    const item: Record<string, unknown> = {
      ...existingItem, // 既存データを全部引き継ぐ（passwordを含む）
      email: lowerEmail,
      SK: "METADATA",
      userId: userData.userId || existingItem.userId,
      name: userData.name,
      role: userData.role || "store",
      corpId: userData.corpId || "",
      status: userData.status || "active",
      assignedStoreIds: userData.assignedStoreIds || [],
      updatedAt: now,
      createdAt: userData.createdAt || existingItem.createdAt || now,
    };

    // パスワードが明示的に送られてきた場合のみ上書き
    if (userData.password) {
      item.password = userData.password;
    }

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Users PUT Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId は必須です" }, { status: 400 });

    const scan = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "userId = :uid AND SK = :sk",
      ExpressionAttributeValues: { ":uid": userId, ":sk": "METADATA" },
    }));

    const target = scan.Items?.[0];
    if (!target) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { email: target.email, SK: "METADATA" },
    }));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
