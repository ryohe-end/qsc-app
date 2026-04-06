import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  ScanCommand 
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resultId = searchParams.get("storeId"); // URLの末尾（UUID）を受け取る

    if (!resultId) {
      return NextResponse.json({ error: "resultIdが必要です" }, { status: 400 });
    }

    // --- ロジック修正: resultId属性が一致するものを全スキャンで探す ---
    // 本来はGSI（インデックス）を使うべきですが、まずは確実に動くScanで対応します
    const res = await docClient.send(new ScanCommand({
      TableName: resultTableName,
      FilterExpression: "resultId = :rid",
      ExpressionAttributeValues: {
        ":rid": resultId
      }
    }));

    if (!res.Items || res.Items.length === 0) {
      return NextResponse.json({ error: `ID:${resultId} のデータが見つかりません` }, { status: 404 });
    }

    // 見つかったデータを返す
    return NextResponse.json(res.Items[0]);

  } catch (error: any) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}