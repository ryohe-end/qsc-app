// src/app/(app)/components/AppHeader.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/app/(app)/components/BrandLogo";
import { LogOut, LogIn, User, ChevronDown } from "lucide-react";
import { useSession, logoutMock } from "@/app/(app)/lib/auth";
import styles from "./AppHeader.module.css"; // ✅ CSS Modulesをインポート

export default function AppHeader() {
  const pathname = usePathname() || "/";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const { session, loading } = useSession();
  const isAuthed = !!session;

  const isLogin = pathname.startsWith("/login");
  if (isLogin) return null;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          
          {/* 左側：ブランドロゴ */}
          <Link href="/" className={styles.brand} onClick={() => setUserMenuOpen(false)}>
            <BrandLogo width={100} />
            <div className={styles.divider} />
            <span className={styles.appName}>QSC Check</span>
          </Link>

          {/* 右側：ユーザープロフィール */}
          <div className={styles.right}>
            
            <div className={styles.menuWrap}>
              <button
                className={`${styles.userBtn} ${isAuthed ? styles.isAuthed : ""}`}
                title={isAuthed ? "ユーザーメニュー" : "ゲスト"}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                disabled={loading}
              >
                {/* アイコン */}
                <div className={styles.avatar}>
                  <User size={20} />
                </div>

                {/* 名前 */}
                {isAuthed && session?.name && (
                  <span className={styles.userName}>{session.name}</span>
                )}
                
                {/* 矢印 */}
                <ChevronDown size={14} className={styles.chevron} />
              </button>

              {userMenuOpen && (
                <>
                  <div className={styles.backdrop} onClick={() => setUserMenuOpen(false)} />
                  <div className={styles.dropdown}>
                    {isAuthed ? (
                      <>
                        <div className={styles.dropdownInfo}>
                          <div className={styles.dropdownRole}>{session.role}</div>
                          <div className={styles.dropdownId}>ID: {session.id}</div>
                        </div>
                        <div className={styles.dropdownDivider} />
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            logoutMock();
                            location.href = "/login";
                          }}
                          style={{ color: "#ff3b30" }}
                        >
                          <LogOut size={16} />
                          <span>ログアウト</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="qsc-dropdown-item-text" style={{ padding: "8px 12px", fontSize: 11, fontWeight: 900, color: "var(--muted)" }}>ゲスト</div>
                        <div className={styles.dropdownDivider} />
                        <Link
                          href="/login"
                          className={styles.dropdownItem}
                          onClick={() => setUserMenuOpen(false)}
                          style={{ color: "#2f8ce6" }}
                        >
                          <LogIn size={16} />
                          <span>ログイン</span>
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}