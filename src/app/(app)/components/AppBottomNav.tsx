// src/app/(app)/components/AppBottomNav.tsx
"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  AlertTriangle,
  History,
  Settings,
  Plus,
  BarChart2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/app/(app)/lib/auth"; // ✅ 追加

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  showBadge?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** /check で保存される選択店舗 */
type SelectedStoreCache = {
  companyId: string;
  bizId: string;
  brandId: string;
  storeId: string;
  storeName?: string;
  ts?: number;
};

function buildRunUrl(s: SelectedStoreCache) {
  return (
    `/check/run?companyId=${encodeURIComponent(s.companyId)}` +
    `&bizId=${encodeURIComponent(s.bizId)}` +
    `&brandId=${encodeURIComponent(s.brandId)}` +
    `&storeId=${encodeURIComponent(s.storeId)}`
  );
}

export default function AppBottomNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  
  // ✅ セッション情報を取得
  const { session } = useSession();

  // ログイン画面などは非表示
  const hide = pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (hide) return null;

  const isCheckPage = pathname === "/check";
  
  // /check/run など実行中はFAB不要
  const isRunning = pathname.startsWith("/check/");

  // =========================================================
  // ✅ ロールごとのメニュー定義
  // =========================================================
  const items: Item[] = useMemo(() => {
    const role = session?.role || "viewer";

    // 1. 店舗ユーザー (manager)
    // 「点検」メニューがなく、「結果確認」がメイン
    if (role === "manager") {
      return [
        { href: "/", label: "ホーム", Icon: Home },
        { href: "/results", label: "結果", Icon: BarChart2 }, // 自店舗の結果
        { href: "/ng", label: "是正報告", Icon: AlertTriangle, showBadge: true }, // NG対応
        { href: "/settings", label: "設定", Icon: Settings },
      ];
    }

    // 2. 管理者 (admin) / チェック者 (auditor)
    // 全機能にアクセス可能
    return [
      { href: "/", label: "ホーム", Icon: Home },
      { href: "/check", label: "点検", Icon: ClipboardCheck },
      { href: "/ng", label: "NG是正", Icon: AlertTriangle, showBadge: true },
      { href: "/history", label: "履歴", Icon: History },
      { href: "/settings", label: "設定", Icon: Settings },
    ];
  }, [session]);

  // ✅ FAB（点検開始ボタン）を表示するか？
  // 店舗ユーザーは点検しないので非表示。実行画面(isRunning)でも非表示。
  const showFab = !isRunning && session?.role !== "manager";

  // =========================================================
  // NG Badge count（仮）
  // =========================================================
  const [ngCount, setNgCount] = useState<number>(0);

  useEffect(() => {
    const read = () => {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("qsc_ng_badge") : null;
      const n = raw ? Number(raw) : 0;
      setNgCount(Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
    };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === "qsc_ng_badge") read(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
    };
  }, []);

  const cappedNg = useMemo(() => {
    if (ngCount <= 0) return "";
    if (ngCount > 99) return "99+";
    return String(ngCount);
  }, [ngCount]);

  // =========================================================
  // FAB Action Logic (/check での店舗選択状態)
  // =========================================================
  const [selected, setSelected] = useState<SelectedStoreCache | null>(null);

  useEffect(() => {
    if (!isCheckPage) {
      setSelected(null);
      return;
    }
    const read = () => {
      try {
        const raw = window.localStorage.getItem("qsc_check_selected_store");
        if (!raw) return setSelected(null);
        const parsed = JSON.parse(raw) as SelectedStoreCache;
        if (!parsed?.storeId) return setSelected(null);
        setSelected(parsed);
      } catch {
        setSelected(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === "qsc_check_selected_store") read(); };
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(read, 500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, [isCheckPage]);

  const fab = useMemo(() => {
    // /check 以外なら「チェック開始」として /check へ誘導
    if (!isCheckPage) {
      return {
        mode: "link" as const,
        href: "/check",
        label: "チェック開始",
        enabled: true,
      };
    }
    // /check で店舗選択済みなら「開始」
    if (selected) {
      return {
        mode: "button" as const,
        href: buildRunUrl(selected),
        label: "開始",
        enabled: true,
      };
    }
    // /check で未選択なら押せない
    return {
      mode: "button" as const,
      href: "/check",
      label: "店舗を選択",
      enabled: false,
    };
  }, [isCheckPage, selected]);

  const onFabClick = () => {
    if (!fab.enabled) return;
    router.push(fab.href);
  };

  return (
    <nav className="qsc-tabbar" aria-label="アプリメニュー">
      <div className="qsc-tabbar-inner">
        {items.map(({ href, label, Icon, showBadge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`qsc-tab ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="qsc-tab-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
                {showBadge && cappedNg && (
                  <span className="qsc-badge-dot" aria-label={`未対応NG ${cappedNg}件`}>
                    {cappedNg}
                  </span>
                )}
              </span>
              <span className="qsc-tab-label">{label}</span>
            </Link>
          );
        })}

        {/* ✅ FAB: 店舗ユーザー以外 かつ 通常画面でのみ表示 */}
        {showFab ? (
          fab.mode === "link" ? (
            <Link className="qsc-fab" href={fab.href} aria-label={fab.label}>
              <span className="qsc-fab-wrap">
                <span className="qsc-fab-inner" aria-hidden="true">
                  <Plus size={22} strokeWidth={2.6} />
                </span>
                <span className="qsc-fab-label">{fab.label}</span>
              </span>
            </Link>
          ) : (
            <button
              type="button"
              className={`qsc-fab ${fab.enabled ? "is-on" : ""}`}
              onClick={onFabClick}
              disabled={!fab.enabled}
              aria-label={fab.label}
              title={fab.enabled ? "点検を開始" : "店舗を選択してください"}
            >
              <span className="qsc-fab-wrap">
                <span className="qsc-fab-inner" aria-hidden="true">
                  <Plus size={22} strokeWidth={2.6} />
                </span>
                <span className="qsc-fab-label">{fab.label}</span>
              </span>
            </button>
          )
        ) : null}
      </div>
      <div className="qsc-tabbar-safe" aria-hidden="true" />
    </nav>
  );
}