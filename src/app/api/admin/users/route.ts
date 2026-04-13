import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: { ":sk": "METADATA" },
      ProjectionExpression: "email, #n, #r, storeId",
      ExpressionAttributeNames: {
        "#n": "name",
        "#r": "role",
      },
    }));

    let items = (res.Items ?? []).map(item => ({
      email: String(item.email ?? ""),
      name: String(item.name ?? ""),
      role: String(item.role ?? ""),
      storeId: String(item.storeId ?? ""),
    }));

    if (q) {
      const lower = q.toLowerCase();
      items = items.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
      );
    }

    items.sort((a, b) => a.name.localeCompare(b.name, "ja"));

    return NextResponse.json({ items: items.slice(0, 50) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Users API Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
