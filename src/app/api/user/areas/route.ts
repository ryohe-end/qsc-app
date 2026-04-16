import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const MASTER_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get("qsc_user_id")?.value ?? "");

    if (!userEmail) {
      return NextResponse.json({ items: [] });
    }

    const lowerEmail = userEmail.toLowerCase();

    // QSC_MasterTable の全 STORE レコードをスキャンし、
    // managers にログインユーザーのメールが含まれる店舗を返す
    const res = await docClient.send(new ScanCommand({
      TableName: MASTER_TABLE,
      FilterExpression: "SK = :sk AND #type = :type",
      ExpressionAttributeNames: { "#type": "type", "#name": "name" },
      ExpressionAttributeValues: { ":sk": "METADATA", ":type": "STORE" },
      ProjectionExpression: "storeId, #name, brand, brandId, managers, emails, email",
    }));

    const items = (res.Items ?? [])
      .filter(item => {
        // managers にメールが含まれるか
        const managers = Array.isArray(item.managers) ? item.managers : [];
        const inManagers = managers.some((m: Record<string, unknown>) => {
          if (typeof m.email === "string" && m.email.toLowerCase() === lowerEmail) return true;
          const inner = m.M as Record<string, { S?: string }> | undefined;
          if (inner?.email?.S && inner.email.S.toLowerCase() === lowerEmail) return true;
          return false;
        });

        // emails / email に含まれるか（store ロール用）
        const emails = Array.isArray(item.emails) ? item.emails : [];
        const singleEmail = typeof item.email === "string" ? item.email : "";
        const inEmails = emails.some((e: string) => e.toLowerCase() === lowerEmail)
          || singleEmail.toLowerCase() === lowerEmail;

        return inManagers || inEmails;
      })
      .map(item => ({
        storeId: String(item.storeId || ""),
        name: String(item.name || ""),
        brandName: String(item.brand || ""),
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/user/areas error:", e);
    return NextResponse.json({ items: [] });
  }
}
