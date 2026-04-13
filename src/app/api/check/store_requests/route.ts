import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const REQUESTS_TABLE = "QSC_StoreChangeRequests";
const STORES_TABLE   = process.env.QSC_STORE_TABLE_NAME || "QSC_StoreTable";
const USERS_TABLE    = "QSC_UserTable";

/* ========================= GET: 申請一覧 ========================= */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status"); // pending | approved | rejected | all
    const res = await docClient.send(new ScanCommand({ TableName: REQUESTS_TABLE }));
    let items = res.Items ?? [];
    if (status && status !== "all") {
      items = items.filter(i => i.status === status);
    }
    items.sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
    return NextResponse.json({ items });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

/* ========================= POST: 申請作成 ========================= */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("qsc_user_id")?.value ?? "";
    const userName  = cookieStore.get("qsc_user_name")?.value ?? "";

    const body = await req.json();
    const { fromStoreIds, toStoreIds, note } = body;

    if (!userEmail) return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    if (!toStoreIds?.length) return NextResponse.json({ error: "希望店舗を選択してください" }, { status: 400 });

    const requestId = `REQ_${Date.now()}`;
    const now = new Date().toISOString();

    const item = {
      PK: `REQUEST#${requestId}`,
      SK: "METADATA",
      requestId,
      userEmail,
      userName,
      fromStoreIds: fromStoreIds || [],
      toStoreIds,
      note: note || "",
      status: "pending",
      requestedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };

    await docClient.send(new PutCommand({ TableName: REQUESTS_TABLE, Item: item }));
    return NextResponse.json({ ok: true, requestId });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

/* ========================= PATCH: 承認/却下 ========================= */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    const reviewerName = cookieStore.get("qsc_user_name")?.value ?? "管理者";

    if (role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

    const body = await req.json();
    const { requestIds, action } = body; // action: "approved" | "rejected"

    if (!requestIds?.length || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "不正なパラメータです" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results: { requestId: string; ok: boolean; error?: string }[] = [];

    for (const requestId of requestIds) {
      try {
        // 申請データ取得
        const getRes = await docClient.send(new GetCommand({
          TableName: REQUESTS_TABLE,
          Key: { PK: `REQUEST#${requestId}`, SK: "METADATA" },
        }));
        const request = getRes.Item;
        if (!request) { results.push({ requestId, ok: false, error: "申請が見つかりません" }); continue; }
        if (request.status !== "pending") { results.push({ requestId, ok: false, error: "処理済みの申請です" }); continue; }

        // ステータス更新
        await docClient.send(new UpdateCommand({
          TableName: REQUESTS_TABLE,
          Key: { PK: `REQUEST#${requestId}`, SK: "METADATA" },
          UpdateExpression: "SET #s = :s, reviewedAt = :ra, reviewedBy = :rb",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": action, ":ra": now, ":rb": reviewerName },
        }));

        // 承認時のみ店舗・ユーザーデータを更新
        if (action === "approved") {
          await applyStoreChange({
            userEmail: request.userEmail,
            userName: request.userName,
            fromStoreIds: request.fromStoreIds || [],
            toStoreIds: request.toStoreIds || [],
          });
        }

        results.push({ requestId, ok: true });
      } catch (e) {
        results.push({ requestId, ok: false, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

/* ========================= 承認時の店舗・ユーザー更新 ========================= */
async function applyStoreChange(params: {
  userEmail: string;
  userName: string;
  fromStoreIds: string[];
  toStoreIds: string[];
}) {
  const { userEmail, userName, fromStoreIds, toStoreIds } = params;
  const allStoreIds = Array.from(new Set([...fromStoreIds, ...toStoreIds]));

  // 関係する全店舗のmanagersを更新
  await Promise.allSettled(allStoreIds.map(async storeId => {
    const res = await docClient.send(new GetCommand({
      TableName: STORES_TABLE,
      Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
    }));
    const store = res.Item;
    if (!store) return;

    const currentManagers: { email: string; name: string }[] = store.managers || [];
    const shouldBeManager = toStoreIds.includes(storeId);
    const alreadyManager = currentManagers.some(m => m.email === userEmail);

    let newManagers = currentManagers;
    if (shouldBeManager && !alreadyManager) {
      newManagers = [...currentManagers, { email: userEmail, name: userName }];
    } else if (!shouldBeManager && alreadyManager) {
      newManagers = currentManagers.filter(m => m.email !== userEmail);
    } else {
      return;
    }

    await docClient.send(new UpdateCommand({
      TableName: STORES_TABLE,
      Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
      UpdateExpression: "SET managers = :m, updatedAt = :u",
      ExpressionAttributeValues: { ":m": newManagers, ":u": new Date().toISOString() },
    }));
  }));

  // ユーザーの assignedStoreIds を更新
  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { email: userEmail, SK: "METADATA" },
    UpdateExpression: "SET assignedStoreIds = :ids, updatedAt = :u",
    ExpressionAttributeValues: { ":ids": toStoreIds, ":u": new Date().toISOString() },
  }));
}
