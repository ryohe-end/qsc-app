import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { QscQuestion, QscQuestionItem, CategoryType } from "@/types/qsc";

export const dynamic = "force-dynamic";

const REGION = process.env.QSC_AWS_REGION || "us-east-1" || "ap-northeast-1";
const TABLE_NAME = process.env.QSC_TABLE_NAME || "QSC_MasterTable";

const client = new DynamoDBClient({ region: REGION });

const PLACE_MASTER = [
  "館外",
  "エントランス",
  "フロント",
  "ジムエリア",
  "レディースエリア",
  "ストレッチ/ファンクショナルエリア",
  "FW",
  "スタジオ",
  "HOTスタジオ",
  "セッションルーム",
  "プール",
  "掲示物",
  "館内",
  "ロッカー",
  "更衣室/チェンジングルーム",
  "お風呂",
  "シャワールーム",
  "トイレ",
  "事務所",
  "スタッフ",
  "オプションサービス",
  "観覧･休憩スペース",
] as const;

const CATEGORY_MASTER: readonly CategoryType[] = ["Q", "S", "C"];

function isValidQuestionBody(body: any): body is QscQuestion {
  if (!body || typeof body !== "object") return false;
  if (typeof body.questionId !== "string" || !body.questionId.trim()) return false;
  if (
    typeof body.place !== "string" ||
    !PLACE_MASTER.includes(body.place as (typeof PLACE_MASTER)[number])
  ) {
    return false;
  }
  if (typeof body.no !== "number" || !Number.isFinite(body.no)) return false;
  if (!CATEGORY_MASTER.includes(body.category)) return false;
  if (typeof body.text !== "string" || !body.text.trim()) return false;
  if (typeof body.weight !== "number" || !Number.isFinite(body.weight)) return false;
  if (typeof body.required !== "boolean") return false;
  if (typeof body.isActive !== "boolean") return false;
  if (typeof body.updatedAt !== "string" || !body.updatedAt) return false;
  return true;
}

function toQuestionItem(question: QscQuestion): QscQuestionItem {
  return {
    PK: `QUESTION#${question.questionId}`,
    SK: "METADATA",
    type: "QUESTION",
    ...question,
  } as QscQuestionItem;
}

export async function GET(req: NextRequest) {
  try {
    const questionId = req.nextUrl.searchParams.get("questionId");

    if (questionId) {
      const res = await client.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({
            PK: `QUESTION#${questionId}`,
            SK: "METADATA",
          }),
        })
      );

      if (!res.Item) {
        return NextResponse.json({ item: null }, { status: 404 });
      }

      const item = unmarshall(res.Item) as QscQuestionItem;
      return NextResponse.json({ item });
    }

    const res = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const items = (res.Items ?? [])
      .map((x) => unmarshall(x) as QscQuestionItem)
      .filter((x) => x.type === "QUESTION")
      .sort((a, b) => {
        if (a.place !== b.place) return a.place.localeCompare(b.place, "ja");
        return a.no - b.no;
      });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/qsc/questions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "設問一覧の取得に失敗しました。",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const normalized: QscQuestion = {
      questionId: String(body.questionId ?? "").trim(),
      place: String(body.place ?? "").trim(),
      no: Number(body.no ?? 1),
      category: body.category as CategoryType,
      text: String(body.text ?? "").trim(),
      weight: Number(body.weight ?? 1),
      required: Boolean(body.required),
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      updatedAt: new Date().toISOString(),
    };

    if (!isValidQuestionBody(normalized)) {
      return NextResponse.json(
        { error: "入力値が不正です。" },
        { status: 400 }
      );
    }

    const item = toQuestionItem(normalized);

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(item, { removeUndefinedValues: true }),
      })
    );

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("POST /api/admin/qsc/questions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "設問の保存に失敗しました。",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const questionId = req.nextUrl.searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId が必要です。" },
        { status: 400 }
      );
    }

    await client.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `QUESTION#${questionId}`,
          SK: "METADATA",
        }),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/qsc/questions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "設問の削除に失敗しました。",
      },
      { status: 500 }
    );
  }
}