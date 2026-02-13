"use client";

import { useState, useEffect } from "react";
import { Role } from "./roles";

export type UserSession = {
  id: string;
  name: string;
  role: Role;
  assignedStoreId?: string;
};

const STORAGE_KEY = "qsc_session";

export function loginMock(id: string): UserSession {
  let role: Role = "viewer";
  let name = "ゲスト";
  let assignedStoreId: string | undefined = undefined;

  // IDによって権限を振り分け
  if (id === "admin") {
    role = "admin";
    name = "システム管理者";
  } else if (id === "audit") {
    role = "auditor";
    name = "エリア監査員";
    assignedStoreId = "S001";
  } else if (id === "store") {
    role = "manager";
    name = "新宿西口店 店長";
    assignedStoreId = "S002";
  }

  const session: UserSession = { id, name, role, assignedStoreId };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    // ✅ Middleware判定用にロール情報もCookieに書き込む
    document.cookie = `qsc_authed=1; path=/; max-age=86400`;
    document.cookie = `qsc_role=${role}; path=/; max-age=86400`;
  }
  return session;
}

export function logoutMock() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    // ✅ ログアウト時にCookieを削除
    document.cookie = `qsc_authed=; path=/; max-age=0`;
    document.cookie = `qsc_role=; path=/; max-age=0`;
  }
}

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