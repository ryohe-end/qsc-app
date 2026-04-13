import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const USER_TABLE = "QSC_UserTable";
const MASTER_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

/* store ロールのユーザーのメールから店舗を検索 */
async function findStoreByEmail(email: string): Promise<string[]> {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: MASTER_TABLE,
      FilterExpression: "#type = :t AND SK = :sk AND (contains(emails, :email) OR #email = :email)",
      ExpressionAttributeNames: {
        "#type": "type",
        "#email": "email",
      },
      ExpressionAttributeValues: {
        ":t": "STORE",
        ":sk": "METADATA",
        ":email": email.toLowerCase(),
      },
      ProjectionExpression: "storeId",
    }));

    return (res.Items ?? [])
      .map(item => String(item.storeId || ""))
      .filter(Boolean);
  } catch (e) {
    console.error("findStoreByEmail error:", e);
    return [];
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get("qsc_user_id")?.value ?? "");
    const userName  = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "");
    const userRole  = cookieStore.get("qsc_user_role")?.value ?? "";

    if (!userEmail) return NextResponse.json({ error: "未ログインです" }, { status: 401 });

    // DynamoDBから最新情報を取得
    const res = await docClient.send(new GetCommand({
      TableName: USER_TABLE,
      Key: { email: userEmail.toLowerCase(), SK: "METADATA" },
    }));

    const user = res.Item;
    const role = user?.role || userRole;

    let assignedStoreIds: string[] = user?.assignedStoreIds || [];

    // ✅ store ロールで assignedStoreIds がない場合、メールアドレスから店舗を自動検索
    if (role === "store" && assignedStoreIds.length === 0) {
      assignedStoreIds = await findStoreByEmail(userEmail);
    }

    return NextResponse.json({
      user: {
        email: userEmail,
        name: user?.name || userName,
        role,
        assignedStoreIds,
        corpId: user?.corpId || "",
        status: user?.status || "active",
      }
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
