import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("qsc_user_id")?.value ?? "";
    const userName  = cookieStore.get("qsc_user_name")?.value ?? "";
    const userRole  = cookieStore.get("qsc_user_role")?.value ?? "";

    if (!userEmail) return NextResponse.json({ error: "未ログインです" }, { status: 401 });

    // DynamoDBから最新情報を取得
    const res = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: userEmail.toLowerCase(), SK: "METADATA" },
    }));

    const user = res.Item;
    return NextResponse.json({
      user: {
        email: userEmail,
        name: user?.name || userName,
        role: user?.role || userRole,
        assignedStoreIds: user?.assignedStoreIds || [],
        corpId: user?.corpId || "",
        status: user?.status || "active",
      }
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

