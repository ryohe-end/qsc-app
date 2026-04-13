import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- AWS Setup ---
const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";
const photoBucket =
  process.env.QSC_CHECK_PHOTOS_BUCKET || "qsc-check-photos-prod";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region });

type RawPhoto = {
  id?: string;
  key?: string;
  url?: string;
  contentType?: string;
  M?: {
    id?: { S?: string };
    key?: { S?: string };
    url?: { S?: string };
    contentType?: { S?: string };
  };
};

type CheckItem = {
  id?: string;
  label?: string;
  note?: string;
  state?: string;
  correction?: string;
  correctionStatus?: string;
  photos?: RawPhoto[];
  beforePhotos?: RawPhoto[];
};

type CheckSection = {
  title?: string;
  items?: CheckItem[];
};

type CheckResult = {
  PK?: string;
  SK?: string;
  resultId?: string;
  storeName?: string;
  summary?: {
    improvementDeadline?: string;
    inspectionDate?: string;
  };
  sections?: CheckSection[];
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStoreId(value: unknown): string {
  return normalizeString(value).replace(/^STORE#/, "");
}

function extractPhotoKey(photo: unknown): string {
  if (!photo || typeof photo !== "object") return "";

  const p = photo as RawPhoto;

  if (typeof p.key === "string" && p.key.trim()) {
    return p.key.trim();
  }

  if (typeof p.M?.key?.S === "string" && p.M.key.S.trim()) {
    return p.M.key.S.trim();
  }

  return "";
}

function extractPhotoUrl(photo: unknown): string {
  if (!photo || typeof photo !== "object") return "";

  const p = photo as RawPhoto;

  if (typeof p.url === "string" && p.url.trim()) {
    return p.url.trim();
  }

  if (typeof p.M?.url?.S === "string" && p.M.url.S.trim()) {
    return p.M.url.S.trim();
  }

  return "";
}

async function buildSignedPhotoUrl(key?: string): Promise<string> {
  const normalizedKey = normalizeString(key);
  if (!normalizedKey) return "";

  const command = new GetObjectCommand({
    Bucket: photoBucket,
    Key: normalizedKey,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 60, // 1 hour
  });
}

async function resolveBeforePhotoUrl(item: CheckItem): Promise<string> {
  const firstPhoto =
    (Array.isArray(item.photos) && item.photos[0]) ||
    (Array.isArray(item.beforePhotos) && item.beforePhotos[0]) ||
    undefined;

  if (!firstPhoto) return "";

  const photoKey = extractPhotoKey(firstPhoto);
  if (photoKey) {
    try {
      return await buildSignedPhotoUrl(photoKey);
    } catch (error) {
      console.error("[ng-list] signed url generation failed:", error);
    }
  }

  // フォールバック: URLだけでも返す
  return extractPhotoUrl(firstPhoto);
}

/**
 * GET: 特定店舗のNG（是正待ち）一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get("storeId");

    if (!storeIdParam) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    const targetStoreId = normalizeStoreId(storeIdParam);
    if (!targetStoreId) {
      return NextResponse.json(
        { error: "storeId is invalid" },
        { status: 400 }
      );
    }

    const pk = `STORE#${targetStoreId}`;

    const res = await docClient.send(
      new QueryCommand({
        TableName: resultTableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      })
    );

    const results = (res.Items || []) as CheckResult[];
    const ngList: any[] = [];

    for (const result of results) {
      for (const [sIdx, sec] of (result.sections || []).entries()) {
        for (const item of sec.items || []) {
          const isNg = item.state === "ng";
          const isNotApproved = item.correctionStatus !== "approved";

          if (!isNg || !isNotApproved) {
            continue;
          }

          const beforePhoto = await resolveBeforePhotoUrl(item);

          ngList.push({
            id: item.id || "",
            sectionIndex: sIdx,
            category: sec.title || "カテゴリ不明",
            question: item.label || "",
            inspectorNote: item.note || "",
            deadline: result.summary?.improvementDeadline || "期限なし",
            beforePhoto,
            comment: item.correction || "",
            correctionStatus: item.correctionStatus || "pending",
            storeId: targetStoreId,
            storeName: result.storeName || "不明な店舗",
            resultPk: result.PK || "",
            resultSk: result.SK || "",
            resultId: result.resultId || "",
          });
        }
      }
    }

    ngList.sort((a, b) =>
      String(b.resultSk || "").localeCompare(String(a.resultSk || ""))
    );

    console.log(
      `[API] NG-List extracted: ${ngList.length} items for store ${targetStoreId}`
    );

    return NextResponse.json(ngList);
  } catch (error: any) {
    console.error("NG List API Error:", error);
    return NextResponse.json(
      { error: error?.message || "NG一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}