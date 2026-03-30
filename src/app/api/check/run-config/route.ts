import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

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

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId")?.trim();

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId が必要です。" },
        { status: 400 }
      );
    }

    // 0. 店舗メタデータ取得（店名表示用）
    const storeMetaRes = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `STORE#${storeId}`,
          SK: "METADATA",
        },
      })
    );

    const storeMeta = storeMetaRes.Item;

    if (!storeMeta) {
      return NextResponse.json(
        { error: "店舗情報が見つかりません。" },
        { status: 404 }
      );
    }

    // 1. 店舗に紐づくアセット取得
    const bindingRes = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `STORE#${storeId}`,
          SK: "ASSET",
        },
      })
    );

    if (!bindingRes.Item) {
      return NextResponse.json(
        {
          error: "この店舗にはアセットが割り当てられていません。",
          storeId,
          storeName: String(storeMeta.name ?? "").trim(),
          companyName: String(storeMeta.corpName ?? "").trim(),
          bizName: String(storeMeta.bizName ?? "").trim(),
          brandName: String(storeMeta.brand ?? storeMeta.brandName ?? "").trim(),
          areaName: String(storeMeta.areaName ?? "").trim(),
          questions: [],
        },
        { status: 404 }
      );
    }

    const binding = bindingRes.Item;
    const assetId = String(binding.assetId ?? "").trim();

    if (!assetId) {
      return NextResponse.json(
        {
          error: "アセットIDが取得できませんでした。",
          storeId,
          storeName: String(storeMeta.name ?? "").trim(),
          companyName: String(storeMeta.corpName ?? "").trim(),
          bizName: String(storeMeta.bizName ?? "").trim(),
          brandName: String(storeMeta.brand ?? storeMeta.brandName ?? "").trim(),
          areaName: String(storeMeta.areaName ?? "").trim(),
          questions: [],
        },
        { status: 404 }
      );
    }

    // 2. GSI(StoreIdIndex)で店舗に紐づくデータ取得
    const queryRes = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "StoreIdIndex",
        KeyConditionExpression: "storeId = :storeId",
        ExpressionAttributeValues: {
          ":storeId": storeId,
        },
      })
    );

    const rawItems = queryRes.Items || [];

    // 3. QUESTION のみ抽出して有効なものだけ残す
    const activeQuestions = rawItems
      .filter((item: any) => String(item.PK ?? "").startsWith("QUESTION#"))
      .filter((item: any) => item.isActive !== false);

    // 4. area ごとにグルーピング
    const sectionsMap = new Map<string, RunSection>();

    activeQuestions.forEach((q: any) => {
      const areaId = String(q.areaId ?? "sec_default");
      const areaName = String(q.areaName ?? "その他");

      if (!sectionsMap.has(areaId)) {
        sectionsMap.set(areaId, {
          id: areaId,
          title: areaName,
          items: [],
        });
      }

      sectionsMap.get(areaId)!.items.push({
        id: String(q.questionId ?? String(q.PK ?? "").replace("QUESTION#", "")),
        label: String(q.text ?? q.name ?? "名称未設定"),
        state: "unset",
        note: "",
        holdNote: "",
        photos: [],
      });
    });

    const questions = Array.from(sectionsMap.values());

    return NextResponse.json({
      ok: true,
      storeId,
      storeName: String(storeMeta.name ?? "").trim(),
      companyName: String(storeMeta.corpName ?? "").trim(),
      bizName: String(storeMeta.bizName ?? "").trim(),
      brandName: String(storeMeta.brand ?? storeMeta.brandName ?? "").trim(),
      areaName: String(storeMeta.areaName ?? "").trim(),
      assetId,
      questions,
    });
  } catch (e) {
    console.error("GET /api/check/run-config error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "取得失敗" },
      { status: 500 }
    );
  }
}