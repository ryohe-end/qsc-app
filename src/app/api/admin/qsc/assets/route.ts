import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({
  region: process.env.QSC_AWS_REGION || "us-east-1",
});

const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export async function GET() {
  try {
    const res = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const items = (res.Items ?? [])
      .map((x) => unmarshall(x))
      .filter((x) => x.type === "ASSET");

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const item = {
      PK: `ASSET#${body.assetId}`,
      SK: "METADATA",
      type: "ASSET",
      assetId: body.assetId,
      name: body.name,
      description: body.description ?? "",
      isActive: body.isActive ?? true,
      questionIds: body.questionIds ?? [],
      updatedAt: new Date().toISOString(),
    };

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(item, { removeUndefinedValues: true }),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const assetId = req.nextUrl.searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json({ error: "assetId が必要です。" }, { status: 400 });
    }

    await client.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `ASSET#${assetId}`,
          SK: "METADATA",
        }),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}