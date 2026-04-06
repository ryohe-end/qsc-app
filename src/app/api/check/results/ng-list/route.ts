import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

// --- AWS Setup ---
const region = process.env.AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * GET: 特定店舗のNG（是正待ち）一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId"); // 例: "S_327"

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    // 全データをスキャン（運用に合わせて Query に変更を推奨）
    const res = await docClient.send(new ScanCommand({ 
      TableName: resultTableName 
    }));

    const allResults = res.Items || [];
    const ngList: any[] = [];

    // IDの正規化（比較しやすくするため）
    const targetStoreId = storeId.replace("STORE#", "");

    allResults.forEach((result: any) => {
      // 1. 店舗IDが一致するかチェック (PK: STORE#S_327)
      if (!result.PK.includes(targetStoreId)) return;

      // 2. セクション内を走査
      result.sections?.forEach((sec: any, sIdx: number) => {
        sec.items?.forEach((item: any) => {
          
          // 🔴 判定条件:
          // ・状態が "ng" である
          // ・かつ、是正ステータスが "approved"（完了済み）ではない
          const isNg = item.state === "ng";
          const isNotApproved = item.correctionStatus !== "approved";

          if (isNg && isNotApproved) {
            ngList.push({
              // 🔴 理想の形: 配列の添字(0)ではなく、DBの設問ID(Q001等)を直接使う
              id: item.id, 
              
              sectionIndex: sIdx, // 更新APIで場所を特定しやすくするために保持
              category: sec.title || "カテゴリ不明",
              question: item.label,
              inspectorNote: item.note || "",
              deadline: result.summary?.improvementDeadline || "期限なし",
              
              // 写真配列の1枚目をBefore写真として使用
              beforePhoto: item.photos?.[0]?.url || "", 
              
              // 是正報告用の現在の値
              comment: item.correction || "",
              correctionStatus: item.correctionStatus || "pending",
              
              // 更新時に必要なキー情報
              storeName: result.storeName || "不明な店舗",
              resultPk: result.PK,
              resultSk: result.SK
            });
          }
        });
      });
    });

    // 日付が新しい順にソート（必要に応じて）
    ngList.sort((a, b) => b.resultSk.localeCompare(a.resultSk));

    console.log(`[API] NG-List extracted: ${ngList.length} items for store ${targetStoreId}`);

    return NextResponse.json(ngList);
  } catch (error: any) {
    console.error("NG List API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}