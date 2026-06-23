import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { sendDeadlineReminderEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTable = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const masterTable = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

// 秘密キーで保護（環境変数 CRON_SECRET を必須）
const CRON_SECRET = process.env.CRON_SECRET || "";

async function runReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3日後の日付
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split("T")[0];

    // 全点検結果をスキャン
    const res = await docClient.send(new ScanCommand({
      TableName: resultTable,
      FilterExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "CHECK_RESULT" },
    }));

    const results = res.Items ?? [];
    const errors: string[] = [];

    // 対象（期限が3日後 + NG件数>0）だけに絞り込む
    type Target = { storeId: string; storeName: string; ngCount: number };
    const targets: Target[] = [];
    for (const result of results) {
      const deadline = result.summary?.improvementDeadline;
      if (!deadline || deadline !== threeDaysStr) continue;

      const sections = Array.isArray(result.sections) ? result.sections : [];
      let ngCount = 0;
      for (const sec of sections) {
        for (const item of (sec.items ?? [])) {
          if (item.state === "ng" && item.correctionStatus !== "approved") {
            ngCount++;
          }
        }
      }
      if (ngCount === 0) continue;

      const storeId = String(result.storeId || "").replace(/^STORE#/, "");
      targets.push({ storeId, storeName: String(result.storeName || storeId), ngCount });
    }

    // 各店舗の処理を並列化（GetCommand + Promise.all のメール送信）
    const perStoreResults = await Promise.allSettled(targets.map(async (t) => {
      const storeRes = await docClient.send(new GetCommand({
        TableName: masterTable,
        Key: { PK: `STORE#${t.storeId}`, SK: "METADATA" },
      }));
      const store = storeRes.Item;
      if (!store) return { sent: false };

      const emails: string[] = Array.isArray(store.emails) && store.emails.length > 0
        ? store.emails : store.email ? [store.email] : [];
      const managerEmails: string[] = Array.isArray(store.managers)
        ? store.managers.map((m: Record<string, unknown>) => String(m.email || "")).filter(Boolean)
        : [];
      const allTo = [...new Set([...emails, ...managerEmails])].filter(Boolean);
      if (allTo.length === 0) return { sent: false };

      await Promise.all(allTo.map(to =>
        sendDeadlineReminderEmail({
          to,
          storeName: t.storeName,
          deadline: threeDaysStr,
          ngCount: t.ngCount,
        })
      ));
      return { sent: true };
    }));

    let sentCount = 0;
    perStoreResults.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        if (r.value.sent) sentCount++;
      } else {
        const storeId = targets[idx]?.storeId ?? "?";
        errors.push(`${storeId}: ${r.reason instanceof Error ? r.reason.message : "error"}`);
      }
    });

    return NextResponse.json({
      ok: true,
      date: threeDaysStr,
      sentCount,
      errors,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: EventBridge/Lambda 等の自動実行用（?secret=... または x-cron-secret ヘッダ）
export async function GET(req: NextRequest) {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET が未設定です");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const secret = req.nextUrl.searchParams.get("secret");
  const headerSecret = req.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET && headerSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminders();
}

// POST: 管理画面の手動トリガー用（admin セッション）
export async function POST() {
  const cookieStore = await cookies();
  const role = cookieStore.get("qsc_user_role")?.value ?? "";
  if (role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  return runReminders();
}
