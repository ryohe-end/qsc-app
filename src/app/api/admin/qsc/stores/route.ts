import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoreStatus = "active" | "inactive" | "archived";

type Manager = { email: string; name: string };

type StoreRow = {
  storeId: string;
  clubCode: number;
  name: string;
  brandName: string;
  businessTypeName: string;
  companyName: string;
  corporateName: string;
  status: StoreStatus;
  assetId?: string;
  emails: string[];
  email?: string;       // 通知先メール（単数・bulk-update用）
  managers?: Manager[]; // 担当者
  updatedAt?: string;
  version?: number;
  corpId?: string;
  brandId?: string;
};

type StoreMetaItem = {
  PK: string;
  SK: "METADATA";
  type: "STORE";
  areaId?: string;
  areaName?: string;
  assetId?: string;
  bizId?: string;
  bizName?: string;
  brand?: string;
  brandId?: string;
  category?: string;
  clubCode?: number;
  corpId?: string;
  corpName?: string;
  description?: string;
  isActive?: boolean;
  name?: string;
  storeId?: string;
  updatedAt?: string;
  emails?: string[];
  email?: string;
  managers?: Manager[];
  status?: StoreStatus;
  version?: number;
};

type CorpMetaItem = {
  PK: string;
  SK: "METADATA";
  type: "CORP";
  corpId?: string;
  corpName?: string;
  name?: string;
  isActive?: boolean;
};

type BrandMetaItem = {
  PK: string;
  SK: "METADATA";
  type: "BRAND";
  brandId?: string;
  brand?: string;
  name?: string;
  isActive?: boolean;
};

type BizMetaItem = {
  PK: string;
  SK: "METADATA";
  type: "BIZ";
  bizId?: string;
  bizName?: string;
  name?: string;
  isActive?: boolean;
};

type StoreAssetItem = {
  PK: string;
  SK: "ASSET";
  entityType?: string;
  type?: string;
  storeId?: string;
  assetId?: string;
  isActive?: boolean;
  updatedAt?: string;
};

const region =
  process.env.QSC_AWS_REGION || "us-east-1" || process.env.AWS_DEFAULT_REGION || "us-east-1";
const tableName = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const client = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function storePk(storeId: string) { return `STORE#${storeId}`; }
function corpPk(corpId: string) { return `CORP#${corpId}`; }
function brandPk(brandId: string) { return `BRAND#${brandId}`; }
function storeMetaKey(storeId: string) { return { PK: storePk(storeId), SK: "METADATA" as const }; }
function corpMetaKey(corpId: string) { return { PK: corpPk(corpId), SK: "METADATA" as const }; }
function brandMetaKey(brandId: string) { return { PK: brandPk(brandId), SK: "METADATA" as const }; }

/* ========================= managers の正規化 ========================= */
function normalizeManagers(input: unknown): Manager[] {
  if (!Array.isArray(input)) return [];
  return input.map((m: unknown) => {
    if (typeof m === "object" && m !== null) {
      const obj = m as Record<string, unknown>;
      // DynamoDB形式 { M: { email: { S: "..." }, name: { S: "..." } } }
      if (obj.M && typeof obj.M === "object") {
        const inner = obj.M as Record<string, { S?: string }>;
        return {
          email: String(inner.email?.S || "").trim(),
          name: String(inner.name?.S || "").trim(),
        };
      }
      // 通常形式 { email: "...", name: "..." }
      return {
        email: String(obj.email || "").trim(),
        name: String(obj.name || "").trim(),
      };
    }
    return { email: "", name: "" };
  }).filter(m => m.email);
}

function normalizeStore(input: Record<string, unknown>): StoreRow {
  // emailsの正規化: email単数 or emails配列どちらでも対応
  let emails: string[] = [];
  if (Array.isArray(input.emails)) {
    emails = input.emails.map((v: unknown) => String(v || "").trim()).filter(Boolean);
  } else if (input.email && typeof input.email === "string" && input.email.trim()) {
    emails = [input.email.trim()];
  }

  return {
    storeId: String(input.storeId || "").trim(),
    clubCode: Number(input.clubCode || 0),
    name: String(input.name || "").trim(),
    brandName: String(input.brandName || "").trim(),
    businessTypeName: String(input.businessTypeName || "").trim(),
    companyName: String(input.companyName || "").trim(),
    corporateName: String(input.corporateName || "").trim(),
    status: (input.status || "active") as StoreStatus,
    assetId:
      input.assetId === null || input.assetId === undefined || input.assetId === ""
        ? undefined
        : String(input.assetId).trim(),
    emails,
    email: emails[0] || "",
    managers: normalizeManagers(input.managers),
    updatedAt: input.updatedAt ? String(input.updatedAt) : new Date().toISOString(),
    version: Number(input.version || 1),
    corpId: input.corpId ? String(input.corpId).trim() : undefined,
    brandId: input.brandId ? String(input.brandId).trim() : undefined,
  };
}

function validateStore(store: StoreRow) {
  if (!store.storeId) throw new Error("storeId は必須です");
  if (!store.name) throw new Error("店舗名は必須です");
  if (!store.clubCode || Number.isNaN(store.clubCode)) throw new Error("クラブコードは必須です");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = store.emails.find((email) => !emailRegex.test(email));
  if (invalid) throw new Error(`メールアドレスの形式が不正です: ${invalid}`);
}

function toStoreMetaItem(store: StoreRow, prev?: Partial<StoreMetaItem>): StoreMetaItem {
  return {
    PK: storePk(store.storeId),
    SK: "METADATA",
    type: "STORE",
    areaId: prev?.areaId || "",
    areaName: prev?.areaName || "",
    assetId: store.assetId !== undefined ? store.assetId : prev?.assetId || "",
    bizId: prev?.bizId || "",
    bizName: store.businessTypeName || prev?.bizName || "",
    brand: prev?.brand || "",
    brandId: store.brandId || prev?.brandId || "",
    category: prev?.category || "",
    clubCode: store.clubCode,
    corpId: store.corpId || prev?.corpId || "",
    corpName: prev?.corpName || "",
    description: prev?.description || "",
    isActive: prev?.isActive ?? true,
    name: store.name,
    storeId: store.storeId,
    updatedAt: store.updatedAt || new Date().toISOString(),
    emails: store.emails,
    email: store.emails[0] || prev?.email || "",
    managers: store.managers || prev?.managers || [],
    status: store.status,
    version: store.version || 1,
  };
}

function fromStoreMetaItem(
  item: StoreMetaItem,
  corporateName = "",
  brandName = ""
): StoreRow {
  // emailsの取得: emails配列 or email単数 どちらでも対応
  let emails: string[] = [];
  if (Array.isArray(item.emails) && item.emails.length > 0) {
    emails = item.emails.map((v) => String(v));
  } else if (item.email && String(item.email).trim()) {
    emails = [String(item.email).trim()];
  }

  return {
    storeId: String(item.storeId || ""),
    clubCode: Number(item.clubCode || 0),
    name: String(item.name || ""),
    brandName: brandName || String(item.brand || ""),
    businessTypeName: String(item.bizName || ""),
    companyName: "",
    corporateName: corporateName || String(item.corpName || ""),
    status: (item.status || "active") as StoreStatus,
    assetId:
      item.assetId === null || item.assetId === undefined || item.assetId === ""
        ? undefined
        : String(item.assetId),
    emails,
    email: emails[0] || "",
    managers: normalizeManagers(item.managers),
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
    version: Number(item.version || 0),
    corpId: item.corpId ? String(item.corpId) : undefined,
    brandId: item.brandId ? String(item.brandId) : undefined,
  };
}

function sortStores(items: StoreRow[]) {
  return [...items].sort((a, b) => {
    const aCode = Number(a.clubCode || 0);
    const bCode = Number(b.clubCode || 0);
    if (aCode !== bCode) return aCode - bCode;
    return String(a.name || "").localeCompare(String(b.name || ""), "ja");
  });
}

async function loadCorpName(corpId?: string) {
  if (!corpId) return "";
  const res = await ddb.send(new GetCommand({ TableName: tableName, Key: corpMetaKey(corpId), ConsistentRead: true }));
  const item = res.Item as CorpMetaItem | undefined;
  if (!item) return "";
  return String(item.corpName || item.name || "");
}

async function loadBrandName(brandId?: string) {
  if (!brandId) return "";
  const res = await ddb.send(new GetCommand({ TableName: tableName, Key: brandMetaKey(brandId), ConsistentRead: true }));
  const item = res.Item as BrandMetaItem | undefined;
  if (!item) return "";
  return String(item.brand || item.name || "");
}

async function scanAllBrandItems(): Promise<{ brandId: string; brandName: string }[]> {
  try {
    const res = await ddb.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "#type = :t AND SK = :sk",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":t": "BRAND", ":sk": "METADATA" },
    }));
    return (res.Items ?? [])
      .map(i => {
        const item = i as BrandMetaItem;
        return {
          brandId: String(item.brandId || item.PK?.replace("BRAND#", "") || ""),
          brandName: String(item.brand || item.name || ""),
        };
      })
      .filter(b => b.brandId && b.brandName);
  } catch { return []; }
}

async function scanAllBizItems(): Promise<{ bizId: string; bizName: string }[]> {
  try {
    const res = await ddb.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "#type = :t AND SK = :sk",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":t": "BIZ", ":sk": "METADATA" },
    }));
    return (res.Items ?? [])
      .map(i => {
        const item = i as BizMetaItem;
        return {
          bizId: String(item.bizId || item.PK?.replace("BIZ#", "") || ""),
          bizName: String(item.bizName || item.name || ""),
        };
      })
      .filter(b => b.bizId && b.bizName);
  } catch { return []; }
}

async function scanAllStoreMetaItems() {
  const allItems: StoreMetaItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined = undefined;
  let result: ScanCommandOutput;

  do {
    result = await ddb.send(new ScanCommand({
      TableName: tableName,
      ConsistentRead: true,
      FilterExpression: "#type = :storeType AND SK = :sk",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":storeType": "STORE", ":sk": "METADATA" },
      ExclusiveStartKey,
    }));

    if (Array.isArray(result.Items)) {
      allItems.push(...(result.Items as StoreMetaItem[]));
    }
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  return allItems;
}

async function loadStoreAsset(storeId: string): Promise<StoreAssetItem | undefined> {
  const res = await ddb.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: { ":pk": storePk(storeId), ":sk": "ASSET" },
    ConsistentRead: true,
    Limit: 1,
  }));
  const items = Array.isArray(res.Items) ? (res.Items as StoreAssetItem[]) : [];
  return items[0];
}

export async function GET() {
  try {
    const storeMetaItems = await scanAllStoreMetaItems();

    const corpIds = new Set<string>();
    const brandIds = new Set<string>();
    for (const item of storeMetaItems) {
      if (item.corpId) corpIds.add(String(item.corpId));
      if (item.brandId) brandIds.add(String(item.brandId));
    }

    const corpNameMap = new Map<string, string>();
    const brandNameMap = new Map<string, string>();

    await Promise.all([
      ...Array.from(corpIds).map(async (corpId) => {
        corpNameMap.set(corpId, await loadCorpName(corpId));
      }),
      ...Array.from(brandIds).map(async (brandId) => {
        brandNameMap.set(brandId, await loadBrandName(brandId));
      }),
    ]);

    const items = await Promise.all(
      storeMetaItems.map(async (item) => {
        const corpId = item.corpId ? String(item.corpId) : "";
        const brandId = item.brandId ? String(item.brandId) : "";
        const store = fromStoreMetaItem(item, corpNameMap.get(corpId) || "", brandNameMap.get(brandId) || "");

        if (store.assetId) return store;

        const storeAsset = await loadStoreAsset(store.storeId);
        return {
          ...store,
          assetId: storeAsset?.isActive !== false && storeAsset?.assetId
            ? String(storeAsset.assetId)
            : undefined,
        };
      })
    );

    // BRAND/BIZ マスターも返す
    const [brands, bizTypes] = await Promise.all([
      scanAllBrandItems(),
      scanAllBizItems(),
    ]);

    return NextResponse.json({ items: sortStores(items), brands, bizTypes });
  } catch (error) {
    console.error("[GET /api/admin/qsc/stores]", error);
    return jsonError("店舗一覧の取得に失敗しました", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const normalized = normalizeStore(body);
    const store: StoreRow = {
      ...normalized,
      storeId: normalized.storeId || `S_${Date.now()}`,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    validateStore(store);

    const key = storeMetaKey(store.storeId);
    const existing = await ddb.send(new GetCommand({ TableName: tableName, Key: key, ConsistentRead: true }));
    if (existing.Item) return jsonError("同じ店舗IDのレコードがすでに存在します", 409);

    await ddb.send(new PutCommand({
      TableName: tableName,
      Item: toStoreMetaItem(store),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    const [corpName, brandName] = await Promise.all([loadCorpName(store.corpId), loadBrandName(store.brandId)]);
    return NextResponse.json({ ok: true, item: { ...store, corporateName: corpName, brandName } });
  } catch (error: unknown) {
    console.error("[POST /api/admin/qsc/stores]", error);
    if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
      return jsonError("同じ店舗IDのレコードがすでに存在します", 409);
    }
    return jsonError((error as Error)?.message || "店舗の新規登録に失敗しました", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const normalized = normalizeStore(body);
    if (!normalized.storeId) return jsonError("storeId は必須です");

    const key = storeMetaKey(normalized.storeId);
    const existing = await ddb.send(new GetCommand({ TableName: tableName, Key: key, ConsistentRead: true }));
    if (!existing.Item) return jsonError("更新対象の店舗が見つかりません", 404);

    const prevItem = existing.Item as StoreMetaItem;
    const prevRow = fromStoreMetaItem(prevItem);

    const store: StoreRow = {
      ...prevRow,
      ...normalized,
      storeId: prevRow.storeId,
      assetId: normalized.assetId !== undefined ? normalized.assetId : prevRow.assetId,
      updatedAt: new Date().toISOString(),
      version: Number(prevRow.version || 0) + 1,
    };
    validateStore(store);

    await ddb.send(new PutCommand({
      TableName: tableName,
      Item: toStoreMetaItem(store, prevItem),
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
    }));

    const [corpName, brandName] = await Promise.all([loadCorpName(store.corpId), loadBrandName(store.brandId)]);
    return NextResponse.json({ ok: true, item: { ...store, corporateName: corpName, brandName } });
  } catch (error: unknown) {
    console.error("[PUT /api/admin/qsc/stores]", error);
    if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
      return jsonError("更新対象の店舗が見つかりません", 404);
    }
    return jsonError((error as Error)?.message || "店舗の更新に失敗しました", 500);
  }

}