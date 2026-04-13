import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { sendApprovalEmail, sendRejectionEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const masterTableName = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type CorrectionStatus = "pending" | "submitted" | "reviewing" | "approved" | "rejected";

/* 店舗のメール送信先を取得 */
async function getStoreContacts(storeId: string): Promise<string[]> {
  try {
    const cleanId = storeId.replace(/^STORE#/, "");
    const res = await docClient.send(new GetCommand({
      TableName: masterTableName,
      Key: { PK: `STORE#${cleanId}`, SK: "METADATA" },
    }));
    const item = res.Item;
    if (!item) return [];

    const emails: string[] = Array.isArray(item.emails) && item.emails.length > 0
      ? item.emails : item.email ? [item.email] : [];

    const managerEmails: string[] = Array.isArray(item.managers)
      ? item.managers.map((m: Record<string, unknown>) => {
          if (typeof m.email === "string") return m.email;
          const inner = (m.M as Record<string, { S?: string }> | undefined);
          return inner?.email?.S || "";
        }).filter(Boolean)
      : [];

    return [...new Set([...emails, ...managerEmails])].filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * PATCH: correctionStatus を更新する（admin のみ）
 * body: { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (role !== "admin") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    const reviewerName = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "管理者");

    const body = await req.json();
    const { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote } = body;

    if (!pk || !sk || sectionIndex === undefined || !itemIndex || !correctionStatus) {
      return NextResponse.json({ error: "不足しているパラメーターがあります" }, { status: 400 });
    }

    const validStatuses: CorrectionStatus[] = ["pending", "submitted", "reviewing", "approved", "rejected"];
    if (!validStatuses.includes(correctionStatus)) {
      return NextResponse.json({ error: `不正なステータス: ${correctionStatus}` }, { status: 400 });
    }

    // 現在のレコードを取得
    const getRes = await docClient.send(new GetCommand({
      TableName: resultTableName,
      Key: { PK: pk, SK: sk },
    }));

    const result = getRes.Item;
    if (!result?.sections) {
      return NextResponse.json({ error: "対象の点検結果が見つかりません" }, { status: 404 });
    }

    const section = result.sections[sectionIndex];
    if (!section?.items) {
      return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });
    }

    const realItemIndex = section.items.findIndex((it: { id: string }) => it.id === itemIndex);
    if (realItemIndex === -1) {
      return NextResponse.json({ error: `設問ID ${itemIndex} が見つかりません` }, { status: 404 });
    }

    const targetItem = section.items[realItemIndex];
    const now = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: resultTableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET
        sections[${sectionIndex}].items[${realItemIndex}].correctionStatus = :cs,
        sections[${sectionIndex}].items[${realItemIndex}].reviewNote = :rn,
        sections[${sectionIndex}].items[${realItemIndex}].reviewedBy = :rb,
        sections[${sectionIndex}].items[${realItemIndex}].reviewedAt = :ra`,
      ExpressionAttributeValues: {
        ":cs": correctionStatus,
        ":rn": reviewNote ?? "",
        ":rb": reviewerName,
        ":ra": now,
      },
    }));

    // ✅ 承認/差し戻し時にメール送信
    if (correctionStatus === "approved" || correctionStatus === "rejected") {
      try {
        const storeId = String(result.storeId || pk.replace(/^STORE#/, "") || "");
        const storeName = String(result.storeName || storeId);
        const question = String(targetItem?.label || "");
        const contacts = await getStoreContacts(storeId);

        if (contacts.length > 0) {
          if (correctionStatus === "approved") {
            await sendApprovalEmail({
              to: contacts,
              storeName,
              question,
              reviewedBy: reviewerName,
              reviewNote: reviewNote || undefined,
            });
          } else {
            await sendRejectionEmail({
              to: contacts,
              storeName,
              question,
              reviewedBy: reviewerName,
              reviewNote: reviewNote || "（理由なし）",
            });
          }
          console.log(`${correctionStatus} email sent to: ${contacts.join(", ")}`);
        }
      } catch (mailErr) {
        console.error("Mail send failed:", mailErr);
      }
    }

    return NextResponse.json({ ok: true, correctionStatus, reviewedBy: reviewerName, reviewedAt: now });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("update-correction-status Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
