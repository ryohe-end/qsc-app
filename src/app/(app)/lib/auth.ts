// src/app/(app)/lib/auth.ts
"use client";

import { useState, useEffect } from "react";
import { Role } from "./roles";

export type UserSession = {
  id: string;
  name: string;
  role: Role;
  assignedStoreId?: string; // チェック者・店舗用：担当店舗ID
};

const STORAGE_KEY = "qsc_session";

// モックログイン処理（ログイン画面から呼ぶ）
export function loginMock(id: string): UserSession {
  let role: Role = "viewer";
  let name = "ゲスト";
  let assignedStoreId: string | undefined = undefined;

  // IDによって権限を振り分け（デモ用）
  if (id === "admin") {
    role = "admin";
    name = "システム管理者";
  } else if (id === "audit") {
    role = "auditor";
    name = "エリア監査員";
    assignedStoreId = "S001"; // 例：札幌大通のみ担当
  } else if (id === "store") {
    role = "manager"; // 店舗責任者
    name = "新宿西口店 店長";
    assignedStoreId = "S002"; // 自店舗ID
  }

  const session: UserSession = { id, name, role, assignedStoreId };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    // 既存のフラグも互換性のため残す
    document.cookie = `qsc_authed=1; path=/; max-age=86400`;
  }
  return session;
}

export function logoutMock() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `qsc_authed=; path=/; max-age=0`;
  }
}

// セッション取得フック
export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSession(JSON.parse(raw));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  return { session, loading, isAuth: !!session };
}