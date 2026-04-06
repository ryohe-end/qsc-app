import { NextApiRequest, NextApiResponse } from "next";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// us-east-1 を明示的に指定
const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const TABLE_NAME = "QSC_MasterTable";

    // type='CORP' かつ isActive=true のものを取得
    // ※ 'type' は予約語なので ExpressionAttributeNames (#t) を使用
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#t = :typeVal AND isActive = :active",
      ExpressionAttributeNames: {
        "#t": "type",
      },
      ExpressionAttributeValues: {
        ":typeVal": "CORP",
        ":active": true,
      },
    });

    const response = await ddbDocClient.send(command);

    // フロントエンドの CorpOption 型に整形
    // { corpId: string, name: string }
    const items = (response.Items || []).map((item) => ({
      corpId: item.corpId,
      name: item.name,
    }));

    return res.status(200).json({ items });
  } catch (error: any) {
    console.error("DynamoDB Scan Error:", error);
    return res.status(500).json({
      error: "法人一覧の取得に失敗しました",
      details: error.message,
    });
  }
}