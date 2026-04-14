import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { sendDeadlineReminderEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTable = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const masterTable = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

// 秘密キーで保護（環境変数 CRON_SECRET を設定）
const CRON_SECRET = process.env.CRON_SECRET || "qsc-cron-secret-2026";

export async function GET(req: NextRequest) {
  // 認証チェック
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    let sentCount = 0;
    const errors: string[] = [];

    for (const result of results) {
      const deadline = result.summary?.improvementDeadline;
      if (!deadline || deadline !== threeDaysStr) continue;

      // pendingまたはsubmittedのNGアイテムを集計
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

      // 店舗のメール送信先を取得
      const storeId = String(result.storeId || "").replace(/^STORE#/, "");
      try {
        const storeRes = await docClient.send(new ScanCommand({
          TableName: masterTable,
          FilterExpression: "PK = :pk AND SK = :sk",
          ExpressionAttributeValues: {
            ":pk": `STORE#${storeId}`,
            ":sk": "METADATA",
          },
        }));
        const store = storeRes.Items?.[0];
        if (!store) continue;

        const emails: string[] = Array.isArray(store.emails) && store.emails.length > 0
          ? store.emails : store.email ? [store.email] : [];
        const managerEmails: string[] = Array.isArray(store.managers)
          ? store.managers.map((m: Record<string, unknown>) => String(m.email || "")).filter(Boolean)
          : [];
        const allTo = [...new Set([...emails, ...managerEmails])].filter(Boolean);

        if (allTo.length === 0) continue;

        for (const to of allTo) {
          await sendDeadlineReminderEmail({
            to,
            storeName: String(result.storeName || storeId),
            deadline,
            ngCount,
          });
        }
        sentCount++;
      } catch (e) {
        errors.push(`${storeId}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

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
