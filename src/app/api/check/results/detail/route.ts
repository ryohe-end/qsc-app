import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.QSC_CHECK_RESULTS_TABLE || "QSC_CheckResults";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const resultId = searchParams.get("resultId");

    if (!storeId || !resultId) {
      return NextResponse.json(
        { message: "storeId and resultId are required" },
        { status: 400 }
      );
    }

    const pk = `STORE#${storeId}`;

    // PK で絞り込んで全件取得し、resultId が一致するものを探す
    // （SK が RESULT#<ISO日時> の形式のため、resultId での直接クエリは不可）
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

    const item = (result.Items ?? []).find(
      (i) => i.resultId === resultId && i.type === "CHECK_RESULT"
    );

    if (!item) {
      return NextResponse.json(
        { message: "result not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      resultId: item.resultId ?? "",
      storeId: item.storeId ?? "",
      storeName: item.storeName ?? "",
      status: item.status ?? "",
      submittedAt: item.submittedAt ?? item.createdAt ?? "",
      sections: item.sections ?? [],
      summary: item.summary ?? null,
    });
  } catch (error) {
    console.error("GET /api/check/results/detail failed", error);
    return NextResponse.json(
      { message: "failed to load check result detail" },
      { status: 500 }
    );
  }
}
