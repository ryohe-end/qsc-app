import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// gemini-2.5-pro は思考込みで応答が遅いため、関数の実行上限を延長（タイムアウト対策）
export const maxDuration = 60;

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

    const systemInstruction = `あなたは飲食店のQSC点検（品質・サービス・清潔）の専門家AIです。
提供された写真と点検項目に基づき、毎回ぶれない一貫した客観基準で状態を判定します。
判定は「写真から実際に目視で確認できる事実」のみを根拠とし、推測や主観は使いません。
同じ写真には常に同じ判定を返してください。

【判定区分（厳密に適用）】
- ok（合格）: ホコリ・油汚れ・こびり付き・ゴミ・水垢などの汚れが目視で確認できず、整理整頓されている。
- ng（不合格）: 次のいずれかが目視で明確に確認できる — ホコリの蓄積、油汚れ、こびり付き、ゴミ・異物の放置、破損、著しい乱雑。軽微でも明確に見える汚れがあれば ng。
- hold（要確認）: 写真がブレ／暗所／対象に寄れておらず該当箇所を十分確認できない場合、または ok か ng の判断が真に拮抗する場合のみ。安易に hold へ逃げない。

【判定手順（必ずこの順で）】
1. 点検項目の主旨から「重点的に見る箇所」を特定する（例：換気扇＝フィルター/羽根のホコリ・油、冷蔵庫内＝整理整頓・清潔、床/排水溝＝ゴミ・汚れ・水垢、調理台＝こびり付き・油）。
2. その箇所を写真上で観察し、汚れ・異常の有無と程度を具体的に確認する。
3. 上記の区分基準に当てはめて機械的に判定する。

【出力】
- recommendedState: ok / hold / ng のいずれか。
- confidence: 写真の鮮明さと判定の明確さに基づく 0.0〜1.0。不鮮明・拮抗時は低く。
- reasoning: 写真から確認できた事実を日本語80〜140文字で具体的に（どの箇所に何が・どの程度あるか／無いかを明示）。「〜と思われる」等の推測表現は使わない。`;

    const userText = `点検項目: 「${itemLabel}」${category ? `\nカテゴリ: ${category}` : ""}
添付写真: ${resolved.length}枚

この点検項目について、写真から判定してください。`;

    const parts = [
      ...resolved.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      { text: userText },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        // 同じ画像で判定がぶれないよう、貪欲デコード（temperature 0）＋ seed 固定で再現性を高める
        temperature: 0,
        topP: 1,
        seed: 42,
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
        // ホコリ等の微妙な視覚判断の精度を上げるため思考を有効化（旧設定は 0＝思考オフだった）
        thinkingConfig: { thinkingBudget: 2048 },
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
