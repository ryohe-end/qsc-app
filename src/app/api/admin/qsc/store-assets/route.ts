import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const region =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const tableName = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const client = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function storePk(storeId: string) {
  return `STORE#${storeId}`;
}

function storeAssetSk() {
  return "ASSET";
}

/**
 * 1店舗 = 1アセット = 1レコード
 * PK = STORE#<storeId>
 * SK = ASSET
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const storeId = String(body.storeId || "").trim();
    const assetId = String(body.assetId || "").trim();
    const isActive = body.isActive !== false;
    const updatedAt = new Date().toISOString();

    console.log("[store-assets POST] request", {
      storeId,
      assetId,
      isActive,
    });

    if (!storeId) {
      return jsonError("storeId は必須です");
    }

    if (!assetId) {
      return jsonError("assetId は必須です");
    }

    const pk = storePk(storeId);

    const meta = await ddb.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: pk,
          SK: "METADATA",
        },
        ConsistentRead: true,
      })
    );

    if (!meta.Item) {
      return jsonError("対象店舗の META レコードが見つかりません", 404);
    }

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pk,
          SK: storeAssetSk(),
          entityType: "STORE_ASSET",
          type: "STORE_ASSET",
          storeId,
          assetId,
          isActive,
          updatedAt,
        },
      })
    );

    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: pk,
          SK: "METADATA",
        },
        UpdateExpression: "SET assetId = :assetId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":assetId": assetId,
          ":updatedAt": updatedAt,
        },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      })
    );

    console.log("[store-assets saved]", {
      PK: pk,
      SK: storeAssetSk(),
      storeId,
      assetId,
      isActive,
      updatedAt,
    });

    return NextResponse.json({
      ok: true,
      item: {
        storeId,
        assetId,
        isActive,
        updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/admin/qsc/store-assets]", error);

    if (error?.name === "ConditionalCheckFailedException") {
      return jsonError("対象店舗の META レコードが見つかりません", 404);
    }

    return jsonError(error?.message || "アセット紐付けの保存に失敗しました", 500);
  }
}