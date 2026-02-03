import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clubCodeStr = url.searchParams.get("clubCode") ?? "";

  if (!/^\d+$/.test(clubCodeStr)) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const clubCode = Number(clubCodeStr);

  // ダミー（後でDB/Oracle/Snowflakeに差し替え）
  const MAP: Record<number, any> = {
    306: {
      name: "札幌大通",
      brandName: "JOYFIT",
      businessTypeName: "JOYFIT24",
      companyName: "第1カンパニー",
      corporateName: "株式会社オカモト",
    },
    216: {
      name: "仙台駅前",
      brandName: "JOYFIT",
      businessTypeName: "JOYFIT24",
      companyName: "第2カンパニー",
      corporateName: "株式会社ヤマウチ",
    },
  };

  const hit = MAP[clubCode];
  if (!hit) {
    return NextResponse.json({ found: false, clubCode });
  }

  return NextResponse.json({
    found: true,
    clubCode,
    ...hit,
  });
}
