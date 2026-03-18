import { NextResponse } from "next/server";
import {
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
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
        FilterExpression: "#type = :store",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":store": { S: "STORE" },
        },
      })
    );

    const items = (res.Items ?? []).map((x) => unmarshall(x));

    const stores = items.map((item) => {
      const pk = String(item.PK ?? "");

      return {
        companyId: String(item.corpId ?? ""),
        companyName: String(item.corpName ?? ""),
        bizId: String(item.bizId ?? ""),
        bizName: String(item.bizName ?? ""),
        brandId: String(item.brandId ?? ""),
        brandName: String(item.brand ?? item.brandName ?? ""),
        areaId: String(item.areaId ?? ""),
        areaName: String(item.areaName ?? ""),
        storeId: pk.replace("STORE#", ""),
        storeName: String(item.name ?? "").trim(),
        status: "new" as const,
      };
    });

    return NextResponse.json({
      ok: true,
      count: stores.length,
      items: stores,
      debug: {
        region: REGION,
        tableName: TABLE_NAME,
        rawCount: items.length,
      },
    });
  } catch (error) {
    console.error("GET /api/check/stores failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
        region: REGION,
        tableName: TABLE_NAME,
      },
      { status: 500 }
    );
  }
}