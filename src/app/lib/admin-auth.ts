import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// admin セッションでないと NextResponse(403) を返す。
// 通る場合は null を返し、呼び出し側はそのまま処理を続ける。
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("qsc_user_role")?.value ?? "";
  if (role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  return null;
}
