import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  sendWelcomeEmail,
  sendCompletionEmail,
  sendCorrectionSubmittedEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendDeadlineReminderEmail,
} from "@/app/lib/sendgrid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("qsc_user_role")?.value ?? "";
    if (role !== "admin") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { type, to } = await req.json();
    if (!to || !type) {
      return NextResponse.json({ error: "type と to は必須です" }, { status: 400 });
    }

    switch (type) {
      case "welcome":
        await sendWelcomeEmail({ to, name: "テストユーザー", email: to, password: "Test1234!" });
        break;
      case "completion":
        await sendCompletionEmail({
          to: [to],
          storeName: "テスト店舗",
          userName: "テスト担当者",
          inspectionDate: new Date().toISOString().split("T")[0],
          improvementDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          summary: {
            ok: 85, ng: 5, hold: 3, na: 2, unset: 0,
            maxScore: 95, point: 89, photoCount: 8,
            categoryScores: {
              Q: { ok: 40, maxScore: 45, point: 88 },
              S: { ok: 25, maxScore: 28, point: 89 },
              C: { ok: 20, maxScore: 22, point: 90 },
            },
          },
        });
        break;
      case "correction_submitted":
        await sendCorrectionSubmittedEmail({
          to: [to],
          storeName: "テスト店舗",
          submittedCount: 3,
          submittedBy: "テストスタッフ",
        });
        break;
      case "approval":
        await sendApprovalEmail({
          to: [to],
          storeName: "テスト店舗",
          question: "入口まわりの清掃が適切に行われているか",
          reviewedBy: "テスト管理者",
          reviewNote: "改善を確認しました。",
        });
        break;
      case "rejection":
        await sendRejectionEmail({
          to: [to],
          storeName: "テスト店舗",
          question: "床と壁の境目、四隅に汚れや埃はないか",
          reviewedBy: "テスト管理者",
          reviewNote: "写真が不鮮明です。再度撮影してください。",
        });
        break;
      case "reminder":
        await sendDeadlineReminderEmail({
          to,
          storeName: "テスト店舗",
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          ngCount: 4,
        });
        break;
      default:
        return NextResponse.json({ error: `不明なtype: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, type, to });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Test email error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
