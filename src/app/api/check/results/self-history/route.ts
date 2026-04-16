import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.QSC_AWS_REGION || "us-east-1",
});

const ddb = DynamoDBDocumentClient.from(client);

// セルフチェックも同一テーブルに保存し checkType フィールドで区別
const TABLE_NAME = process.env.QSC_CHECK_RESULTS_TABLE || "QSC_CheckResults";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { message: "storeId is required" },
        { status: 400 }
      );
    }

    const pk = `STORE#${storeId}`;

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
        ScanIndexForward: false,
      })
    );

    const items = (result.Items ?? [])
      .filter((item) => item?.type === "CHECK_RESULT" && item?.checkType === "self")
      .map((item) => ({
        pk: item.PK ?? "",
        sk: item.SK ?? "",
        resultId: item.resultId ?? "",
        storeId: item.storeId ?? "",
        storeName: item.storeName ?? "",
        submittedAt: item.submittedAt ?? item.createdAt ?? "",
        status: item.status ?? "",
        userName: item.userName ?? "",
        checkType: "self" as const,
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/check/results/self-history failed", error);
    return NextResponse.json(
      { message: "failed to load self-check result history" },
      { status: 500 }
    );
  }
}
