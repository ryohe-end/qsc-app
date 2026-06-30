import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new DynamoDBClient({ region: process.env.QSC_AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const REQUEST_TABLE = process.env.QSC_REQUEST_TABLE || "QSC_StoreRequestTable";
const MASTER_TABLE  = process.env.QSC_MASTER_TABLE  || "QSC_MasterTable";
const USER_TABLE    = process.env.QSC_USER_TABLE    || "QSC_UserTable";

/* ========================= GET: 一覧取得 ========================= */
export async function GET() {
  try {
    const res = await docClient.send(new ScanCommand({
      TableName: REQUEST_TABLE,
    }));

    const items = (res.Items ?? []).sort((a, b) =>
      (b.requestedAt ?? "").localeCompare(a.requestedAt ?? "")
    );

    return NextResponse.json({ items });
  } catch (e: unknown) {
    console.error("[GET /api/check/store-requests]", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/* ========================= POST: 申請 ========================= */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get("qsc_user_id")?.value ?? "");
    const userName  = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "");

    if (!userEmail) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const body = await req.json();
    const { fromStoreIds, toStoreIds, note } = body as {
      fromStoreIds: string[];
      toStoreIds: string[];
      note?: string;
    };

    if (!toStoreIds || toStoreIds.length === 0) {
      return NextResponse.json({ error: "希望の担当店舗を選択してください" }, { status: 400 });
    }

    const requestId  = `REQ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const requestedAt = new Date().toISOString();

    await docClient.send(new PutCommand({
      TableName: REQUEST_TABLE,
      Item: {
        PK: `REQUEST#${requestId}`,
        SK: "METADATA",
        requestId,
        userEmail: userEmail.toLowerCase(),
        userName,
        fromStoreIds: fromStoreIds ?? [],
        toStoreIds,
        note: note ?? "",
        status: "pending",
        requestedAt,
      },
    }));

    return NextResponse.json({ ok: true, requestId });
  } catch (e: unknown) {
    console.error("[POST /api/check/store-requests]", e);
    return NextResponse.json({ error: "申請に失敗しました" }, { status: 500 });
  }
}

/* ========================= PATCH: 承認・却下 ========================= */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const reviewerEmail = decodeURIComponent(cookieStore.get("qsc_user_id")?.value ?? "");
    const reviewerName  = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "");

    if (!reviewerEmail) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const body = await req.json();
    const { requestIds, action } = body as {
      requestIds: string[];
      action: "approved" | "rejected";
    };

    if (!requestIds || requestIds.length === 0) {
      return NextResponse.json({ error: "対象の申請IDが必要です" }, { status: 400 });
    }
    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
    }

    const reviewedAt = new Date().toISOString();
    const results: { requestId: string; ok: boolean; error?: string }[] = [];

    for (const requestId of requestIds) {
      try {
        // 申請データを取得
        const getRes = await docClient.send(new GetCommand({
          TableName: REQUEST_TABLE,
          Key: { PK: `REQUEST#${requestId}`, SK: "METADATA" },
        }));

        const requestItem = getRes.Item;
        if (!requestItem) {
          results.push({ requestId, ok: false, error: "申請が見つかりません" });
          continue;
        }

        // ステータス更新
        await docClient.send(new UpdateCommand({
          TableName: REQUEST_TABLE,
          Key: { PK: `REQUEST#${requestId}`, SK: "METADATA" },
          UpdateExpression: "SET #status = :status, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": action,
            ":reviewedAt": reviewedAt,
            ":reviewedBy": reviewerName || reviewerEmail,
          },
        }));

        // 承認の場合: QSC_MasterTable の managers を更新
        if (action === "approved") {
          const { userEmail, userName, fromStoreIds, toStoreIds } = requestItem as {
            userEmail: string;
            userName: string;
            fromStoreIds: string[];
            toStoreIds: string[];
          };

          // 削除対象（fromにあってtoにない店舗）
          const toRemove = (fromStoreIds ?? []).filter(id => !(toStoreIds ?? []).includes(id));
          // 追加対象（toにあってfromにない店舗）
          const toAdd = (toStoreIds ?? []).filter(id => !(fromStoreIds ?? []).includes(id));

          // 削除: managers から該当メールを除去
          for (const storeId of toRemove) {
            try {
              const storeRes = await docClient.send(new GetCommand({
                TableName: MASTER_TABLE,
                Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
              }));
              const store = storeRes.Item;
              if (!store) continue;

              const currentManagers: { email: string; name: string }[] = store.managers ?? [];
              const newManagers = currentManagers.filter(m => m.email.toLowerCase() !== userEmail.toLowerCase());

              await docClient.send(new UpdateCommand({
                TableName: MASTER_TABLE,
                Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
                UpdateExpression: "SET managers = :managers, updatedAt = :updatedAt",
                ExpressionAttributeValues: {
                  ":managers": newManagers,
                  ":updatedAt": reviewedAt,
                },
              }));
            } catch (err) {
              console.error(`managers remove error for store ${storeId}:`, err);
            }
          }

          // 追加: managers に追加（重複チェック）
          for (const storeId of toAdd) {
            try {
              const storeRes = await docClient.send(new GetCommand({
                TableName: MASTER_TABLE,
                Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
              }));
              const store = storeRes.Item;
              if (!store) continue;

              const currentManagers: { email: string; name: string }[] = store.managers ?? [];
              const alreadyExists = currentManagers.some(m => m.email.toLowerCase() === userEmail.toLowerCase());

              if (!alreadyExists) {
                const newManagers = [...currentManagers, { email: userEmail.toLowerCase(), name: userName }];
                await docClient.send(new UpdateCommand({
                  TableName: MASTER_TABLE,
                  Key: { PK: `STORE#${storeId}`, SK: "METADATA" },
                  UpdateExpression: "SET managers = :managers, updatedAt = :updatedAt",
                  ExpressionAttributeValues: {
                    ":managers": newManagers,
                    ":updatedAt": reviewedAt,
                  },
                }));
              }
            } catch (err) {
              console.error(`managers add error for store ${storeId}:`, err);
            }
          }
        }

        results.push({ requestId, ok: true });
      } catch (err) {
        console.error(`process error for ${requestId}:`, err);
        results.push({ requestId, ok: false, error: "処理に失敗しました" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    console.error("[PATCH /api/check/store-requests]", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
