import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    brands: ["JOYFIT", "FIT365"],
    businessTypesByBrand: {
      JOYFIT: ["JOYFIT24", "JOYFIT LITE", "JOYFIT+", "JOYFIT24 WOMEN"],
      FIT365: ["FIT365", "FIT365 Premium", "FIT365 Express"],
    },
    companies: [
      "第1カンパニー",
      "第2カンパニー",
      "HQカンパニー",
      "デジタルソリューションズ",
    ],
    corporates: [
      "株式会社オカモト",
      "株式会社ヤマウチ",
      "株式会社〇〇",
      "株式会社△△",
    ],
  });
}