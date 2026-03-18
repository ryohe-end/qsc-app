import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

/** 1店舗の割当取得 / 全件取得 */
export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");

    if (storeId) {
      const res = await client.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({
            PK: `STORE#${storeId}`,
            SK: "ASSET",
          }),
        })
      );

      return NextResponse.json({
        item: res.Item ? unmarshall(res.Item) : null,
      });
    }

    const res = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const items = (res.Items ?? [])
      .map((x) => unmarshall(x))
      .filter((x: any) => x.type === "STORE_ASSET");

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}

/** 店舗にアセットを保存 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.storeId || !body.assetId) {
      return NextResponse.json(
        { error: "storeId と assetId は必須です。" },
        { status: 400 }
      );
    }

    const item = {
      PK: `STORE#${body.storeId}`,
      SK: "ASSET",
      type: "STORE_ASSET",
      storeId: body.storeId,
      assetId: body.assetId,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      updatedAt: new Date().toISOString(),
    };

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(item, { removeUndefinedValues: true }),
      })
    );

    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}

/** 店舗のアセット割当削除 */
export async function DELETE(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId が必要です。" }, { status: 400 });
    }

    await client.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `STORE#${storeId}`,
          SK: "ASSET",
        }),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}