import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// DynamoDB設定
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

    // 1. DynamoDBからユーザー取得 (画像に基づき PK は email)
    const res = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          email: lowerEmail,
          SK: "METADATA",
        },
      })
    );

    const user = res.Item;

    // 2. 認証チェック
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // 3. アカウント停止チェック
    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "このアカウントは現在利用停止されています" },
        { status: 403 }
      );
    }

    // 4. クッキーへの保存 (ここが名前表示の鍵！)
    const cookieStore = await cookies();
    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24; // 7日 or 1日

    // 認証フラグ
    cookieStore.set("qsc_authed", "1", {
      path: "/",
      maxAge,
      httpOnly: false, // フロント側で読み取るため false
      sameSite: "lax",
    });

    // ✅ 名前をクッキーに保存（HomePageの session.name に反映されます）
    cookieStore.set("qsc_user_name", user.name || "担当者", {
      path: "/",
      maxAge,
      httpOnly: false,
    });

    // ロールとIDも保存
    cookieStore.set("qsc_user_role", user.role || "store", {
      path: "/",
      maxAge,
      httpOnly: false,
    });

    cookieStore.set("qsc_user_id", user.storeId || lowerEmail, {
      path: "/",
      maxAge,
      httpOnly: false,
    });

    return NextResponse.json({
      ok: true,
      user: {
        name: user.name,
        role: user.role,
      },
    });

  } catch (e: any) {
    console.error("Login API Error:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}