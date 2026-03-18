import { NextResponse } from "next/server";
import { docClient } from "@/app/lib/dynamo";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const command = new QueryCommand({
      TableName: "QSC_LogTable",
      KeyConditionExpression: "logType = :type",
      ExpressionAttributeValues: {
        ":type": "NEWS",
      },
      ScanIndexForward: false, // 最新順
      Limit: 10,
    });

    const { Items } = await docClient.send(command);
    return NextResponse.json(Items || []);
  } catch (error: any) {
    console.error("DynamoDB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}