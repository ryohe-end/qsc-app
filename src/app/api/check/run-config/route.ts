import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

// --- Types ---
type RunQuestionItem = {
  id: string;
  label: string;
  state: "unset";
  note: string;
  holdNote: string;
  photos: any[];
};

type RunSection = {
  id: string;
  title: string;
  items: RunQuestionItem[];
};

// --- Helpers ---
async function tryGetFirst(keys: Array<{ PK: string; SK: string }>) {
  for (const key of keys) {
    const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    if (res.Item) return res.Item;
  }
  return null;
}

// 🚀 高速化の要: 100件ずつ一気に取得する関数
async function fetchQuestionsInBatches(questionIds: string[]) {
  const chunks: string[][] = [];
  for (let i = 0; i < questionIds.length; i += 100) {
    chunks.push(questionIds.slice(i, i + 100));
  }

  const allFetchedItems: any[] = [];
  const batchPromises = chunks.map(async (chunk) => {
    // 取得したいキーのリストを作成
    let keys = chunk.map((id) => ({ PK: `QUESTION#${id}`, SK: "METADATA" }));
    
    while (keys.length > 0) {
      const res = await docClient.send(new BatchGetCommand({
        RequestItems: { [TABLE_NAME]: { Keys: keys } },
      }));
      const items = res.Responses?.[TABLE_NAME] || [];
      allFetchedItems.push(...items);

      // 未処理のキーがあれば再試行
      keys = (res.UnprocessedKeys?.[TABLE_NAME]?.Keys as any[]) || [];
    }
  });

  await Promise.all(batchPromises);
  return allFetchedItems;
}

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId")?.trim();
    if (!storeId) return NextResponse.json({ error: "storeId が必要です。" }, { status: 400 });

    // 0. 店舗メタデータの取得
    const storeMeta = await tryGetFirst([
      { PK: `STORE#${storeId}`, SK: "METADATA" },
      { PK: `STORE#${storeId}`, SK: "STORE" },
    ]);
    if (!storeMeta) return NextResponse.json({ error: "店舗情報なし" }, { status: 404 });

    // 1. アセット割当の取得
    const binding = await tryGetFirst([
      { PK: `STORE#${storeId}`, SK: "ASSET" },
      { PK: `STORE#${storeId}`, SK: "STORE_ASSET" },
    ]);
    const assetId = binding?.assetId || binding?.AssetId || "";
    if (!assetId) return NextResponse.json({ error: "アセット未割当" }, { status: 404 });

    // 2. アセット本体から設問IDリストを取得
    const asset = await tryGetFirst([
      { PK: `ASSET#${assetId}`, SK: "METADATA" },
      { PK: `ASSET#${assetId}`, SK: "ASSET" },
    ]);
    const questionIds = Array.isArray(asset?.questionIds) ? asset.questionIds : [];
    if (questionIds.length === 0) return NextResponse.json({ questions: [] });

    // 3. 🚀 設問データを一括取得（300件でも一瞬）
    const rawQuestions = await fetchQuestionsInBatches(questionIds);
    const qMap = new Map(rawQuestions.map(q => [q.PK.replace("QUESTION#", ""), q]));

    // 4. 元のID順序を維持しつつセクション分け
    const sectionsMap = new Map<string, RunSection>();
    for (const id of questionIds) {
      const q = qMap.get(id);
      if (!q || q.isActive === false) continue;

      const secId = String(q.place || q.areaId || "default");
      const secTitle = String(q.placeName || q.areaName || q.place || "その他");

      if (!sectionsMap.has(secId)) {
        sectionsMap.set(secId, { id: secId, title: secTitle, items: [] });
      }

      sectionsMap.get(secId)!.items.push({
        id,
        label: String(q.text || q.name || "名称未設定"),
        state: "unset",
        note: "",
        holdNote: "",
        photos: [],
      });
    }

    return NextResponse.json({
      ok: true,
      storeName: String(storeMeta.name || ""),
      assetId,
      questions: Array.from(sectionsMap.values()),
    });
  } catch (e: any) {
    console.error("GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}