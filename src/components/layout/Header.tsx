"use client";

import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { ROLE_LABEL, ROLE_ORDER, type Role } from "@/lib/roles";

export default function Header({
  role,
  setRole,
}: {
  role: Role;
  setRole: (r: Role) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-2">
          {/* 🔴 デバッグ用：赤枠ロゴ */}
          <div
            className="relative flex-none overflow-hidden rounded-xl bg-white ring-2 ring-red-500"
            style={{ width: 24, height: 24 }} // ← ここで絶対サイズ固定
          >
            <Image
              src={BRAND.logoUrl}
              alt="QSC logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>

          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-slate-900">
              {BRAND.name}
            </div>
            <div className="hidden truncate text-xs text-slate-500 sm:block">
              店舗QSC点検・是正管理
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-none items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">
            表示権限
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-9 w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            aria-label="表示権限"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
