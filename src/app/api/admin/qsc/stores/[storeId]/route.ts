import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const region =
  process.env.QSC_AWS_REGION || "us-east-1" || process.env.AWS_DEFAULT_REGION || "us-east-1";
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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const normalizedStoreId = String(storeId || "").trim();

    if (!normalizedStoreId) {
      return jsonError("storeId が指定されていません");
    }

    const pk = storePk(normalizedStoreId);

    const query = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      })
    );

    const items = Array.isArray(query.Items) ? query.Items : [];

    if (items.length === 0) {
      return jsonError("削除対象の店舗が見つかりません", 404);
    }

    await Promise.all(
      items.map((item) =>
        ddb.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          })
        )
      )
    );

    return NextResponse.json({
      ok: true,
      storeId: normalizedStoreId,
    });
  } catch (error: any) {
    console.error("[DELETE /api/admin/qsc/stores/[storeId]]", error);
    return jsonError(error?.message || "店舗の削除に失敗しました", 500);
  }
}