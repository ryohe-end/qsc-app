/**
 * SendGrid 共通ユーティリティ
 * テンプレート一覧:
 * ① sendWelcomeEmail         - アカウント作成
 * ② sendCompletionEmail      - 点検完了
 * ③ sendCorrectionSubmittedEmail - 是正報告提出（管理者通知）
 * ④ sendApprovalEmail        - 承認通知（店舗向け）
 * ⑤ sendRejectionEmail       - 差し戻し通知（店舗向け）
 * ⑥ sendDeadlineReminderEmail - 改善期限リマインダー
 */

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "noreply@joyfit.jp";
const FROM_NAME = "QSC Check";
const APP_URL = "https://main.djvjtfdfn32br.amplifyapp.com";

type Attachment = {
  content: string;
  filename: string;
  type: string;
  disposition?: "attachment" | "inline";
};

type SendEmailParams = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  replyTo?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY が設定されていません");

  const toList = Array.isArray(params.to) ? params.to : [params.to];
  if (toList.filter(Boolean).length === 0) return;

  const body = {
    personalizations: [{ to: toList.filter(Boolean).map(email => ({ email })) }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    ...(params.replyTo ? { reply_to: { email: params.replyTo } } : {}),
    subject: params.subject,
    content: [
      ...(params.text ? [{ type: "text/plain", value: params.text }] : []),
      ...(params.html ? [{ type: "text/html", value: params.html }] : []),
    ],
    ...(params.attachments ? { attachments: params.attachments } : {}),
  };

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`SendGrid送信失敗 [${res.status}]: ${err}`);
  }
}

/* ========================= 共通HTMLパーツ ========================= */
function emailHeader(subtitle: string): string {
  return `<tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 36px;text-align:center;border-radius:24px 24px 0 0;">
    <div style="font-size:20px;font-weight:900;color:#fff;">QSC Check</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">${subtitle}</div>
  </td></tr>`;
}

function emailFooter(): string {
  return `<tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 24px 24px;padding:18px 36px;text-align:center;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">© 2026 QSC Check · このメールは自動送信です</p>
  </td></tr>`;
}

function emailWrapper(rows: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin-top:24px;">
    <p style="font-size:13px;color:#64748b;font-weight:600;margin-bottom:10px;">こちらのURLより確認してください。</p>
    <a href="${url}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:900;">${text} →</a>
    <p style="font-size:12px;color:#94a3b8;margin-top:8px;">${url}</p>
  </div>`;
}

/* ========================= ① アカウント作成メール ========================= */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  email: string;
  password: string;
  loginUrl?: string;
}): Promise<void> {
  const loginUrl = params.loginUrl || `${APP_URL}/login`;
  await sendEmail({
    to: params.to,
    subject: "【QSC Check】アカウントが発行されました",
    html: emailWrapper(`
      ${emailHeader("アカウント発行のお知らせ")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 8px;">${params.name} 様</p>
        <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 28px;">QSC Checkへのアカウントが発行されました。以下のログイン情報でサインインしてください。</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:900;color:#94a3b8;margin-bottom:4px;">ログインID（メールアドレス）</div>
          <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:16px;">${params.email}</div>
          <div style="font-size:12px;font-weight:900;color:#94a3b8;margin-bottom:4px;">パスワード</div>
          <div style="font-size:15px;font-weight:800;color:#1e293b;font-family:monospace;">${params.password}</div>
        </div>
        ${ctaButton("ログインする", loginUrl)}
        <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin-top:24px;">※ セキュリティのため、初回ログイン後にパスワードを変更することをお勧めします。<br>※ このメールに心当たりのない場合は、管理者にお問い合わせください。</p>
      </td></tr>
      ${emailFooter()}
    `),
    text: `${params.name} 様\n\nQSC Checkへのアカウントが発行されました。\n\nログインID: ${params.email}\nパスワード: ${params.password}\n\nこちらのURLよりログインしてください。\n${loginUrl}`.trim(),
  });
}

/* ========================= ② 点検完了メール ========================= */
export async function sendCompletionEmail(params: {
  to: string[];
  storeName: string;
  userName: string;
  inspectionDate: string;
  improvementDeadline: string;
  summary: {
    ok: number; ng: number; hold: number; na: number; unset: number;
    maxScore: number; point: number; photoCount: number;
    categoryScores: Record<string, { ok: number; maxScore: number; point: number }>;
  };
}): Promise<void> {
  if (params.to.length === 0) return;
  const hasNg = params.summary.ng > 0;

  const categoryRows = Object.entries(params.summary.categoryScores).map(([cat, s]) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#64748b;border-bottom:1px solid #f1f5f9;">${cat}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:center;">${s.ok}/${s.maxScore}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:900;border-bottom:1px solid #f1f5f9;text-align:center;color:${s.point >= 80 ? "#059669" : s.point >= 60 ? "#d97706" : "#dc2626"};">${s.point}点</td>
    </tr>`).join("");

  const statCards = [
    { label: "OK", value: params.summary.ok, color: "#059669", bg: "#f0fdf4" },
    { label: "NG", value: params.summary.ng, color: "#dc2626", bg: "#fef2f2" },
    { label: "保留", value: params.summary.hold, color: "#d97706", bg: "#fffbeb" },
    { label: "写真", value: params.summary.photoCount, color: "#6366f1", bg: "#f5f3ff" },
  ].map(({ label, value, color, bg }) =>
    `<td style="width:25%;padding:4px;">
      <div style="background:${bg};border-radius:12px;padding:14px 8px;text-align:center;">
        <div style="font-size:22px;font-weight:950;color:${color};">${value}</div>
        <div style="font-size:11px;font-weight:800;color:${color};margin-top:2px;">${label}</div>
      </div>
    </td>`).join("");

  await sendEmail({
    to: params.to,
    subject: `【QSC点検完了】${params.storeName} - ${params.inspectionDate}`,
    html: emailWrapper(`
      ${emailHeader("点検完了レポート")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <h2 style="font-size:20px;font-weight:900;color:#1e293b;margin:0 0 4px;">${params.storeName}</h2>
        <p style="font-size:13px;color:#94a3b8;font-weight:700;margin:0 0 24px;">点検日: ${params.inspectionDate} &nbsp;|&nbsp; 担当: ${params.userName}</p>
        <div style="background:#f8fafc;border-radius:18px;padding:24px;margin-bottom:20px;text-align:center;">
          <div style="font-size:52px;font-weight:950;color:${params.summary.point >= 80 ? "#059669" : params.summary.point >= 60 ? "#d97706" : "#dc2626"};">${params.summary.point}<span style="font-size:18px;font-weight:700;">点</span></div>
          <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-top:4px;">${params.summary.ok} / ${params.summary.maxScore} 項目クリア</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:left;border-bottom:1px solid #e2e8f0;">カテゴリ</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:center;border-bottom:1px solid #e2e8f0;">OK/対象</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:900;color:#94a3b8;text-align:center;border-bottom:1px solid #e2e8f0;">スコア</th>
          </tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>${statCards}</tr></table>
        ${hasNg ? `
        <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:14px;padding:16px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:900;color:#dc2626;margin-bottom:6px;">⚠️ NG項目が ${params.summary.ng}件 あります</div>
          <div style="font-size:13px;font-weight:600;color:#7f1d1d;line-height:1.6;">改善期限: <strong>${params.improvementDeadline}</strong> までに是正報告を提出してください。</div>
        </div>` : `
        <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:14px;padding:16px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:900;color:#059669;">✅ すべての項目をクリアしました</div>
        </div>`}
        ${ctaButton("結果を確認する", `${APP_URL}/results`)}
      </td></tr>
      ${emailFooter()}
    `),
    text: `【QSC点検完了】${params.storeName}\n点検日: ${params.inspectionDate} / 担当: ${params.userName}\nスコア: ${params.summary.point}点 (${params.summary.ok}/${params.summary.maxScore})\nNG: ${params.summary.ng}件 / 保留: ${params.summary.hold}件\n${hasNg ? `改善期限: ${params.improvementDeadline}` : "全項目クリアしました"}\n\nこちらのURLより結果を確認してください。\n${APP_URL}/results`.trim(),
  });
}

/* ========================= ③ 是正報告提出通知（管理者向け） ========================= */
export async function sendCorrectionSubmittedEmail(params: {
  to: string[];
  storeName: string;
  submittedCount: number;
  submittedBy: string;
}): Promise<void> {
  if (params.to.length === 0) return;
  const url = `${APP_URL}/admin/qsc/improvements`;

  await sendEmail({
    to: params.to,
    subject: `【QSC】是正報告が提出されました - ${params.storeName}`,
    html: emailWrapper(`
      ${emailHeader("是正報告提出通知")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:14px;font-weight:900;color:#d97706;">📋 是正報告が提出されました</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">店舗</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${params.storeName}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">報告件数</td><td style="padding:12px 16px;font-size:14px;font-weight:900;color:#d97706;border-bottom:1px solid #e2e8f0;">${params.submittedCount}件</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;">報告者</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#1e293b;">${params.submittedBy}</td></tr>
        </table>
        ${ctaButton("是正内容を確認する", url)}
      </td></tr>
      ${emailFooter()}
    `),
    text: `【QSC】是正報告が提出されました\n\n店舗: ${params.storeName}\n報告件数: ${params.submittedCount}件\n報告者: ${params.submittedBy}\n\nこちらのURLより確認してください。\n${url}`.trim(),
  });
}

/* ========================= ④ 承認通知（店舗向け） ========================= */
export async function sendApprovalEmail(params: {
  to: string[];
  storeName: string;
  question: string;
  reviewedBy: string;
  reviewNote?: string;
}): Promise<void> {
  if (params.to.length === 0) return;

  await sendEmail({
    to: params.to,
    subject: `【QSC】是正報告が承認されました - ${params.storeName}`,
    html: emailWrapper(`
      ${emailHeader("是正承認通知")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:14px;font-weight:900;color:#059669;">✅ 是正報告が承認されました</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">店舗</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${params.storeName}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">対象項目</td><td style="padding:12px 16px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;line-height:1.4;">${params.question}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;">承認者</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#059669;">${params.reviewedBy}</td></tr>
        </table>
        ${params.reviewNote ? `<div style="background:#f8fafc;border-radius:12px;padding:14px 16px;margin-bottom:20px;"><div style="font-size:12px;font-weight:900;color:#64748b;margin-bottom:6px;">コメント</div><div style="font-size:13px;font-weight:600;color:#1e293b;line-height:1.5;">${params.reviewNote}</div></div>` : ""}
        ${ctaButton("詳細を確認する", `${APP_URL}/results`)}
      </td></tr>
      ${emailFooter()}
    `),
    text: `【QSC】是正報告が承認されました\n\n店舗: ${params.storeName}\n項目: ${params.question}\n承認者: ${params.reviewedBy}${params.reviewNote ? `\nコメント: ${params.reviewNote}` : ""}\n\nこちらのURLより確認してください。\n${APP_URL}/results`.trim(),
  });
}

/* ========================= ⑤ 差し戻し通知（店舗向け） ========================= */
export async function sendRejectionEmail(params: {
  to: string[];
  storeName: string;
  question: string;
  reviewedBy: string;
  reviewNote: string;
}): Promise<void> {
  if (params.to.length === 0) return;

  await sendEmail({
    to: params.to,
    subject: `【QSC】是正報告が差し戻されました - ${params.storeName}`,
    html: emailWrapper(`
      ${emailHeader("差し戻し通知")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:14px;font-weight:900;color:#7c3aed;">⚠️ 是正報告が差し戻されました</div>
          <div style="font-size:13px;font-weight:600;color:#4c1d95;margin-top:6px;">内容を修正して再度ご報告ください。</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">店舗</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${params.storeName}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">対象項目</td><td style="padding:12px 16px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;line-height:1.4;">${params.question}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;">差し戻し者</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#7c3aed;">${params.reviewedBy}</td></tr>
        </table>
        <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:0 12px 12px 0;padding:14px 16px;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:900;color:#7c3aed;margin-bottom:6px;">差し戻し理由</div>
          <div style="font-size:13px;font-weight:600;color:#4c1d95;line-height:1.5;">${params.reviewNote}</div>
        </div>
        ${ctaButton("修正して再報告する", `${APP_URL}/results`)}
      </td></tr>
      ${emailFooter()}
    `),
    text: `【QSC】是正報告が差し戻されました\n\n店舗: ${params.storeName}\n項目: ${params.question}\n差し戻し者: ${params.reviewedBy}\n差し戻し理由: ${params.reviewNote}\n\n内容を修正して再度ご報告ください。\n\nこちらのURLより確認してください。\n${APP_URL}/results`.trim(),
  });
}

/* ========================= ⑥ 改善期限リマインダー ========================= */
export async function sendDeadlineReminderEmail(params: {
  to: string | string[];
  storeName: string;
  deadline: string;
  ngCount: number;
  detailUrl?: string;
}): Promise<void> {
  const url = params.detailUrl || `${APP_URL}/results`;
  await sendEmail({
    to: params.to,
    subject: `【QSC】改善期限のお知らせ - ${params.storeName}`,
    html: emailWrapper(`
      ${emailHeader("改善期限リマインダー")}
      <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:14px;font-weight:900;color:#dc2626;">⏰ 改善期限が3日後に迫っています</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">店舗</td><td style="padding:12px 16px;font-size:14px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${params.storeName}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;border-bottom:1px solid #e2e8f0;">改善期限</td><td style="padding:12px 16px;font-size:14px;font-weight:900;color:#dc2626;border-bottom:1px solid #e2e8f0;">${params.deadline}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;font-weight:900;color:#94a3b8;">未対応NG件数</td><td style="padding:12px 16px;font-size:14px;font-weight:900;color:#dc2626;">${params.ngCount}件</td></tr>
        </table>
        ${ctaButton("是正報告を提出する", url)}
      </td></tr>
      ${emailFooter()}
    `),
    text: `【QSC】改善期限のお知らせ\n\n店舗: ${params.storeName}\n改善期限: ${params.deadline}\n未対応NG: ${params.ngCount}件\n\nこちらのURLより是正報告を提出してください。\n${url}`.trim(),
  });
}
