import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export async function GET(req: NextRequest) {
  try {
    // 全件スキャンしてNG項目をカウントする
    const res = await docClient.send(new ScanCommand({
      TableName: resultTableName,
    }));

    const allResults = res.Items || [];
    const storeSummaryMap: Record<string, any> = {};

    allResults.forEach((result: any) => {
      let pendingCount = 0;

      // 各項目をチェックして、NGかつ未承認のものをカウント
      result.sections?.forEach((sec: any) => {
        sec.items?.forEach((item: any) => {
          if (item.state === "ng" && item.correctionStatus !== "approved") {
            pendingCount++;
          }
        });
      });

      // NGが1つ以上ある場合のみ、リストに追加
      if (pendingCount > 0) {
        // 同じ店舗で複数の点検記録がある場合、最新のものを優先するか合算するかですが、
        // ここでは「点検記録単位（resultId）」でリスト化するのが安全です。
        storeSummaryMap[result.resultId] = {
          id: result.storeId,
          resultId: result.resultId,
          name: result.storeName,
          pending: pendingCount,
          inspectionDate: result.summary.inspectionDate,
          userName: result.userName
        };
      }
    });

    // オブジェクトを配列に変換して返す
    const storeList = Object.values(storeSummaryMap);

    return NextResponse.json(storeList);
  } catch (error: any) {
    console.error("NG Stores Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}