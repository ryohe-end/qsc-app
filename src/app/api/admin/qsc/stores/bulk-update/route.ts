import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const STORES_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";
const USERS_TABLE = "QSC_UserTable";

type BulkRow = {
  storeId: string;
  email: string;
  managers: string[]; // メールアドレスのリスト
};

/* ========================= POST: CSV一括更新 ========================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: BulkRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "データがありません" }, { status: 400 });
    }

    const results: { storeId: string; ok: boolean; error?: string }[] = [];

    for (const row of rows) {
      try {
        const { storeId, email, managers: managerEmails } = row;
        if (!storeId) { results.push({ storeId: "", ok: false, error: "storeIdが空です" }); continue; }

        // 店舗データ取得
        const storeRes = await docClient.send(new GetCommand({
          TableName: STORES_TABLE,
          Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
        }));

        if (!storeRes.Item) {
          results.push({ storeId, ok: false, error: "店舗が見つかりません" });
          continue;
        }

        // 担当者メールからUserTableで名前を取得
        const managerObjects: { email: string; name: string }[] = [];
        for (const managerEmail of managerEmails) {
          if (!managerEmail) continue;
          try {
            const userRes = await docClient.send(new GetCommand({
              TableName: USERS_TABLE,
              Key: { email: managerEmail.toLowerCase().trim(), SK: "METADATA" },
            }));
            const name = userRes.Item?.name || managerEmail;
            managerObjects.push({ email: managerEmail.toLowerCase().trim(), name });
          } catch {
            // ユーザーが見つからない場合はメールアドレスをそのまま使用
            managerObjects.push({ email: managerEmail.toLowerCase().trim(), name: managerEmail });
          }
        }

        // 店舗を更新（emails配列 と managers のみ）
        await docClient.send(new UpdateCommand({
          TableName: STORES_TABLE,
          Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
          UpdateExpression: "SET emails = :e, managers = :m, updatedAt = :u",
          ExpressionAttributeValues: {
            ":e": email ? [email] : [],  // email単数 → emails配列に変換
            ":m": managerObjects,
            ":u": new Date().toISOString(),
          },
        }));

        results.push({ storeId, ok: true });
      } catch (e) {
        results.push({ storeId: row.storeId, ok: false, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.filter(r => !r.ok).length;

    return NextResponse.json({ ok: true, successCount, failCount, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
