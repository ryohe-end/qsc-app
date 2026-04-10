// src/app/(app)/components/AppHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/app/(app)/components/BrandLogo";
import { LogIn } from "lucide-react";
import { useSession, logoutMock } from "@/app/(app)/lib/auth";
import { UserMenu } from "@/app/(app)/components/UserMenu";
import styles from "./AppHeader.module.css";

export default function AppHeader() {
  const pathname = usePathname() || "/";
  const { session, loading } = useSession();
  const isAuthed = !!session;

  const isLogin = pathname.startsWith("/login");
  if (isLogin) return null;

  const handleLogout = () => {
    logoutMock();
    location.href = "/login";
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>

        {/* 左側：ブランドロゴ */}
        <Link href="/" className={styles.brand}>
          <BrandLogo width={100} />
          <div className={styles.divider} />
          <span className={styles.appName}>QSC Check</span>
        </Link>

        {/* 右側 */}
        <div className={styles.right}>
          {loading ? null : isAuthed ? (
            <UserMenu
              userName={session.name ?? ""}
              role={(session.role as string) ?? ""}
              onLogout={handleLogout}
            />
          ) : (
            <Link
              href="/login"
              className={styles.userBtn}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#2f8ce6", textDecoration: "none" }}
            >
              <LogIn size={16} />
              <span>ログイン</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
