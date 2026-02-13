"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  AlertTriangle,
  BarChart2,
  Plus,
} from "lucide-react";
import { useSession } from "@/app/(app)/lib/auth";
import styles from "./AppBottomNav.module.css";

// /check で保存される選択店舗の型定義
type SelectedStoreCache = {
  companyId: string;
  bizId: string;
  brandId: string;
  storeId: string;
  storeName?: string;
  ts?: number;
};

// 実行URLを構築するヘルパー
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
  
  // セッション情報を取得
  const { session } = useSession();

  // ログイン画面などは非表示
  const hide = pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (hide) return null;

  const isCheckPage = pathname === "/check";
  
  // /check/run など実行中はFAB不要
  const isRunning = pathname.startsWith("/check/");

  // アクティブ判定
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // =========================================================
  // ロールごとのメニュー定義
  // =========================================================
  const navItems = useMemo(() => {
    const role = session?.role || "viewer";

    // ✅ 修正: 全てのアイテムに showBadge を明示して型エラーを防ぐ
    const itemHome = { href: "/", label: "ホーム", Icon: Home, showBadge: false };
    const itemCheck = { href: "/check", label: "チェック", Icon: ClipboardCheck, showBadge: false };
    const itemResults = { href: "/results", label: "結果", Icon: BarChart2, showBadge: false };
    const itemNg = { href: "/ng", label: "是正報告", Icon: AlertTriangle, showBadge: true };

    // 1. 店舗ユーザー (manager)
    // 「ホーム」「結果」「是正報告」
    if (role === "manager") {
      return [itemHome, itemResults, itemNg];
    }

    // 2. 管理者 (admin) / チェック者 (auditor) / その他
    // 「ホーム」「チェック」「結果」「是正報告」
    return [itemHome, itemCheck, itemResults, itemNg];
  }, [session]);

  // FAB（点検開始ボタン）を表示するか？
  // 店舗ユーザー以外 かつ 実行画面以外の場合に表示
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
    // ポーリングでも監視（簡易実装）
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
    <nav className={styles.tabbar} aria-label="アプリメニュー">
      <div className={styles.inner}>
        {navItems.map(({ href, label, Icon, showBadge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.tab} ${active ? styles.isActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <div className={styles.iconWrap}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {showBadge && cappedNg && (
                  <span className={styles.badgeDot} aria-label={`未対応NG ${cappedNg}件`}>
                    {cappedNg}
                  </span>
                )}
              </div>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}

        {/* FAB: 店舗ユーザー以外 かつ 通常画面でのみ表示 */}
        {showFab ? (
          fab.mode === "link" ? (
            <Link className={styles.fab} href={fab.href} aria-label={fab.label}>
              <span className={styles.fabWrap}>
                <span className={styles.fabInner} aria-hidden="true">
                  <Plus size={24} strokeWidth={2.6} />
                </span>
                <span className={styles.fabLabel}>{fab.label}</span>
              </span>
            </Link>
          ) : (
            <button
              type="button"
              className={styles.fab}
              onClick={onFabClick}
              disabled={!fab.enabled}
              aria-label={fab.label}
              title={fab.enabled ? "点検を開始" : "店舗を選択してください"}
            >
              <span className={styles.fabWrap}>
                <span className={styles.fabInner} aria-hidden="true" style={{ opacity: fab.enabled ? 1 : 0.5 }}>
                  <Plus size={24} strokeWidth={2.6} />
                </span>
                <span className={styles.fabLabel}>{fab.label}</span>
              </span>
            </button>
          )
        ) : null}
      </div>
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}