/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
    QSC_MASTER_TABLE: process.env.QSC_MASTER_TABLE || "QSC_MasterTable",
    QSC_USER_TABLE: process.env.QSC_USER_TABLE || "QSC_UserTable",
    QSC_AWS_REGION: process.env.QSC_AWS_REGION || "us-east-1",
    QSC_PHOTO_BUCKET_NAME: process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod",
    QSC_RESULT_TABLE_NAME: process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    // 管理者ログイン用（server-only。client コードから process.env.ADMIN_* を参照しないこと）
    ADMIN_USER_ID: process.env.ADMIN_USER_ID || "",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
    // EventBridge / Lambda → /api/admin/send-reminders 認証用
    CRON_SECRET: process.env.CRON_SECRET || "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "houjin-manual.s3.us-east-2.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;