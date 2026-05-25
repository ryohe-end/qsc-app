import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const photoBucketName = process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod";
const s3 = new S3Client({ region });

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type IncomingPhoto = { dataUrl?: string; s3Key?: string };
type ImagePart = { mimeType: string; base64: string };

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

async function resolveImage(photo: IncomingPhoto): Promise<ImagePart | null> {
  if (photo.dataUrl && photo.dataUrl.startsWith("data:")) {
    const m = photo.dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!m) return null;
    return { mimeType: m[1], base64: m[2] };
  }
  if (photo.s3Key) {
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: photoBucketName, Key: photo.s3Key }));
      const body = obj.Body as Readable;
      const buf = await streamToBuffer(body);
      return { mimeType: obj.ContentType || "image/jpeg", base64: buf.toString("base64") };
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!ai) {
    return NextResponse.json({ error: "GEMINI_API_KEY が未設定です" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const itemLabel: string = String(body.itemLabel || "").trim();
    const category: string = String(body.category || "").trim();
    const photos: IncomingPhoto[] = Array.isArray(body.photos) ? body.photos : [];

    if (!itemLabel) {
      return NextResponse.json({ error: "点検項目名が必要です" }, { status: 400 });
    }
    if (photos.length === 0) {
      return NextResponse.json({ error: "判定対象の写真がありません" }, { status: 400 });
    }

    const resolved = (await Promise.all(photos.slice(0, 8).map(resolveImage))).filter(
      (p): p is ImagePart => p !== null
    );
    if (resolved.length === 0) {
      return NextResponse.json({ error: "画像データの取得に失敗しました" }, { status: 400 });
    }

    const systemInstruction = `あなたは飲食店のQSC点検（品質・サービス・清潔）の専門家です。提供された写真と点検項目に基づき、その項目の状態を客観的に判定してください。

判定区分:
- ok: 問題なし。清潔で整理整頓されており、合格レベル。
- hold: 写真からは明確に判断できない／一部改善余地あり／要確認。
- ng: 明確な問題あり（ホコリ蓄積・油汚れ・乱雑・破損・整理整頓不良など）。

判定は点検項目の主旨に沿って総合判断してください。例えば「換気扇」ならホコリ・油汚れを重視、「冷蔵庫内」なら整理整頓・清潔さを重視。
理由文は日本語で具体的に、写真から確認できる事実を80〜140文字程度で記述してください。`;

    const userText = `点検項目: 「${itemLabel}」${category ? `\nカテゴリ: ${category}` : ""}
添付写真: ${resolved.length}枚

この点検項目について、写真から判定してください。`;

    const parts = [
      ...resolved.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      { text: userText },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedState: { type: Type.STRING, enum: ["ok", "hold", "ng"] },
            confidence: { type: Type.NUMBER, description: "0.0〜1.0の信頼度" },
            reasoning: { type: Type.STRING, description: "判定理由（80〜140文字程度）" },
          },
          required: ["recommendedState", "confidence", "reasoning"],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "AI応答が空でした" }, { status: 502 });
    }
    let parsed: { recommendedState: string; confidence: number; reasoning: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "AI応答の解析に失敗しました" }, { status: 502 });
    }

    const state = ["ok", "hold", "ng"].includes(parsed.recommendedState) ? parsed.recommendedState : "hold";
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const reasoning = String(parsed.reasoning || "").slice(0, 400);

    return NextResponse.json({ recommendedState: state, confidence, reasoning, photoCount: resolved.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI判定でエラーが発生しました";
    console.error("ai-analysis error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
