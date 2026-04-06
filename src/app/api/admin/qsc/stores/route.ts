import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoreStatus = "active" | "inactive" | "archived";

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

const region =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const tableName = process.env.QSC_MASTER_TABLE || "QSC_MasterTable";

const client = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function storePk(storeId: string) {
  return `STORE#${storeId}`;
}

function corpPk(corpId: string) {
  return `CORP#${corpId}`;
}

function brandPk(brandId: string) {
  return `BRAND#${brandId}`;
}

function storeMetaKey(storeId: string) {
  return {
    PK: storePk(storeId),
    SK: "METADATA" as const,
  };
}

function corpMetaKey(corpId: string) {
  return {
    PK: corpPk(corpId),
    SK: "METADATA" as const,
  };
}

function brandMetaKey(brandId: string) {
  return {
    PK: brandPk(brandId),
    SK: "METADATA" as const,
  };
}

function normalizeStore(input: any): StoreRow {
  return {
    storeId: String(input.storeId || "").trim(),
    clubCode: Number(input.clubCode || 0),
    name: String(input.name || "").trim(),
    brandName: String(input.brandName || "").trim(),
    businessTypeName: String(input.businessTypeName || "").trim(),
    companyName: String(input.companyName || "").trim(),
    corporateName: String(input.corporateName || "").trim(),
    status: (input.status || "active") as StoreStatus,
    assetId: input.assetId ? String(input.assetId).trim() : undefined,
    emails: Array.isArray(input.emails)
      ? input.emails.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [],
    updatedAt: input.updatedAt ? String(input.updatedAt) : new Date().toISOString(),
    version: Number(input.version || 1),
    corpId: input.corpId ? String(input.corpId).trim() : undefined,
    brandId: input.brandId ? String(input.brandId).trim() : undefined,
  };
}

function validateStore(store: StoreRow) {
  if (!store.storeId) {
    throw new Error("storeId は必須です");
  }
  if (!store.name) {
    throw new Error("店舗名は必須です");
  }
  if (!store.clubCode || Number.isNaN(store.clubCode)) {
    throw new Error("クラブコードは必須です");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = store.emails.find((email) => !emailRegex.test(email));
  if (invalid) {
    throw new Error(`メールアドレスの形式が不正です: ${invalid}`);
  }
}

function toStoreMetaItem(store: StoreRow, prev?: Partial<StoreMetaItem>): StoreMetaItem {
  return {
    PK: storePk(store.storeId),
    SK: "METADATA",
    type: "STORE",
    areaId: prev?.areaId || "",
    areaName: prev?.areaName || "",
    assetId: store.assetId || prev?.assetId || "",
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
    status: store.status,
    version: store.version || 1,
  };
}

function fromStoreMetaItem(
  item: StoreMetaItem,
  corporateName = "",
  brandName = ""
): StoreRow {
  return {
    storeId: String(item.storeId || ""),
    clubCode: Number(item.clubCode || 0),
    name: String(item.name || ""),
    brandName: brandName || String(item.brand || ""),
    businessTypeName: String(item.bizName || ""),
    companyName: "",
    corporateName: corporateName || String(item.corpName || ""),
    status: (item.status || "active") as StoreStatus,
    assetId: item.assetId ? String(item.assetId) : undefined,
    emails: Array.isArray(item.emails) ? item.emails.map((v) => String(v)) : [],
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

  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: corpMetaKey(corpId),
    })
  );

  const item = res.Item as CorpMetaItem | undefined;
  if (!item) return "";

  return String(item.corpName || item.name || "");
}

async function loadBrandName(brandId?: string) {
  if (!brandId) return "";

  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: brandMetaKey(brandId),
    })
  );

  const item = res.Item as BrandMetaItem | undefined;
  if (!item) return "";

  return String(item.brand || item.name || "");
}

export async function GET() {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    const rawItems = Array.isArray(result.Items) ? result.Items : [];

    const storeMetaItems = rawItems.filter(
      (item) =>
        item?.type === "STORE" &&
        item?.SK === "METADATA" &&
        typeof item?.storeId === "string"
    ) as StoreMetaItem[];

    const assetMap = new Map<string, string>();
    const corpIds = new Set<string>();
    const brandIds = new Set<string>();

    for (const item of rawItems) {
      const isCurrentStoreAsset =
        item?.SK === "STORE_ASSET" &&
        (item?.entityType === "STORE_ASSET" || typeof item?.storeId === "string");

      if (
        isCurrentStoreAsset &&
        typeof item?.storeId === "string" &&
        typeof item?.assetId === "string" &&
        item?.isActive !== false
      ) {
        assetMap.set(String(item.storeId), String(item.assetId));
      }
    }

    for (const item of storeMetaItems) {
      if (item.corpId) corpIds.add(String(item.corpId));
      if (item.brandId) brandIds.add(String(item.brandId));
    }

    const corpNameMap = new Map<string, string>();
    const brandNameMap = new Map<string, string>();

    await Promise.all([
      ...Array.from(corpIds).map(async (corpId) => {
        const corpName = await loadCorpName(corpId);
        corpNameMap.set(corpId, corpName);
      }),
      ...Array.from(brandIds).map(async (brandId) => {
        const brandName = await loadBrandName(brandId);
        brandNameMap.set(brandId, brandName);
      }),
    ]);

    const items = storeMetaItems.map((item) => {
      const corpId = item.corpId ? String(item.corpId) : "";
      const brandId = item.brandId ? String(item.brandId) : "";

      const corporateName = corpNameMap.get(corpId) || "";
      const brandName = brandNameMap.get(brandId) || "";

      const store = fromStoreMetaItem(item, corporateName, brandName);

      return {
        ...store,
        assetId: assetMap.get(store.storeId) || store.assetId,
      };
    });

    return NextResponse.json({
      items: sortStores(items),
    });
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

    const existing = await ddb.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );

    if (existing.Item) {
      return jsonError("同じ店舗IDのレコードがすでに存在します", 409);
    }

    const item = toStoreMetaItem(store);

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    const [corpName, brandName] = await Promise.all([
      loadCorpName(store.corpId),
      loadBrandName(store.brandId),
    ]);

    return NextResponse.json({
      ok: true,
      item: {
        ...store,
        corporateName: corpName,
        brandName,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/admin/qsc/stores]", error);

    if (error?.name === "ConditionalCheckFailedException") {
      return jsonError("同じ店舗IDのレコードがすでに存在します", 409);
    }

    return jsonError(error?.message || "店舗の新規登録に失敗しました", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const normalized = normalizeStore(body);

    if (!normalized.storeId) {
      return jsonError("storeId は必須です");
    }

    const key = storeMetaKey(normalized.storeId);

    const existing = await ddb.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );

    if (!existing.Item) {
      return jsonError("更新対象の店舗が見つかりません", 404);
    }

    const prevItem = existing.Item as StoreMetaItem;
    const prevRow = fromStoreMetaItem(prevItem);

    const store: StoreRow = {
      ...prevRow,
      ...normalized,
      storeId: prevRow.storeId,
      updatedAt: new Date().toISOString(),
      version: Number(prevRow.version || 0) + 1,
    };

    validateStore(store);

    const item = toStoreMetaItem(store, prevItem);

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      })
    );

    const [corpName, brandName] = await Promise.all([
      loadCorpName(store.corpId),
      loadBrandName(store.brandId),
    ]);

    return NextResponse.json({
      ok: true,
      item: {
        ...store,
        corporateName: corpName,
        brandName,
      },
    });
  } catch (error: any) {
    console.error("[PUT /api/admin/qsc/stores]", error);

    if (error?.name === "ConditionalCheckFailedException") {
      return jsonError("更新対象の店舗が見つかりません", 404);
    }

    return jsonError(error?.message || "店舗の更新に失敗しました", 500);
  }
}