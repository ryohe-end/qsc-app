import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const selfCheckTableName = process.env.QSC_SELF_CHECK_TABLE_NAME || "QSC_SelfCheckResults";
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
    const resultId = searchParams.get("storeId");
    const checkType = searchParams.get("checkType") || "official";
    const tableName = checkType === "self" ? selfCheckTableName : resultTableName;

    if (!resultId) {
      return NextResponse.json({ error: "resultIdが必要です" }, { status: 400 });
    }

    const res = await docClient.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "resultId = :rid",
      ExpressionAttributeValues: { ":rid": resultId },
    }));

    if (!res.Items || res.Items.length === 0) {
      return NextResponse.json({ error: `ID:${resultId} のデータが見つかりません` }, { status: 404 });
    }

    const item = res.Items[0];
    if (Array.isArray(item.sections)) {
      item.sections = await presignSections(item.sections);
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
