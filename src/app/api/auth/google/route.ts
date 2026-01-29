// src/app/api/auth/google/route.ts
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (!clientId) {
  console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing on server.");
}

const oauthClient = new OAuth2Client(clientId);

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    if (!clientId) {
      return NextResponse.json({ error: "Server misconfig: missing clientId" }, { status: 500 });
    }

    // ✅ 検証（audience一致・署名・期限など）
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    // ここから先はあなたの「許可ユーザー判定」に合わせて
    const email = payload.email || "";
    const name = payload.name || "";
    const sub = payload.sub; // Googleのユーザー一意ID

    // 例：メールが無い/未検証ならNGにする
    if (!email || payload.email_verified !== true) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 });
    }

    // TODO: ここでDynamoDB等に照合して「社内ユーザーのみ許可」など
    // 例：許可ドメイン制限したいなら
    // if (!email.endsWith("@yourcompany.co.jp")) { ... }

    // ✅ いったん最小：成功レスポンス
    // （本番はここで httpOnly cookie セッション発行推奨）
    return NextResponse.json({
      ok: true,
      user: { sub, email, name },
    });
  } catch (e: any) {
    console.error("[google-auth] error:", e?.message || e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
