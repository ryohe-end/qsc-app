"use client";

import { useState, useEffect } from "react";

// ✅ ロール定義を現在の実態に合わせる
export type Role = "admin" | "store" | "inspector";

export type UserSession = {
  id: string;           // email
  name: string;         // 本名
  role: Role;           // ロール
  assignedStoreId?: string; // storeId
};

const STORAGE_KEY = "qsc_session";

/**
 * ✅ ログイン成功時にデータを保存する
 */
export function saveSession(user: { email: string; name: string; role: string; storeId?: string }): UserSession {
  const session: UserSession = {
    id: user.email,
    name: user.name || "担当者",
    role: user.role as Role,
    assignedStoreId: user.storeId,
  };

  if (typeof window !== "undefined") {
    // LocalStorageに保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    
    // Middleware判定用のCookie（1日有効）
    document.cookie = `qsc_authed=1; path=/; max-age=86400`;
    document.cookie = `qsc_role=${session.role}; path=/; max-age=86400`;
  }
  return session;
}

/**
 * ✅ 【重要】AppHeader.tsx が探し回っている関数名
 */
export function logoutMock() {
  if (typeof window !== "undefined") {
    // LocalStorage を空にする
    localStorage.removeItem(STORAGE_KEY);
    // Cookie を削除
    document.cookie = `qsc_authed=; path=/; max-age=0`;
    document.cookie = `qsc_role=; path=/; max-age=0`;
  }
}

/**
 * ✅ セッション取得用フック
 */
export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setSession(JSON.parse(raw));
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  return { session, loading, isAuth: !!session };
}