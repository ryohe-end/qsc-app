import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const bucket = process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod";
const s3 = new S3Client({ region });

// S3 Key に使う ID は英数・ハイフン・アンダースコアのみ許可（パストラバーサル防止）
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
// 画像のみ許可
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（ログイン済みユーザーのみ）
    const cookieStore = await cookies();
    if (cookieStore.get("qsc_authed")?.value !== "1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, resultId, sectionId, itemId, photoId, contentType } = await req.json();

    if (!storeId || !resultId || !sectionId || !itemId || !photoId || !contentType) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    // 各ID をホワイトリスト検証
    for (const [name, v] of Object.entries({ storeId, resultId, sectionId, itemId, photoId })) {
      if (!SAFE_ID.test(String(v))) {
        return NextResponse.json({ error: `不正な ${name}` }, { status: 400 });
      }
    }

    // Content-Type をホワイトリスト検証
    const ct = String(contentType);
    if (!ALLOWED_CONTENT_TYPES.has(ct)) {
      return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
    }

    const ext = ct === "image/jpeg" ? "jpg" : ct === "image/png" ? "png" : "webp";
    const key = `check-results/${storeId}/${resultId}/${sectionId}/${itemId}/${photoId}.${ext}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 10 * 1024 * 1024], // 最大10MB
        ["eq", "$Content-Type", ct],
      ],
      Fields: { "Content-Type": ct },
      Expires: 300, // 5分
    });

    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({ url, fields, key, s3Url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Presigned URL error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
