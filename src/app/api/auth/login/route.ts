import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function POST(req: NextRequest) {
  try {
    const { email, password, remember } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    const lowerEmail = email.toLowerCase();

    const res = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { email: lowerEmail, SK: "METADATA" },
      })
    );

    const user = res.Item;

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "このアカウントは現在利用停止されています" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24;

    const opts = {
      path: "/",
      maxAge,
      httpOnly: false,
      sameSite: "lax" as const,
    };

    // ✅ middleware が見る qsc_authed と qsc_role を両方設定
    cookieStore.set("qsc_authed", "1", opts);
    cookieStore.set("qsc_role", user.role || "inspector", opts);
    cookieStore.set("qsc_user_name", encodeURIComponent(user.name || "担当者"), opts);
    cookieStore.set("qsc_user_role", user.role || "inspector", opts);
    cookieStore.set("qsc_user_id", user.storeId || lowerEmail, opts);

    return NextResponse.json({
      ok: true,
      user: { name: user.name, role: user.role },
    });

  } catch (e: unknown) {
    console.error("Login API Error:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}