import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const tableName = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type CorpRow = {
  corpId: string;
  name: string;
};

function toCorpRow(item: any): CorpRow | null {
  const pk = String(item?.PK ?? "");
  if (!pk.startsWith("CORP#")) return null;

  const corpId = pk.replace("CORP#", "");
  const name = String(item?.name ?? "").trim();

  if (!name) return null;

  return {
    corpId,
    name,
  };
}

export async function GET() {
  try {
    const res = await docClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    const items = (res.Items || [])
      .map(toCorpRow)
      .filter((v): v is CorpRow => Boolean(v))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (e) {
    console.error("GET /api/admin/qsc/corps error:", e);
    return NextResponse.json(
      { error: "法人一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}