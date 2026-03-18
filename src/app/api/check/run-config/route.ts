import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  GetItemCommand,
  BatchGetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId が必要です。" }, { status: 400 });
    }

    // 1. store -> asset binding
    const bindingRes = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `STORE#${storeId}`,
          SK: "ASSET",
        }),
      })
    );

    if (!bindingRes.Item) {
      return NextResponse.json(
        { error: "この店舗にはアセットが割り当てられていません。" },
        { status: 404 }
      );
    }

    const binding = unmarshall(bindingRes.Item);
    const assetId = binding.assetId as string;

    // 2. asset
    const assetRes = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `ASSET#${assetId}`,
          SK: "METADATA",
        }),
      })
    );

    if (!assetRes.Item) {
      return NextResponse.json(
        { error: "アセットが見つかりません。" },
        { status: 404 }
      );
    }

    const asset = unmarshall(assetRes.Item);
    const questionIds = Array.isArray(asset.questionIds) ? asset.questionIds : [];

    if (questionIds.length === 0) {
      return NextResponse.json({
        storeId,
        binding,
        asset,
        questions: [],
      });
    }

    // 3. questions
    const batchRes = await client.send(
      new BatchGetItemCommand({
        RequestItems: {
          [TABLE_NAME]: {
            Keys: questionIds.map((questionId: string) =>
              marshall({
                PK: `QUESTION#${questionId}`,
                SK: "METADATA",
              })
            ),
          },
        },
      })
    );

    const questionsRaw =
      batchRes.Responses?.[TABLE_NAME]?.map((x) => unmarshall(x)) ?? [];

    const questionMap = new Map(
      questionsRaw.map((q: any) => [q.questionId, q])
    );

    const questions = questionIds
      .map((id: string) => questionMap.get(id))
      .filter(Boolean)
      .filter((q: any) => q.isActive !== false);

    return NextResponse.json({
      storeId,
      binding,
      asset,
      questions,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}