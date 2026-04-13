import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const bucket = process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod";
const s3 = new S3Client({ region });

export async function POST(req: NextRequest) {
  try {
    const { storeId, resultId, sectionId, itemId, photoId, contentType } = await req.json();

    if (!storeId || !resultId || !sectionId || !itemId || !photoId || !contentType) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const key = `check-results/${storeId}/${resultId}/${sectionId}/${itemId}/${photoId}.${ext}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 10 * 1024 * 1024], // 最大10MB
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
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
