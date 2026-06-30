import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { sendApprovalEmail, sendRejectionEmail, sendCorrectionSubmittedEmail } from "@/app/lib/sendgrid";
import { getAdminEmails } from "@/app/lib/adminEmails";

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
 * 店舗からの是正報告提出を処理する。
 * body: { pk, sk, sectionIndex, itemIndex, correction, status, afterPhotos }
 * - 改善コメント / 是正後写真 / correctionStat="submitted" を保存
 * - admin へ提出通知メールを送信
 */
async function handleStoreSubmission(
  body: Record<string, unknown>,
  role: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  // ログイン済みであれば店舗(manager/store)・admin いずれも提出可
  if (!role) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const pk = String(body.pk ?? "");
  const sk = String(body.sk ?? "");
  const sectionIndex = body.sectionIndex as number | undefined;
  const itemIndex = body.itemIndex as string | undefined;
  const correction = body.correction;
  const status = String(body.status ?? "");
  const afterPhotos = body.afterPhotos;
  // まとめて送信時は個別メールを抑止し、最後に1通だけ送る（notify-correction）
  const notify = body.notify !== false;

  if (!pk || !sk || sectionIndex === undefined || !itemIndex) {
    return NextResponse.json({ error: "不足しているパラメーターがあります" }, { status: 400 });
  }

  const submitterName = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "店舗担当者");

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
  // 店舗からの提出は常に "submitted"（status は将来の拡張用に受け取るだけ）
  void status;
  const newStatus: CorrectionStatus = "submitted";

  const updateExprParts = [
    `sections[${sectionIndex}].items[${realItemIndex}].correctionStatus = :cs`,
    `sections[${sectionIndex}].items[${realItemIndex}].correctionDate = :cd`,
    `sections[${sectionIndex}].items[${realItemIndex}].correctionBy = :cb`,
  ];
  const exprValues: Record<string, unknown> = {
    ":cs": newStatus,
    ":cd": now,
    ":cb": submitterName,
  };

  if (correction !== undefined) {
    updateExprParts.push(`sections[${sectionIndex}].items[${realItemIndex}].correction = :corr`);
    exprValues[":corr"] = String(correction);
  }
  if (Array.isArray(afterPhotos)) {
    updateExprParts.push(`sections[${sectionIndex}].items[${realItemIndex}].afterPhotos = :ap`);
    exprValues[":ap"] = afterPhotos;
  }

  await docClient.send(new UpdateCommand({
    TableName: resultTableName,
    Key: { PK: pk, SK: sk },
    UpdateExpression: `SET ${updateExprParts.join(", ")}`,
    ExpressionAttributeValues: exprValues,
  }));

  // admin へ是正報告提出通知メール（まとめて送信時は notify=false で抑止）
  if (notify) {
    try {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length > 0) {
        await sendCorrectionSubmittedEmail({
          to: adminEmails,
          storeName: String(result.storeName || pk.replace(/^STORE#/, "")),
          submittedCount: 1,
          submittedBy: submitterName,
        });
      }
    } catch (mailErr) {
      console.error("correction submitted mail failed:", mailErr);
    }
  }

  return NextResponse.json({ ok: true, correctionStatus: newStatus, correctionBy: submitterName, correctionDate: now });
}

/**
 * PATCH: correctionStatus を更新する（admin のみ）
 * body: { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";

    const body = await req.json();
    const { pk, sk, sectionIndex, itemIndex, correctionStatus, reviewNote, holdResolution } = body;

    // correctionStatus が無い場合は「店舗からの是正報告提出」として処理する
    if (correctionStatus === undefined) {
      return await handleStoreSubmission(body, role, cookieStore);
    }

    // 以降は admin による承認/差し戻し（ステータス更新）
    if (role !== "admin") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    const reviewerName = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "管理者");

    if (!pk || !sk || sectionIndex === undefined || !itemIndex || !correctionStatus) {
      return NextResponse.json({ error: "不足しているパラメーターがあります" }, { status: 400 });
    }

    const validStatuses: CorrectionStatus[] = ["pending", "submitted", "reviewing", "approved", "rejected"];
    if (!validStatuses.includes(correctionStatus)) {
      return NextResponse.json({ error: `不正なステータス: ${correctionStatus}` }, { status: 400 });
    }

    // holdResolution の検証（保留項目の確定時に "ok" or "ng" を指定）
    if (holdResolution && holdResolution !== "ok" && holdResolution !== "ng") {
      return NextResponse.json({ error: `不正な保留確定値: ${holdResolution}` }, { status: 400 });
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

    // 保留項目の確定時にstateも更新
    const updateExprParts = [
      `sections[${sectionIndex}].items[${realItemIndex}].correctionStatus = :cs`,
      `sections[${sectionIndex}].items[${realItemIndex}].reviewNote = :rn`,
      `sections[${sectionIndex}].items[${realItemIndex}].reviewedBy = :rb`,
      `sections[${sectionIndex}].items[${realItemIndex}].reviewedAt = :ra`,
    ];
    const exprValues: Record<string, unknown> = {
      ":cs": correctionStatus,
      ":rn": reviewNote ?? "",
      ":rb": reviewerName,
      ":ra": now,
    };

    if (holdResolution) {
      updateExprParts.push(`sections[${sectionIndex}].items[${realItemIndex}].holdResolution = :hr`);
      updateExprParts.push(`sections[${sectionIndex}].items[${realItemIndex}].state = :newState`);
      exprValues[":hr"] = holdResolution;
      exprValues[":newState"] = holdResolution; // "ok" or "ng"
    }

    await docClient.send(new UpdateCommand({
      TableName: resultTableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${updateExprParts.join(", ")}`,
      ExpressionAttributeValues: exprValues,
    }));

    // 保留確定時：全保留が確定したらスコアを再計算
    if (holdResolution) {
      // 更新後のレコードを再取得
      const refreshRes = await docClient.send(new GetCommand({
        TableName: resultTableName,
        Key: { PK: pk, SK: sk },
      }));
      const refreshedResult = refreshRes.Item;
      if (refreshedResult?.sections) {
        const allItems = (refreshedResult.sections as Array<{ items: Array<{ state: string; category?: string }> }>)
          .flatMap(s => s.items);
        const remainingHolds = allItems.filter(i => i.state === "hold").length;

        if (remainingHolds === 0) {
          // 全保留が確定 → 最終スコアを計算
          let totalScore = 0;
          let totalMaxScore = 0;
          const catScores: Record<string, { score: number; maxScore: number }> = {};

          for (const item of allItems) {
            if (item.state === "na") continue;
            totalMaxScore++;
            if (item.state === "ok") totalScore++;
            const cat = (item.category || "").normalize("NFKC").trim().toUpperCase() || "その他";
            if (!catScores[cat]) catScores[cat] = { score: 0, maxScore: 0 };
            catScores[cat].maxScore++;
            if (item.state === "ok") catScores[cat].score++;
          }

          const finalPoint = totalMaxScore > 0 ? Math.floor((totalScore / totalMaxScore) * 100) : 0;
          const finalCategoryScores = Object.fromEntries(
            Object.entries(catScores).map(([cat, { score, maxScore }]) => [
              cat, { ok: score, maxScore, point: maxScore > 0 ? Math.floor((score / maxScore) * 100) : 0 }
            ])
          );

          // summaryを更新
          const updatedSummary = {
            ...(refreshedResult.summary || {}),
            ok: totalScore,
            maxScore: totalMaxScore,
            point: finalPoint,
            hold: 0,
            scoreFinalized: true,
            categoryScores: finalCategoryScores,
          };

          await docClient.send(new UpdateCommand({
            TableName: resultTableName,
            Key: { PK: pk, SK: sk },
            UpdateExpression: "SET summary = :s",
            ExpressionAttributeValues: { ":s": updatedSummary },
          }));
        }
      }
    }

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
