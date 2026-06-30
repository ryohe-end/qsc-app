import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendCorrectionSubmittedEmail } from "@/app/lib/sendgrid";
import { getAdminEmails } from "@/app/lib/adminEmails";

export const dynamic = "force-dynamic";

/**
 * POST: まとめて送信された是正報告について、admin へ1通だけ提出通知メールを送る。
 * body: { storeName, submittedCount }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (!role) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    const submittedBy = decodeURIComponent(cookieStore.get("qsc_user_name")?.value ?? "店舗担当者");

    const { storeName, submittedCount } = await req.json();
    const count = Number(submittedCount);
    if (!count || count < 1) {
      return NextResponse.json({ error: "submittedCount が不正です" }, { status: 400 });
    }

    const adminEmails = await getAdminEmails();
    if (adminEmails.length > 0) {
      await sendCorrectionSubmittedEmail({
        to: adminEmails,
        storeName: String(storeName || ""),
        submittedCount: count,
        submittedBy,
      });
    }

    return NextResponse.json({ ok: true, notified: adminEmails.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-correction error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
