import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({
  region: process.env.QSC_AWS_REGION || "us-east-1",
});
const ddb = DynamoDBDocumentClient.from(client);

const s3 = new S3Client({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const BUCKET = process.env.QSC_PHOTOS_BUCKET || "qsc-check-photos-prod";

const TABLE_NAME = process.env.QSC_CHECK_RESULTS_TABLE || "QSC_CheckResults";
// セルフチェックも同一テーブルに保存し checkType フィールドで区別

type PhotoRecord = {
  id: string;
  key?: string;
  url?: string;
  dataUrl?: string;
  contentType?: string;
};

/* S3キーからPresigned URLを生成（1時間有効）。
   編集モードで再保存できるよう、永続的なS3 URL/Keyも s3Url/s3Key として温存する。 */
async function presignPhoto(photo: PhotoRecord): Promise<PhotoRecord & { s3Url?: string; s3Key?: string }> {
  if (!photo.key) return photo;
  try {
    const presigned = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: photo.key }),
      { expiresIn: 3600 }
    );
    return {
      ...photo,
      url: presigned,
      dataUrl: presigned,
      s3Url: photo.url,
      s3Key: photo.key,
    };
  } catch (e) {
    console.error("presign failed", photo.key, e);
    return photo;
  }
}

/* sections内の全写真にPresigned URLを付与 */
async function presignSections(sections: unknown[]): Promise<unknown[]> {
  return Promise.all(
    sections.map(async (sec: unknown) => {
      const s = sec as { items?: unknown[] };
      if (!Array.isArray(s.items)) return sec;
      const items = await Promise.all(
        s.items.map(async (it: unknown) => {
          const item = it as { photos?: PhotoRecord[] };
          if (!Array.isArray(item.photos) || item.photos.length === 0) return it;
          const photos = await Promise.all(item.photos.map(presignPhoto));
          return { ...item, photos };
        })
      );
      return { ...s, items };
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const resultId = searchParams.get("resultId");
    const checkType = searchParams.get("checkType") || "official";
    const tableName = TABLE_NAME;

    if (!storeId || !resultId) {
      return NextResponse.json(
        { message: "storeId and resultId are required" },
        { status: 400 }
      );
    }

    const pk = `STORE#${storeId}`;

    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ScanIndexForward: false,
      })
    );

    const item = (result.Items ?? []).find(
      (i) => i.resultId === resultId && i.type === "CHECK_RESULT"
    );

    if (!item) {
      return NextResponse.json({ message: "result not found" }, { status: 404 });
    }

    // 写真にPresigned URLを付与
    const sections = Array.isArray(item.sections)
      ? await presignSections(item.sections)
      : [];

    // 気づきの写真にもPresigned URLを付与
    const rawNotices = Array.isArray(item.notices) ? item.notices : [];
    const notices = await Promise.all(
      rawNotices.map(async (n: { id?: string; note?: string; photos?: PhotoRecord[] }) => ({
        id: n.id ?? "",
        note: n.note ?? "",
        photos: Array.isArray(n.photos) ? await Promise.all(n.photos.map(presignPhoto)) : [],
      }))
    );

    return NextResponse.json({
      resultId: item.resultId ?? "",
      storeId: item.storeId ?? "",
      storeName: item.storeName ?? "",
      status: item.status ?? "",
      submittedAt: item.submittedAt ?? item.createdAt ?? "",
      sections,
      notices,
      summary: item.summary ?? null,
    });
  } catch (error) {
    console.error("GET /api/check/results/detail failed", error);
    return NextResponse.json(
      { message: "failed to load check result detail" },
      { status: 500 }
    );
  }
}