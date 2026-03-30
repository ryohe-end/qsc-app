import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
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

function assetSk(assetId: string) {
  return `ASSET#${assetId}`;
}

/**
 * 店舗アセット紐付け
 * - 指定 asset を active で保存
 * - 同一店舗の他の STORE_ASSET は inactive に更新
 * - ついでに STORE/META の assetId も更新
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const storeId = String(body.storeId || "").trim();
    const assetId = String(body.assetId || "").trim();
    const isActive = body.isActive !== false;
    const updatedAt = new Date().toISOString();

    if (!storeId) {
      return jsonError("storeId は必須です");
    }

    if (!assetId) {
      return jsonError("assetId は必須です");
    }

    const pk = storePk(storeId);

    const existing = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      })
    );

    const items = Array.isArray(existing.Items) ? existing.Items : [];

    const currentAssetLinks = items.filter(
      (item) => item?.entityType === "STORE_ASSET" && typeof item?.assetId === "string"
    );

    await Promise.all(
      currentAssetLinks
        .filter((item) => String(item.assetId) !== assetId && item.isActive !== false)
        .map((item) =>
          ddb.send(
            new UpdateCommand({
              TableName: tableName,
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
              UpdateExpression: "SET isActive = :false, updatedAt = :updatedAt",
              ExpressionAttributeValues: {
                ":false": false,
                ":updatedAt": updatedAt,
              },
            })
          )
        )
    );

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pk,
          SK: assetSk(assetId),
          entityType: "STORE_ASSET",
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