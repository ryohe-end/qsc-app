import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand 
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
  storeId: string; resultId: string; sectionId: string; itemId: string; photo: any;
}): Promise<any> {
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
    ContentType: contentType
  }));

  return {
    id: params.photo.id,
    key,
    url: `https://${photoBucketName}.s3.${region}.amazonaws.com/${key}`,
    contentType
  };
}

async function getStoreEmails(storeId: string): Promise<string[]> {
  try {
    const res = await docClient.send(new GetCommand({
      TableName: storeTableName,
      Key: { PK: `STORE#${storeId}`, SK: `METADATA` }
    }));
    return Array.isArray(res.Item?.emails) ? res.Item.emails : [];
  } catch (err) {
    return [];
  }
}

/* ========================= Main POST Handler ========================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, storeName, userName, sendMail, inspectionDate } = body;

    if (!storeId || !body.sections) {
      return NextResponse.json({ error: "必須データが不足しています" }, { status: 400 });
    }

    const insDateStr = inspectionDate || new Date().toISOString().split('T')[0];
    const insDate = new Date(insDateStr);
    const deadline = new Date(insDate);
    deadline.setMonth(deadline.getMonth() + 1);
    const deadlineStr = deadline.toISOString().split('T')[0];

    const resultId = crypto.randomUUID();
    const now = new Date().toISOString();

    const storedSections: any[] = [];
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalPhotoCount = 0;
    let missingNotes = 0;
    const counts = { ok: 0, hold: 0, ng: 0, na: 0, unset: 0 };

    for (const sec of body.sections) {
      let secScore = 0;
      let secMaxScore = 0;
      const storedItems: any[] = [];

      for (const item of sec.items || []) {
        if (item.state === "ng" && !String(item.note || "").trim()) {
          missingNotes++;
        }

        if (item.state !== "na") {
          secMaxScore++;
          if (item.state === "ok") secScore++;
        }

        const s = item.state as keyof typeof counts;
        if (counts.hasOwnProperty(s)) counts[s]++; else counts.unset++;

        const storedPhotos: any[] = [];
        for (const p of (item.photos || [])) {
          if (p.dataUrl) {
            const uploaded = await uploadPhotoToS3({
              storeId, resultId, sectionId: sec.id, itemId: item.id, photo: p
            });
            storedPhotos.push(uploaded);
            totalPhotoCount++;
          }
        }

        // --- 修正ポイント：NG項目に是正管理用フィールドを付与 ---
        const isNg = item.state === "ng";

        storedItems.push({
          id: item.id,
          label: item.label,
          state: item.state || "unset",
          note: item.note || "",
          holdNote: item.holdNote || "",
          photos: storedPhotos, // ←ここにカンマが必要
          ...(isNg ? {
            correctionStatus: "pending",
            correction: "",
            correctionDate: ""
          } : {})
        });
      }

      const secPercentage = secMaxScore > 0 ? Math.round((secScore / secMaxScore) * 100) : 0;
      storedSections.push({
        id: sec.id,
        title: sec.title,
        items: storedItems,
        score: secScore,
        maxScore: secMaxScore,
        percentage: secPercentage
      });

      totalScore += secScore;
      totalMaxScore += secMaxScore;
    }

    if (missingNotes > 0) {
      return NextResponse.json({ error: "NG項目のコメントが未入力です" }, { status: 400 });
    }

    const summary = {
      ...counts,
      total: counts.ok + counts.hold + counts.ng + counts.na + counts.unset,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
      photoCount: totalPhotoCount,
      inspectionDate: insDateStr,
      improvementDeadline: deadlineStr
    };

    await docClient.send(new PutCommand({
      TableName: resultTableName,
      Item: {
        PK: `STORE#${storeId}`,
        SK: `RESULT#${now}`,
        type: "CHECK_RESULT",
        resultId,
        storeName,
        userName,
        summary,
        sections: storedSections,
        status: "done",
        createdAt: now
      }
    }));

    // メール送信処理（略）
    if (sendMail) {
      /* 既存のメール送信ロジック */
    }

    return NextResponse.json({ ok: true, resultId, summary });

  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: error.message || "送信に失敗しました" }, { status: 500 });
  }
}