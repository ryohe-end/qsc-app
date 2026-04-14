/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
    QSC_MASTER_TABLE: process.env.QSC_MASTER_TABLE || "QSC_MasterTable",
    QSC_USER_TABLE: process.env.QSC_USER_TABLE || "QSC_UserTable",
    QSC_AWS_REGION: process.env.QSC_AWS_REGION || "us-east-1",
    QSC_PHOTO_BUCKET_NAME: process.env.QSC_PHOTO_BUCKET_NAME || "qsc-check-photos-prod",
    QSC_RESULT_TABLE_NAME: process.env.QSC_RESULT_TABLE_NAME || "QSC_CheckResults",
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