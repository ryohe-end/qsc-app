import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (role !== "admin" && role !== "inspector") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { pk, sk } = await req.json();
    if (!pk || !sk) {
      return NextResponse.json({ error: "pk と sk は必須です" }, { status: 400 });
    }

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    }));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
