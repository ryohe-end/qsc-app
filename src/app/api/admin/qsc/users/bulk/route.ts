import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { sendWelcomeEmail } from "@/app/lib/sendgrid";
import { requireAdmin } from "@/app/lib/admin-auth";
import { hashPassword } from "@/app/lib/password";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
const TABLE_NAME = "QSC_UserTable";
const MASTER_TABLE = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

type UserRole = "admin" | "store" | "inspector";
type BulkRow = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  corpId?: string;
  assignedStoreIds?: string[];
};
type FailedRow = { row: number; email: string; reason: string };

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    const users: BulkRow[] = Array.isArray(body.users) ? body.users : [];
    const sendEmailFlag = Boolean(body.sendWelcomeEmail);

    if (users.length === 0) {
      return NextResponse.json({ error: "ユーザーデータが空です" }, { status: 400 });
    }
    if (users.length > 200) {
      return NextResponse.json({ error: "一度に登録できるのは200件までです" }, { status: 400 });
    }

    // 既存ユーザーのメール一覧を1回だけスキャンして重複チェックに使う
    const existing = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: { ":sk": "METADATA" },
      ProjectionExpression: "email",
    }));
    const existingEmails = new Set(
      (existing.Items ?? []).map(it => String(it.email || "").toLowerCase())
    );

    const failed: FailedRow[] = [];
    const created: { email: string; userId: string }[] = [];
    const seenInBatch = new Set<string>();
    // storeId → 追加すべき担当者一覧（inspector ロールのユーザーのみ）
    const storeToManagers = new Map<string, { email: string; name: string }[]>();

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNum = i + 1;
      const email = (u.email || "").trim().toLowerCase();

      if (!u.name || !email) {
        failed.push({ row: rowNum, email, reason: "name と email は必須です" });
        continue;
      }
      if (!u.password) {
        failed.push({ row: rowNum, email, reason: "password は必須です" });
        continue;
      }
      if (!u.corpId) {
        failed.push({ row: rowNum, email, reason: "corpId は必須です" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        failed.push({ row: rowNum, email, reason: "メールアドレスの形式が不正です" });
        continue;
      }
      if (existingEmails.has(email)) {
        failed.push({ row: rowNum, email, reason: "既に登録済みのメールアドレスです" });
        continue;
      }
      if (seenInBatch.has(email)) {
        failed.push({ row: rowNum, email, reason: "CSV内でメールアドレスが重複しています" });
        continue;
      }

      const role: UserRole = u.role && ["admin", "store", "inspector"].includes(u.role) ? u.role : "store";
      const now = new Date().toISOString();
      const userId = `U${Date.now()}${i.toString().padStart(3, "0")}`;
      const plainPassword = String(u.password);
      const hashedPassword = await hashPassword(plainPassword);
      const item = {
        email,
        SK: "METADATA",
        userId,
        name: u.name,
        password: hashedPassword,
        role,
        corpId: u.corpId,
        status: "invited",
        assignedStoreIds: Array.isArray(u.assignedStoreIds) ? u.assignedStoreIds : [],
        createdAt: now,
        updatedAt: now,
      };

      try {
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        seenInBatch.add(email);
        created.push({ email, userId });

        if (role === "inspector" && item.assignedStoreIds.length > 0) {
          for (const storeId of item.assignedStoreIds) {
            const list = storeToManagers.get(storeId) ?? [];
            list.push({ email, name: u.name });
            storeToManagers.set(storeId, list);
          }
        }

        if (sendEmailFlag) {
          try {
            await sendWelcomeEmail({ to: email, name: u.name, email, password: plainPassword });
          } catch (mailErr) {
            console.error(`メール送信失敗 [${email}]:`, mailErr);
            failed.push({ row: rowNum, email, reason: "登録はできましたがメール送信に失敗しました" });
          }
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "登録に失敗しました";
        failed.push({ row: rowNum, email, reason: message });
      }
    }

    // inspector 用：各店舗の managers に新規担当者を追加
    const managerSyncErrors: { storeId: string; reason: string }[] = [];
    await Promise.all(Array.from(storeToManagers.entries()).map(async ([storeId, newManagers]) => {
      try {
        const res = await docClient.send(new GetCommand({
          TableName: MASTER_TABLE,
          Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
          ConsistentRead: true,
        }));
        const storeItem = res.Item;
        if (!storeItem) {
          managerSyncErrors.push({ storeId, reason: "店舗が見つかりません" });
          return;
        }
        const current: { email: string; name: string }[] = Array.isArray(storeItem.managers) ? storeItem.managers : [];
        const currentEmails = new Set(current.map(m => String(m.email || "").toLowerCase()));
        const toAdd = newManagers.filter(m => !currentEmails.has(m.email.toLowerCase()));
        if (toAdd.length === 0) return;

        const merged = [...current, ...toAdd];
        await docClient.send(new PutCommand({
          TableName: MASTER_TABLE,
          Item: {
            ...storeItem,
            managers: merged,
            updatedAt: new Date().toISOString(),
            version: Number(storeItem.version || 0) + 1,
          },
        }));
      } catch (e: unknown) {
        managerSyncErrors.push({ storeId, reason: e instanceof Error ? e.message : "店舗の更新に失敗" });
      }
    }));

    return NextResponse.json({
      ok: created.length,
      failedCount: failed.length,
      failed,
      created,
      managerSyncErrors,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Users Bulk POST Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
