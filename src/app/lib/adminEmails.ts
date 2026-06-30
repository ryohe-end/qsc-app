import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const userTableName = process.env.QSC_USER_TABLE || "QSC_UserTable";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

/** role=admin のユーザーのメールアドレス一覧を取得（是正報告提出通知用） */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: userTableName,
      FilterExpression: "#r = :admin",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: { ":admin": "admin" },
    }));
    return (res.Items ?? [])
      .map(i => String(i.email || i.PK || ""))
      .filter(e => e.includes("@"));
  } catch {
    return [];
  }
}
