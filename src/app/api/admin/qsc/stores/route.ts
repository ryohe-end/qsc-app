import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export const dynamic = "force-dynamic";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

const client = new DynamoDBClient({ region: REGION });

export async function GET() {
  try {
    const res = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const items = (res.Items ?? []).map((x) => unmarshall(x) as Record<string, any>);

    const storeItems = items.filter((x) => x.type === "STORE");
    const storeAssetItems = items.filter((x) => x.type === "STORE_ASSET");

    const assetMap = new Map<string, string>();
    for (const item of storeAssetItems) {
      const storeId = String(item.storeId ?? "");
      const assetId = String(item.assetId ?? "");
      if (storeId) {
        assetMap.set(storeId, assetId);
      }
    }

    const stores = storeItems
      .map((item) => {
        const pk = String(item.PK ?? "");
        const storeId =
          String(item.storeId ?? "") || pk.replace("STORE#", "");

        const rawEmails = item.emails;
        const emails = Array.isArray(rawEmails)
          ? rawEmails.map((x) => String(x)).filter(Boolean)
          : [];

        return {
          storeId,
          clubCode: Number(item.clubCode ?? 0),
          name: String(item.name ?? ""),
          brandName: String(item.brand ?? item.brandName ?? ""),
          businessTypeName: String(item.bizName ?? item.businessTypeName ?? ""),
          companyName: String(item.companyName ?? item.corpName ?? ""),
          corporateName: String(item.corpName ?? item.corporateName ?? ""),
          status: (String(item.status ?? "active") as "active" | "inactive" | "archived"),
          assetId: assetMap.get(storeId),
          emails,
          updatedAt: String(item.updatedAt ?? ""),
          version: Number(item.version ?? 1),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    return NextResponse.json({
      ok: true,
      count: stores.length,
      items: stores,
    });
  } catch (error) {
    console.error("GET /api/admin/qsc/stores error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "店舗一覧の取得に失敗しました。",
        region: REGION,
        tableName: TABLE_NAME,
      },
      { status: 500 }
    );
  }
}