import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { sendWelcomeEmail } from "@/app/lib/sendgrid";
import { requireAdmin } from "@/app/lib/admin-auth";
import { hashPassword } from "@/app/lib/password";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: { ":sk": "METADATA" },
    }));
    let items = (res.Items ?? []).map(item => ({
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

    if (q) {
      const lower = q.toLowerCase();
      items = items.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
      );
      items.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      return NextResponse.json({ items: items.slice(0, 50) });
    }

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
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
    const plainPassword = String(userData.password);
    const hashedPassword = await hashPassword(plainPassword);
    const item = {
      email: userData.email.toLowerCase(),
      SK: "METADATA",
      userId: userData.userId,
      name: userData.name,
      password: hashedPassword,
      role: userData.role || "store",
      corpId: userData.corpId || "",
      status: "invited",
      assignedStoreIds: userData.assignedStoreIds || [],
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // ③ 新規作成時にウェルカムメール送信
    if (shouldSendEmail) {
      try {
        await sendWelcomeEmail({
          to: userData.email,
          name: userData.name,
          email: userData.email,
          password: plainPassword, // メールには平文を送る
        });
      } catch (mailErr) {
        console.error("メール送信失敗:", mailErr);
        // メール失敗してもユーザー作成は成功とする
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
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    const { sendWelcomeEmail: _unused, ...userData } = body;

    if (!userData.email) {
      return NextResponse.json({ error: "email は必須です" }, { status: 400 });
    }

    const email = String(userData.email).toLowerCase();
    const now = new Date().toISOString();

    // 既存レコードを取得して password などの保持必須項目を温存（PutCommandは全置換のため）
    let existingPassword: string | undefined;
    let existingCreatedAt: string | undefined;
    try {
      const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { email, SK: "METADATA" },
      }));
      existingPassword = existing.Item?.password as string | undefined;
      existingCreatedAt = existing.Item?.createdAt as string | undefined;
    } catch {}

    const item: Record<string, unknown> = {
      email,
      SK: "METADATA",
      userId: userData.userId,
      name: userData.name,
      role: userData.role || "store",
      corpId: userData.corpId || "",
      status: userData.status || "active",
      assignedStoreIds: userData.assignedStoreIds || [],
      updatedAt: now,
      createdAt: existingCreatedAt || userData.createdAt || now,
    };

    // パスワードが送られてきた場合はハッシュ化して更新、なければ既存値を維持
    if (userData.password) {
      item.password = await hashPassword(String(userData.password));
    } else if (existingPassword !== undefined) {
      item.password = existingPassword;
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
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId は必須です" }, { status: 400 });

    // userId からメールアドレスを検索
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
