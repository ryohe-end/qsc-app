// src/app/api/auth/google/route.ts
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const oauthClient = new OAuth2Client(clientId);

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));
const TABLE_NAME = "QSC_UserTable";

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    if (!clientId) {
      return NextResponse.json({ error: "Server misconfig: missing clientId" }, { status: 500 });
    }

    // ✅ Googleトークン検証
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const email = payload.email || "";
    if (!email || payload.email_verified !== true) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 });
    }

    // ✅ DynamoDBでユーザー照合
    const res = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase(), SK: "METADATA" },
    }));

    const user = res.Item;
    if (!user) {
      return NextResponse.json(
        { error: "このGoogleアカウントはシステムに登録されていません" },
        { status: 403 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "このアカウントは現在利用停止されています" },
        { status: 403 }
      );
    }

    // ✅ クッキー設定（一般ログインと同じ）
    const cookieStore = await cookies();
    const maxAge = 60 * 60 * 24; // 1日

    const opts = { path: "/", maxAge, httpOnly: false, sameSite: "lax" as const };

    cookieStore.set("qsc_authed", "1", opts);
    cookieStore.set("qsc_role", user.role || "inspector", opts);
    cookieStore.set("qsc_user_name", encodeURIComponent(user.name || payload.name || "担当者"), opts);
    cookieStore.set("qsc_user_role", user.role || "inspector", opts);
    cookieStore.set("qsc_user_id", email, opts);
    if (user.storeId) {
      cookieStore.set("qsc_store_id", user.storeId, opts);
    }

    return NextResponse.json({
      ok: true,
      user: {
        email,
        name: user.name,
        role: user.role,
        storeId: user.storeId || "",
      },
    });

  } catch (e: unknown) {
    console.error("[google-auth] error:", e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
