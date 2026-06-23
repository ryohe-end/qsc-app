// QSC リマインドメール自動送信 Lambda
// AWS EventBridge Scheduler から毎朝 9:00 (JST) に呼ばれる想定。
// QSC App の /api/admin/send-reminders を CRON_SECRET 付きで叩く。
//
// 必要な環境変数:
//   QSC_APP_URL   ... QSC アプリのオリジン (例: https://qsc.example.com)
//   CRON_SECRET   ... アプリ側 /api/admin/send-reminders と同じ秘密キー
//
// Runtime: Node.js 20.x (fetch がグローバル)
// Handler: index.handler

export const handler = async () => {
  const base = process.env.QSC_APP_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    throw new Error("QSC_APP_URL / CRON_SECRET が未設定です");
  }

  const url = `${base.replace(/\/$/, "")}/api/admin/send-reminders`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-cron-secret": secret },
  });

  const text = await res.text();
  console.log("status:", res.status, "body:", text);

  if (!res.ok) {
    throw new Error(`reminder API failed: ${res.status} ${text}`);
  }

  return { statusCode: res.status, body: text };
};
