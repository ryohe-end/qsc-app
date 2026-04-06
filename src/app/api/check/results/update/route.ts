import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

// --- AWS Setup ---
const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * PATCH: 店舗からの是正報告を個別に更新する
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { pk, sk, sectionIndex, itemIndex, correction, status } = body;

    // 1. 必須パラメータのバリデーション
    if (!pk || !sk || sectionIndex === undefined || !itemIndex) {
      return NextResponse.json({ error: "不足しているパラメータがあります" }, { status: 400 });
    }

    // 2. 現在の点検結果（レコード全体）を取得
    const getRes = await docClient.send(new GetCommand({
      TableName: resultTableName,
      Key: { PK: pk, SK: sk }
    }));

    const result = getRes.Item;
    if (!result || !result.sections) {
      return NextResponse.json({ error: "対象の点検結果が見つかりません" }, { status: 404 });
    }

    // 3. 🔴 理想のロジック: 設問ID(itemIndex)に一致する項目の「真の配列番号」を探す
    const section = result.sections[sectionIndex];
    if (!section || !section.items) {
      return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });
    }

    const realItemIndex = section.items.findIndex((it: any) => it.id === itemIndex);

    if (realItemIndex === -1) {
      return NextResponse.json({ 
        error: `設問ID ${itemIndex} がセクション内に見つかりません` 
      }, { status: 404 });
    }

    // 4. DynamoDBの特定要素のみをピンポイントで更新
    // sections[n].items[m] の形式でパスを指定
    const updateExpr = `SET 
      sections[${sectionIndex}].items[${realItemIndex}].correction = :c,
      sections[${sectionIndex}].items[${realItemIndex}].correctionStatus = :s,
      sections[${sectionIndex}].items[${realItemIndex}].updatedAt = :u`;

    await docClient.send(new UpdateCommand({
      TableName: resultTableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: {
        ":c": correction || "",
        ":s": status || "done", // 店舗からの報告なのでデフォルトは 'done'
        ":u": new Date().toISOString()
      }
    }));

    console.log(`[API] Update Success: ${pk} / Item: ${itemIndex}`);

    return NextResponse.json({ ok: true, message: "是正報告を保存しました" });

  } catch (error: any) {
    console.error("Update API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}