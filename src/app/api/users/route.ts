import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";

const region = process.env.AWS_REGION || "us-east-1";
const tableName = process.env.QSC_USER_TABLE_NAME || "QSC_UserTable";

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

type UserRole = "admin" | "store" | "inspector";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  corporateName: string;
  status: UserStatus;
  clubCodes: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

type CreateUserBody = {
  userId?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  corporateName?: string;
  status?: UserStatus;
  clubCodes?: string[];
  lastLogin?: string;
};

function isUserRole(v: unknown): v is UserRole {
  return v === "admin" || v === "store" || v === "inspector";
}

function isUserStatus(v: unknown): v is UserStatus {
  return v === "active" || v === "invited" || v === "suspended";
}

function normalizeClubCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    )
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUserId(): string {
  return `U${Date.now()}`;
}

function toUserRow(item: any): UserRow {
  return {
    userId: String(item.userId ?? ""),
    name: String(item.name ?? ""),
    email: String(item.email ?? ""),
    role: isUserRole(item.role) ? item.role : "inspector",
    corporateName: String(item.corporateName ?? ""),
    status: isUserStatus(item.status) ? item.status : "invited",
    clubCodes: normalizeClubCodes(item.clubCodes),
    lastLogin:
      typeof item.lastLogin === "string" && item.lastLogin.trim()
        ? item.lastLogin
        : undefined,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
  };
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    const role = req.nextUrl.searchParams.get("role")?.trim() || "";
    const status = req.nextUrl.searchParams.get("status")?.trim() || "";
    const corporateName =
      req.nextUrl.searchParams.get("corporateName")?.trim() || "";

    const res = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": "USER",
        },
      })
    );

    let items = (res.Items || []).map(toUserRow);

    if (q) {
      items = items.filter((u) => {
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.corporateName.toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q) ||
          u.clubCodes.some((c) => c.toLowerCase().includes(q))
        );
      });
    }

    if (isUserRole(role)) {
      items = items.filter((u) => u.role === role);
    }

    if (isUserStatus(status)) {
      items = items.filter((u) => u.status === status);
    }

    if (corporateName) {
      items = items.filter((u) => u.corporateName === corporateName);
    }

    items.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || "") || 0;
      const bTime = Date.parse(b.updatedAt || "") || 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (e) {
    console.error("GET /api/admin/qsc/users error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ユーザー一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateUserBody;

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role: UserRole = isUserRole(body.role) ? body.role : "inspector";
    const corporateName = String(body.corporateName ?? "").trim();
    const status: UserStatus = isUserStatus(body.status) ? body.status : "invited";
    const clubCodes = normalizeClubCodes(body.clubCodes);
    const lastLogin =
      typeof body.lastLogin === "string" && body.lastLogin.trim()
        ? body.lastLogin
        : undefined;

    if (!name) {
      return NextResponse.json(
        { error: "氏名は必須です。" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスは必須です。" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が不正です。" },
        { status: 400 }
      );
    }

    if (!corporateName) {
      return NextResponse.json(
        { error: "所属企業は必須です。" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const userId = String(body.userId ?? "").trim() || generateUserId();

    const item = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      type: "USER",

      userId,
      name,
      email,
      role,
      corporateName,
      status,
      clubCodes,
      lastLogin,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    return NextResponse.json({
      ok: true,
      item: toUserRow(item),
    });
  } catch (e: any) {
    console.error("POST /api/admin/qsc/users error:", e);

    if (e?.name === "ConditionalCheckFailedException") {
      return NextResponse.json(
        { error: "同じ userId のユーザーが既に存在します。" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ユーザー作成に失敗しました。" },
      { status: 500 }
    );
  }
}