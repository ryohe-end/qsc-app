import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
// セルフチェックも同一テーブルに保存し checkType フィールドで区別
const bucket = process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region });

type PhotoRecord = { id: string; key?: string; url?: string; dataUrl?: string; contentType?: string };

async function presignPhoto(photo: PhotoRecord): Promise<PhotoRecord> {
  if (!photo.key) return photo;
  try {
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: photo.key }), { expiresIn: 3600 });
    return { ...photo, url, dataUrl: url };
  } catch {
    return photo;
  }
}

async function presignSections(sections: unknown[]): Promise<unknown[]> {
  return Promise.all(sections.map(async (sec: unknown) => {
    const s = sec as { items?: unknown[] };
    if (!Array.isArray(s.items)) return sec;
    const items = await Promise.all(s.items.map(async (it: unknown) => {
      const item = it as { photos?: PhotoRecord[] };
      if (!Array.isArray(item.photos) || item.photos.length === 0) return it;
      const photos = await Promise.all(item.photos.map(presignPhoto));
      return { ...item, photos };
    }));
    return { ...s, items };
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // 新パラメータ: resultId（必須） + storeId（任意、あれば Query を使い高速化）
    // 後方互換: storeId のみ来た場合は中身が resultId とみなす（旧呼び出し対応）
    const resultIdParam = searchParams.get("resultId");
    const storeIdParam = searchParams.get("storeId") ?? "";
    const resultId = resultIdParam || storeIdParam;
    const storeIdForQuery = resultIdParam ? storeIdParam : ""; // 旧呼び出し時は不明
    const tableName = resultTableName;

    if (!resultId) {
      return NextResponse.json({ error: "resultIdが必要です" }, { status: 400 });
    }

    let item: Record<string, unknown> | undefined;

    if (storeIdForQuery) {
      // 高速パス: PK = STORE#{storeId} で Query → JS で resultId 一致を find
      const cleanStoreId = storeIdForQuery.replace(/^STORE#/, "");
      const q = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `STORE#${cleanStoreId}` },
      }));
      item = (q.Items ?? []).find(i => i.resultId === resultId);
    } else {
      // フォールバック: 全件Scan
      const res = await docClient.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: "resultId = :rid",
        ExpressionAttributeValues: { ":rid": resultId },
      }));
      item = res.Items?.[0];
    }

    if (!item) {
      return NextResponse.json({ error: `ID:${resultId} のデータが見つかりません` }, { status: 404 });
    }
    if (Array.isArray(item.sections)) {
      item.sections = await presignSections(item.sections);
    }
    if (Array.isArray(item.notices)) {
      item.notices = await Promise.all(
        item.notices.map(async (n: { id?: string; note?: string; photos?: PhotoRecord[] }) => ({
          id: n.id ?? "",
          note: n.note ?? "",
          photos: Array.isArray(n.photos) ? await Promise.all(n.photos.map(presignPhoto)) : [],
        }))
      );
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
