import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type CheckItem = {
  id?: string;
  state?: string;
  correctionStatus?: string;
};

type CheckSection = {
  id?: string;
  title?: string;
  items?: CheckItem[];
};

type CheckResult = {
  PK?: string;
  SK?: string;
  createdAt?: string;
  resultId?: string;
  sections?: CheckSection[];
  status?: string;
  storeName?: string;
  checkType?: string;
  summary?: {
    inspectionDate?: string;
    improvementDeadline?: string;
  };
  type?: string;
  userName?: string;
};

type StoreSummary = {
  id: string;
  storeId: string;
  name: string;
  pending: number;
  inspectionDate: string;
  userName: string;
  latestResultId?: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStoreIdFromPk(pk?: string): string {
  const raw = normalizeString(pk);
  if (!raw.startsWith("STORE#")) return "";
  return raw.replace(/^STORE#/, "");
}

function getPendingCount(result: CheckResult): number {
  let pendingCount = 0;

  for (const sec of result.sections ?? []) {
    for (const item of sec.items ?? []) {
      if (item.state === "ng" && item.correctionStatus !== "approved") {
        pendingCount++;
      }
    }
  }

  return pendingCount;
}

function isLaterDate(a: string, b: string): boolean {
  if (!a) return false;
  if (!b) return true;
  return a > b;
}

async function scanAllResults(): Promise<CheckResult[]> {
  const allItems: CheckResult[] = [];
  let ExclusiveStartKey: Record<string, any> | undefined = undefined;
  let result: ScanCommandOutput;

  do {
    result = await docClient.send(
      new ScanCommand({
        TableName: resultTableName,
        ExclusiveStartKey,
      })
    );

    if (Array.isArray(result.Items)) {
      allItems.push(...(result.Items as CheckResult[]));
    }

    ExclusiveStartKey = result.LastEvaluatedKey as
      | Record<string, any>
      | undefined;
  } while (ExclusiveStartKey);

  return allItems;
}

export async function GET(_req: NextRequest) {
  try {
    const allResults = await scanAllResults();
    const storeSummaryMap: Record<string, StoreSummary> = {};

    for (const result of allResults) {
      const pk = normalizeString(result.PK);

      // 店舗点検結果だけを見る（セルフチェックは除外）
      if (!pk.startsWith("STORE#") || result.checkType === "self") {
        continue;
      }

      const storeId = getStoreIdFromPk(result.PK);
      const storeName = normalizeString(result.storeName);
      const inspectionDate = normalizeString(result.summary?.inspectionDate);
      const userName = normalizeString(result.userName);
      const resultId = normalizeString(result.resultId);

      const pendingCount = getPendingCount(result);
      if (pendingCount <= 0) {
        continue;
      }

      const existing = storeSummaryMap[storeId];

      if (!existing) {
        storeSummaryMap[storeId] = {
          id: storeId,
          storeId,
          name: storeName || storeId,
          pending: pendingCount,
          inspectionDate,
          userName,
          latestResultId: resultId || undefined,
        };
        continue;
      }

      existing.pending += pendingCount;

      if (!existing.name && storeName) {
        existing.name = storeName;
      }

      if (isLaterDate(inspectionDate, existing.inspectionDate)) {
        existing.inspectionDate = inspectionDate;
        existing.userName = userName;
        existing.latestResultId = resultId || existing.latestResultId;
      }
    }

    const storeList = Object.values(storeSummaryMap).sort((a, b) => {
      if (a.inspectionDate !== b.inspectionDate) {
        return a.inspectionDate < b.inspectionDate ? 1 : -1;
      }
      return a.name.localeCompare(b.name, "ja");
    });

    return NextResponse.json(storeList);
  } catch (error: any) {
    console.error("NG Stores Error:", error);
    return NextResponse.json(
      { error: error?.message || "NG店舗一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}