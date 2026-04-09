import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type CorrectionStatus = "pending" | "submitted" | "reviewing" | "approved" | "rejected";

/**
 * PATCH: correctionStatus を更新する（SV/本部用）
 * body: { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote? }
 */
export async function PATCH(req: NextRequest) {
  try {
    // ロールチェック（admin のみ許可）
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (role !== "admin") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    const reviewerName = cookieStore.get("qsc_user_name")?.value ?? "管理者";

    const body = await req.json();
    const { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote } = body;

    if (!pk || !sk || sectionIndex === undefined || !itemIndex || !correctionStatus) {
      return NextResponse.json({ error: "不足しているパラメータがあります" }, { status: 400 });
    }

    const validStatuses: CorrectionStatus[] = ["pending", "submitted", "reviewing", "approved", "rejected"];
    if (!validStatuses.includes(correctionStatus)) {
      return NextResponse.json({ error: `不正なステータス: ${correctionStatus}` }, { status: 400 });
    }

    // 現在のレコードを取得してrealItemIndexを特定
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

    return NextResponse.json({ ok: true, correctionStatus, reviewedBy: reviewerName, reviewedAt: now });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("update-correction-status Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
