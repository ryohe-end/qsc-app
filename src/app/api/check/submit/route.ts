import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const storeTableName = process.env.QSC_STORE_TABLE_NAME || "QSC_StoreTable";
const photoBucketName = process.env.QSC_PHOTO_BUCKET_NAME || "";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region });

/* ========================= Helpers ========================= */

async function uploadPhotoToS3(params: {
  storeId: string;
  resultId: string;
  sectionId: string;
  itemId: string;
  photo: { id: string; dataUrl: string };
}): Promise<{ id: string; key: string; url: string; contentType: string }> {
  const match = params.photo.dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("画像データ形式が不正です");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `check-results/${params.storeId}/${params.resultId}/${params.sectionId}/${params.itemId}/${params.photo.id}.${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: photoBucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return {
    id: params.photo.id,
    key,
    url: `https://${photoBucketName}.s3.${region}.amazonaws.com/${key}`,
    contentType,
  };
}

async function getStoreEmails(storeId: string): Promise<string[]> {
  try {
    const res = await docClient.send(new GetCommand({
      TableName: storeTableName,
      Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
    }));
    return Array.isArray(res.Item?.emails) ? res.Item.emails : [];
  } catch {
    return [];
  }
}

// [追加] サーバーサイドでクッキーからユーザー名を取得
async function getUserNameFromCookie(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const name = cookieStore.get("qsc_user_name")?.value;
    return name ? decodeURIComponent(name) : "";
  } catch {
    return "";
  }
}

/* ========================= Main POST Handler ========================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyId = "",
      bizId = "",
      brandId = "",
      storeId,
      storeName,
      sendMail,
      inspectionDate,
    } = body;

    // [修正] storeId の存在チェックを強化
    if (!storeId || !String(storeId).trim()) {
      return NextResponse.json({ error: "storeId が不正です" }, { status: 400 });
    }
    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: "点検データが不足しています" }, { status: 400 });
    }

    // [修正] ユーザー名はサーバーサイドのクッキーから取得（フロントからの値をフォールバックとして使用）
    const cookieUserName = await getUserNameFromCookie();
    const userName = cookieUserName || String(body.userName || "").trim() || "担当者";

    const insDateStr = inspectionDate || new Date().toISOString().split("T")[0];
    // [修正] フロントから期日が送られてきた場合はそちらを優先、なければ1ヶ月後
    const deadlineStr = (() => {
      if (body.improvementDeadline && String(body.improvementDeadline).match(/^\d{4}-\d{2}-\d{2}$/)) {
        return body.improvementDeadline;
      }
      const d = new Date(insDateStr);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })();

    const resultId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanStoreId = String(storeId).replace(/^STORE#/, "");

    const storedSections: unknown[] = [];
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalPhotoCount = 0;
    let missingNotes = 0;
    const counts = { ok: 0, hold: 0, ng: 0, na: 0, unset: 0 };
    // [追加] Q/S/C別スコア集計
    const categoryScores: Record<string, { score: number; maxScore: number }> = {};

    for (const sec of body.sections) {
      let secScore = 0;
      let secMaxScore = 0;
      const storedItems: unknown[] = [];

      for (const item of sec.items || []) {
        // [修正] NG項目のコメント未入力チェック
        if (item.state === "ng" && !String(item.note || "").trim()) {
          missingNotes++;
        }

        if (item.state !== "na") {
          secMaxScore++;
          if (item.state === "ok") secScore++;

          // [追加] category別集計
          const cat = (String(item.category || "").normalize("NFKC").trim().toUpperCase()) || "その他";
          if (!categoryScores[cat]) categoryScores[cat] = { score: 0, maxScore: 0 };
          categoryScores[cat].maxScore++;
          if (item.state === "ok") categoryScores[cat].score++;
        }

        const s = item.state as keyof typeof counts;
        if (s in counts) counts[s]++; else counts.unset++;

        // [修正] S3アップロード：cleanStoreId を使用して空文字パスを防ぐ
        const storedPhotos: unknown[] = [];
        for (const p of item.photos || []) {
          if (p.dataUrl) {
            const uploaded = await uploadPhotoToS3({
              storeId: cleanStoreId,
              resultId,
              sectionId: sec.id,
              itemId: item.id,
              photo: p,
            });
            storedPhotos.push(uploaded);
            totalPhotoCount++;
          }
        }

        storedItems.push({
          id: item.id,
          label: item.label,
          state: item.state || "unset",
          note: item.note || "",
          holdNote: item.holdNote || "",
          photos: storedPhotos,
          category: item.category || "",  // [追加]
          ...(item.state === "ng" ? {
            correctionStatus: "pending",
            correction: "",
            correctionDate: "",
          } : {}),
        });
      }

      const secPercentage = secMaxScore > 0 ? Math.round((secScore / secMaxScore) * 100) : 0;
      storedSections.push({
        id: sec.id,
        title: sec.title,
        items: storedItems,
        score: secScore,
        maxScore: secMaxScore,
        percentage: secPercentage,
      });

      totalScore += secScore;
      totalMaxScore += secMaxScore;
    }

    // [修正] NG未入力があれば送信拒否
    if (missingNotes > 0) {
      return NextResponse.json(
        { error: `NG項目のコメントが ${missingNotes} 件未入力です` },
        { status: 400 }
      );
    }

    // [修正] Q/S/C別スコアを (◯数 / 対象外以外の設問数) × 100 の切り捨てで算出
    const categoryScoreSummary = Object.fromEntries(
      Object.entries(categoryScores).map(([cat, { score, maxScore }]) => [
        cat,
        {
          ok: score,                          // ◯の数
          maxScore,                           // 対象外以外の設問数（分母）
          point: maxScore > 0 ? Math.floor((score / maxScore) * 100) : 0, // 点数
        },
      ])
    );

    // 合計スコアも同じロジック（切り捨て）
    const totalPoint = totalMaxScore > 0 ? Math.floor((totalScore / totalMaxScore) * 100) : 0;

    const summary = {
      ...counts,
      total: counts.ok + counts.hold + counts.ng + counts.na + counts.unset,
      ok: totalScore,        // 合計◯数
      maxScore: totalMaxScore, // 合計分母
      point: totalPoint,       // 合計点数（切り捨て）
      photoCount: totalPhotoCount,
      inspectionDate: insDateStr,
      improvementDeadline: deadlineStr,
      categoryScores: categoryScoreSummary,
    };

    // [修正] companyId / bizId / brandId も保存。storeId は cleanStoreId を使用
    await docClient.send(new PutCommand({
      TableName: resultTableName,
      Item: {
        PK: `STORE#${cleanStoreId}`,
        SK: `RESULT#${now}`,
        type: "CHECK_RESULT",
        resultId,
        companyId,   // [追加]
        bizId,       // [追加]
        brandId,     // [追加]
        storeId: cleanStoreId,
        storeName,
        userName,    // [修正] クッキーから取得した実際のユーザー名
        summary,
        sections: storedSections,
        status: "done",
        createdAt: now,
        submittedAt: now,  // [追加] history API が使う submittedAt も保存
      },
    }));

    // メール送信処理
    if (sendMail) {
      const emails = await getStoreEmails(cleanStoreId);
      // 実際のメール送信ロジックをここに実装
      console.log("Mail target emails:", emails);
    }

    return NextResponse.json({ ok: true, resultId, summary });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "送信に失敗しました";
    console.error("Submit Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
