import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { sendCompletionEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const RESULT_TABLE = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const MASTER_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (role !== "admin" && role !== "inspector") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { pk, sk } = await req.json();
    if (!pk || !sk) {
      return NextResponse.json({ error: "pk と sk は必須です" }, { status: 400 });
    }

    // 点検結果を取得
    const res = await docClient.send(new GetCommand({
      TableName: RESULT_TABLE,
      Key: { PK: pk, SK: sk },
    }));

    const item = res.Item;
    if (!item) return NextResponse.json({ error: "結果が見つかりません" }, { status: 404 });

    // 店舗の連絡先を取得
    const storeId = String(item.storeId || "");
    const masterRes = await docClient.send(new GetCommand({
      TableName: MASTER_TABLE,
      Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
    }));

    const store = masterRes.Item;
    const emails: string[] = Array.isArray(store?.emails) ? store.emails : store?.email ? [store.email] : [];
    const managerEmails: string[] = Array.isArray(store?.managers)
      ? store.managers.map((m: Record<string, unknown>) => typeof m.email === "string" ? m.email : "").filter(Boolean)
      : [];
    const allTo = [...new Set([...emails, ...managerEmails])].filter(Boolean);

    if (allTo.length === 0) {
      return NextResponse.json({ error: "送信先メールアドレスが設定されていません" }, { status: 400 });
    }

    const summary = item.summary || {};
    await sendCompletionEmail({
      to: allTo,
      storeName: String(item.storeName || storeId),
      userName: String(item.userName || "担当者"),
      inspectionDate: String(summary.inspectionDate || ""),
      improvementDeadline: String(summary.improvementDeadline || ""),
      summary: {
        ok: Number(summary.ok || 0),
        ng: Number(summary.ng || 0),
        hold: Number(summary.hold || 0),
        na: Number(summary.na || 0),
        unset: Number(summary.unset || 0),
        maxScore: Number(summary.maxScore || 0),
        point: Number(summary.point || 0),
        photoCount: Number(summary.photoCount || 0),
        categoryScores: summary.categoryScores || {},
      },
    });

    return NextResponse.json({ ok: true, sentTo: allTo });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
