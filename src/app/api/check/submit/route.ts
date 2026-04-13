import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { cookies } from "next/headers";
import { sendEmail } from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const masterTableName = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";
const userTableName = process.env.QSC_USER_TABLE || "QSC_UserTable";
const photoBucketName = process.env.QSC_PHOTO_BUCKET_NAME || "";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region });

/* ========================= Helpers ========================= */

async function uploadPhotoToS3(params: {
  storeId: string; resultId: string; sectionId: string; itemId: string;
  photo: { id: string; dataUrl: string };
}): Promise<{ id: string; key: string; url: string; contentType: string }> {
  const match = params.photo.dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("画像データ形式が不正です");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `check-results/${params.storeId}/${params.resultId}/${params.sectionId}/${params.itemId}/${params.photo.id}.${ext}`;
  await s3Client.send(new PutObjectCommand({ Bucket: photoBucketName, Key: key, Body: buffer, ContentType: contentType }));
  return { id: params.photo.id, key, url: `https://${photoBucketName}.s3.${region}.amazonaws.com/${key}`, contentType };
}

/* 店舗のemailsとmanagersを取得 */
async function getStoreContacts(storeId: string): Promise<{ emails: string[]; managerEmails: string[] }> {
  try {
    const res = await docClient.send(new GetCommand({
      TableName: masterTableName,
      Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
    }));
    const item = res.Item;
    if (!item) return { emails: [], managerEmails: [] };

    const emails: string[] = Array.isArray(item.emails) && item.emails.length > 0
      ? item.emails : item.email ? [item.email] : [];

    const managerEmails: string[] = Array.isArray(item.managers)
      ? item.managers.map((m: Record<string, unknown>) => {
          if (typeof m.email === "string") return m.email;
          const inner = (m.M as Record<string, { S?: string }> | undefined);
          return inner?.email?.S || "";
        }).filter(Boolean)
      : [];

    return { emails, managerEmails };
  } catch {
    return { emails: [], managerEmails: [] };
  }
}

/* 管理者ロールのメールアドレスを全取得 */
async function getAdminEmails(): Promise<string[]> {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: userTableName,
      FilterExpression: "#role = :role AND #status = :status",
      ExpressionAttributeNames: { "#role": "role", "#status": "status" },
      ExpressionAttributeValues: { ":role": "admin", ":status": "active" },
      ProjectionExpression: "email",
    }));
    return (res.Items ?? []).map(i => String(i.email || "")).filter(Boolean);
  } catch {
    return [];
  }
}

async function getUserNameFromCookie(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const name = cookieStore.get("qsc_user_name")?.value;
    return name ? decodeURIComponent(name) : "";
  } catch {
    return "";
  }
}

/* ========================= 点検完了メール ========================= */
async function sendCompletionEmail(params: {
  to: string[];
  storeName: string;
  userName: string;
  inspectionDate: string;
  improvementDeadline: string;
  summary: {
    ok: number; ng: number; hold: number; na: number; unset: number;
    maxScore: number; point: number; photoCount: number;
    categoryScores: Record<string, { ok: number; maxScore: number; point: number }>;
  };
}) {
  if (params.to.length === 0) return;

  const appUrl = "https://main.djvjtfdfn32br.amplifyapp.com";
  const hasNg = params.summary.ng > 0;

  const categoryRows = Object.entries(params.summary.categoryScores)
    .map(([cat, s]) => `
      <tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#64748b;border-bottom:1px solid #f1f5f9;">${cat}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:center;">${s.ok}/${s.maxScore}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:900;border-bottom:1px solid #f1f5f9;text-align:center;color:${s.point >= 80 ? "#059669" : s.point >= 60 ? "#d97706" : "#dc2626"};">${s.point}点</td>
      </tr>
    `).join("");

  const statCards = [
    { label: "OK", value: params.summary.ok, color: "#059669", bg: "#f0fdf4" },
    { label: "NG", value: params.summary.ng, color: "#dc2626", bg: "#fef2f2" },
    { label: "保留", value: params.summary.hold, color: "#d97706", bg: "#fffbeb" },
    { label: "写真", value: params.summary.photoCount, color: "#6366f1", bg: "#f5f3ff" },
  ].map(({ label, value, color, bg }) =>
    `<td style="width:25%;padding:4px;">
      <div style="background:${bg};border-radius:12px;padding:14px 8px;text-align:center;">
        <div style="font-size:22px;font-weight:950;color:${color};">${value}</div>
        <div style="font-size:11px;font-weight:800;color:${color};margin-top:2px;">${label}</div>
      </div>
    </td>`
  ).join("");

  await sendEmail({
    to: params.to,
    subject: `【QSC点検完了】${params.storeName} - ${params.inspectionDate}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0" style="border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">

  <tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 36px;text-align:center;border-radius:24px 24px 0 0;">
    <div style="font-size:20px;font-weight:900;color:#fff;">QSC Check</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">点検完了レポート</div>
  </td></tr>

  <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
    <h2 style="font-size:20px;font-weight:900;color:#1e293b;margin:0 0 4px;">${params.storeName}</h2>
    <p style="font-size:13px;color:#94a3b8;font-weight:700;margin:0 0 28px;">点検日: ${params.inspectionDate} &nbsp;|&nbsp; 担当: ${params.userName}</p>

    <!-- スコア -->
    <div style="background:#f8fafc;border-radius:20px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:52px;font-weight:950;color:${params.summary.point >= 80 ? "#059669" : params.summary.point >= 60 ? "#d97706" : "#dc2626"};">${params.summary.point}<span style="font-size:18px;font-weight:700;">点</span></div>
      <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-top:4px;">${params.summary.ok} / ${params.summary.maxScore} 項目クリア</div>
    </div>

    <!-- カテゴリ別 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:left;border-bottom:1px solid #e2e8f0;">カテゴリ</th>
        <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:center;border-bottom:1px solid #e2e8f0;">OK/対象</th>
        <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:center;border-bottom:1px solid #e2e8f0;">スコア</th>
      </tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <!-- 件数 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>${statCards}</tr></table>

    <!-- NG警告 or クリア -->
    ${hasNg ? `
    <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:14px;padding:18px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:900;color:#dc2626;margin-bottom:6px;">⚠️ NG項目が ${params.summary.ng}件 あります</div>
      <div style="font-size:13px;font-weight:600;color:#7f1d1d;line-height:1.6;">改善期限: <strong>${params.improvementDeadline}</strong> までに是正報告を提出してください。</div>
    </div>` : `
    <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:14px;padding:18px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:900;color:#059669;">✅ すべての項目をクリアしました</div>
    </div>`}

    <div style="text-align:center;">
      <p style="font-size:13px;color:#64748b;font-weight:600;margin-bottom:12px;">こちらのURLより結果を確認してください。</p>
      <a href="${appUrl}/results" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:900;">結果を確認する →</a>
      <p style="font-size:12px;color:#94a3b8;margin-top:10px;">${appUrl}/results</p>
    </div>
  </td></tr>

  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 24px 24px;padding:18px 36px;text-align:center;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">© 2026 QSC Check · このメールは自動送信です</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
    text: `【QSC点検完了】${params.storeName}
点検日: ${params.inspectionDate} / 担当: ${params.userName}
スコア: ${params.summary.point}点 (${params.summary.ok}/${params.summary.maxScore})
NG: ${params.summary.ng}件 / 保留: ${params.summary.hold}件
${hasNg ? `改善期限: ${params.improvementDeadline}` : "全項目クリアしました"}
こちらのURLより結果を確認してください。
${appUrl}/results`.trim(),
  });
}

/* ========================= Main POST Handler ========================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId = "", bizId = "", brandId = "", storeId, storeName, sendMail, inspectionDate } = body;

    if (!storeId || !String(storeId).trim()) {
      return NextResponse.json({ error: "storeId が不正です" }, { status: 400 });
    }
    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: "点検データが不足しています" }, { status: 400 });
    }

    const cookieUserName = await getUserNameFromCookie();
    const userName = cookieUserName || String(body.userName || "").trim() || "担当者";

    const insDateStr = inspectionDate || new Date().toISOString().split("T")[0];
    const deadlineStr = (() => {
      if (body.improvementDeadline && String(body.improvementDeadline).match(/^\d{4}-\d{2}-\d{2}$/)) return body.improvementDeadline;
      const d = new Date(insDateStr); d.setMonth(d.getMonth() + 1); return d.toISOString().split("T")[0];
    })();

    const resultId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanStoreId = String(storeId).replace(/^STORE#/, "");

    const storedSections: unknown[] = [];
    let totalScore = 0, totalMaxScore = 0, totalPhotoCount = 0, missingNotes = 0;
    const counts = { ok: 0, hold: 0, ng: 0, na: 0, unset: 0 };
    const categoryScores: Record<string, { score: number; maxScore: number }> = {};

    for (const sec of body.sections) {
      let secScore = 0, secMaxScore = 0;
      const storedItems: unknown[] = [];

      for (const item of sec.items || []) {
        if (item.state === "ng" && !String(item.note || "").trim()) missingNotes++;

        if (item.state !== "na") {
          secMaxScore++;
          if (item.state === "ok") secScore++;
          const cat = (String(item.category || "").normalize("NFKC").trim().toUpperCase()) || "その他";
          if (!categoryScores[cat]) categoryScores[cat] = { score: 0, maxScore: 0 };
          categoryScores[cat].maxScore++;
          if (item.state === "ok") categoryScores[cat].score++;
        }

        const s = item.state as keyof typeof counts;
        if (s in counts) counts[s]++; else counts.unset++;

        const storedPhotos: unknown[] = [];
        console.log("photos data:", JSON.stringify(item.photos?.map((p: Record<string, unknown>) => ({ id: p.id, hasS3Url: !!p.s3Url, hasS3Key: !!p.s3Key, hasDataUrl: !!(p.dataUrl as string)?.startsWith("data:") }))));
        for (const p of item.photos || []) {
          if (p.s3Url && p.s3Key) {
            // 既にS3にアップロード済み（Presigned URL方式）
            storedPhotos.push({ id: p.id, key: p.s3Key, url: p.s3Url, contentType: "image/jpeg" });
            totalPhotoCount++;
          } else if (p.dataUrl && p.dataUrl.startsWith("data:")) {
            // フォールバック：base64からS3アップロード
            const uploaded = await uploadPhotoToS3({ storeId: cleanStoreId, resultId, sectionId: sec.id, itemId: item.id, photo: p });
            storedPhotos.push(uploaded);
            totalPhotoCount++;
          }
        }

        storedItems.push({
          id: item.id, label: item.label, state: item.state || "unset",
          note: item.note || "", holdNote: item.holdNote || "",
          photos: storedPhotos, category: item.category || "",
          ...(item.state === "ng" ? { correctionStatus: "pending", correction: "", correctionDate: "" } : {}),
        });
      }

      const secPercentage = secMaxScore > 0 ? Math.round((secScore / secMaxScore) * 100) : 0;
      storedSections.push({ id: sec.id, title: sec.title, items: storedItems, score: secScore, maxScore: secMaxScore, percentage: secPercentage });
      totalScore += secScore;
      totalMaxScore += secMaxScore;
    }

    if (missingNotes > 0) {
      return NextResponse.json({ error: `NG項目のコメントが ${missingNotes} 件未入力です` }, { status: 400 });
    }

    const categoryScoreSummary = Object.fromEntries(
      Object.entries(categoryScores).map(([cat, { score, maxScore }]) => [
        cat, { ok: score, maxScore, point: maxScore > 0 ? Math.floor((score / maxScore) * 100) : 0 }
      ])
    );
    const totalPoint = totalMaxScore > 0 ? Math.floor((totalScore / totalMaxScore) * 100) : 0;

    const summary = {
      ...counts,
      total: counts.ok + counts.hold + counts.ng + counts.na + counts.unset,
      ok: totalScore, maxScore: totalMaxScore, point: totalPoint,
      photoCount: totalPhotoCount, inspectionDate: insDateStr,
      improvementDeadline: deadlineStr, categoryScores: categoryScoreSummary,
    };

    await docClient.send(new PutCommand({
      TableName: resultTableName,
      Item: {
        PK: `STORE#${cleanStoreId}`, SK: `RESULT#${now}`,
        type: "CHECK_RESULT", resultId, companyId, bizId, brandId,
        storeId: cleanStoreId, storeName, userName, summary,
        sections: storedSections, status: "done", createdAt: now, submittedAt: now,
      },
    }));

    // ✅ 点検完了メール送信
    if (sendMail) {
      try {
        const { emails, managerEmails } = await getStoreContacts(cleanStoreId);
        const allTo = [...new Set([...emails, ...managerEmails])].filter(Boolean);
        if (allTo.length > 0) {
          await sendCompletionEmail({
            to: allTo, storeName: storeName || cleanStoreId, userName,
            inspectionDate: insDateStr, improvementDeadline: deadlineStr,
            summary: {
              ok: totalScore, ng: counts.ng, hold: counts.hold,
              na: counts.na, unset: counts.unset,
              maxScore: totalMaxScore, point: totalPoint,
              photoCount: totalPhotoCount, categoryScores: categoryScoreSummary,
            },
          });
          console.log(`Completion email sent to: ${allTo.join(", ")}`);
        } else {
          console.log("No email recipients found for store:", cleanStoreId);
        }
      } catch (mailErr) {
        console.error("Mail send failed:", mailErr); // メール失敗でも送信は成功扱い
      }
    }

    return NextResponse.json({ ok: true, resultId, summary });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "送信に失敗しました";
    console.error("Submit Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
