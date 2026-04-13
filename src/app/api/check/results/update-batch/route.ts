import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const region = process.env.QSC_AWS_REGION || "us-east-1";
const resultTableName = process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type CheckPhoto = {
  id?: string;
  key?: string;
  url?: string;
  contentType?: string;
};

type CheckItem = {
  id?: string;
  label?: string;
  note?: string;
  state?: string;
  correction?: string;
  correctionStatus?: string;
  correctionDate?: string;
  correctionBy?: string;
  photos?: CheckPhoto[];
  afterPhotos?: CheckPhoto[];
  holdNote?: string;
};

type CheckSection = {
  id?: string;
  title?: string;
  items?: CheckItem[];
};

type CheckResultRecord = {
  PK: string;
  SK: string;
  resultId?: string;
  storeName?: string;
  userName?: string;
  sections?: CheckSection[];
  summary?: Record<string, any>;
  updatedAt?: string;
  [key: string]: any;
};

type BatchUpdateInput = {
  pk: string;
  sk: string;
  sectionIndex?: number;
  itemIndex?: string;
  correction?: string;
  status?: string;
  correctionStatus?: string;
  correctionDate?: string;
  correctionBy?: string;
  afterPhotos?: CheckPhoto[];
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function buildGroupKey(pk: string, sk: string) {
  return `${pk}__${sk}`;
}

function resolveTargetItemIndex(items: CheckItem[], itemIndex?: string): number {
  const targetId = normalizeString(itemIndex);
  if (!targetId) return -1;
  return items.findIndex((item) => normalizeString(item.id) === targetId);
}

function computeSummaryPendingCount(sections?: CheckSection[]) {
  let pendingCount = 0;

  for (const sec of sections ?? []) {
    for (const item of sec.items ?? []) {
      if (item.state === "ng" && item.correctionStatus !== "approved") {
        pendingCount++;
      }
    }
  }

  return pendingCount;
}

function computeOverallStatus(sections?: CheckSection[]) {
  const pendingCount = computeSummaryPendingCount(sections);
  return pendingCount > 0 ? "pending" : "done";
}

function applySingleUpdateToRecord(
  record: CheckResultRecord,
  input: BatchUpdateInput
) {
  const sectionIndex = input.sectionIndex;

  if (
    typeof sectionIndex !== "number" ||
    sectionIndex < 0 ||
    sectionIndex >= (record.sections?.length ?? 0)
  ) {
    throw new Error(`sectionIndex が不正です: ${input.sectionIndex}`);
  }

  const sections = [...(record.sections ?? [])];
  const targetSection = sections[sectionIndex];
  const items = [...(targetSection.items ?? [])];

  const itemPos = resolveTargetItemIndex(items, input.itemIndex);
  if (itemPos < 0) {
    throw new Error(`itemIndex に該当する設問が見つかりません: ${input.itemIndex}`);
  }

  const currentItem = items[itemPos];
  const now = new Date().toISOString();

  const nextCorrectionStatus =
    normalizeString(input.correctionStatus) ||
    (normalizeString(input.status) === "done" ? "reported" : "") ||
    currentItem.correctionStatus ||
    "pending";

  items[itemPos] = {
    ...currentItem,
    correction:
      input.correction !== undefined ? String(input.correction) : currentItem.correction,
    correctionStatus: nextCorrectionStatus,
    correctionDate: normalizeString(input.correctionDate) || now,
    correctionBy:
      normalizeString(input.correctionBy) || currentItem.correctionBy || "",
    afterPhotos:
      Array.isArray(input.afterPhotos) && input.afterPhotos.length > 0
        ? input.afterPhotos
        : currentItem.afterPhotos || [],
  };

  sections[sectionIndex] = {
    ...targetSection,
    items,
  };

  return {
    ...record,
    sections,
    updatedAt: now,
    status: computeOverallStatus(sections),
    summary: {
      ...(record.summary ?? {}),
      pendingCount: computeSummaryPendingCount(sections),
    },
  };
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = Array.isArray(body?.updates) ? body.updates : null;

    if (!updates || updates.length === 0) {
      return jsonError("updates は1件以上必要です");
    }

    const grouped = new Map<string, BatchUpdateInput[]>();

    for (const raw of updates as BatchUpdateInput[]) {
      const pk = normalizeString(raw.pk);
      const sk = normalizeString(raw.sk);

      if (!pk || !sk) return jsonError("pk と sk は必須です");
      if (typeof raw.sectionIndex !== "number") {
        return jsonError("sectionIndex は必須です");
      }
      if (!normalizeString(raw.itemIndex)) {
        return jsonError("itemIndex は必須です");
      }

      const key = buildGroupKey(pk, sk);
      const list = grouped.get(key) ?? [];
      list.push({
        ...raw,
        pk,
        sk,
        itemIndex: normalizeString(raw.itemIndex),
      });
      grouped.set(key, list);
    }

    const results: Array<{
      pk: string;
      sk: string;
      ok: boolean;
      updatedCount?: number;
      error?: string;
    }> = [];

    for (const [, groupUpdates] of grouped) {
      const { pk, sk } = groupUpdates[0];

      try {
        const existing = await docClient.send(
          new GetCommand({
            TableName: resultTableName,
            Key: { PK: pk, SK: sk },
            ConsistentRead: true,
          })
        );

        if (!existing.Item) {
          throw new Error("対象の点検結果が見つかりません");
        }

        let workingRecord = existing.Item as CheckResultRecord;

        for (const update of groupUpdates) {
          workingRecord = applySingleUpdateToRecord(workingRecord, update);
        }

        await docClient.send(
          new PutCommand({
            TableName: resultTableName,
            Item: workingRecord,
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          })
        );

        results.push({
          pk,
          sk,
          ok: true,
          updatedCount: groupUpdates.length,
        });
      } catch (error: any) {
        results.push({
          pk,
          sk,
          ok: false,
          error: error?.message || "更新に失敗しました",
        });
      }
    }

    const successGroups = results.filter((r) => r.ok).length;
    const failedGroups = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: failedGroups === 0,
      successGroups,
      failedGroups,
      results,
    });
  } catch (error: any) {
    console.error("[PATCH /api/check/results/update-batch]", error);
    return NextResponse.json(
      { error: error?.message || "一括更新に失敗しました" },
      { status: 500 }
    );
  }
}