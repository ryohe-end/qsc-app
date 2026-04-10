import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("qsc_user_id")?.value ?? "";
    if (!userEmail) return NextResponse.json({ error: "未ログインです" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "現在のパスワードと新しいパスワードを入力してください" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新しいパスワードは6文字以上で設定してください" }, { status: 400 });
    }

    // 現在のパスワードを確認
    const res = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: userEmail.toLowerCase(), SK: "METADATA" },
    }));
    const user = res.Item;
    if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    if (user.password !== currentPassword) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 401 });
    }

    // パスワード更新
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { email: userEmail.toLowerCase(), SK: "METADATA" },
      UpdateExpression: "SET password = :p, updatedAt = :u",
      ExpressionAttributeValues: { ":p": newPassword, ":u": new Date().toISOString() },
    }));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}