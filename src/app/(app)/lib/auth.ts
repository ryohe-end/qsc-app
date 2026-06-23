"use client";

import { useState, useEffect } from "react";

// ✅ ロール定義を現在の実態に合わせる
export type Role = "admin" | "inspector" | "manager" | "store" | "viewer";

export type UserSession = {
  id: string;           // email
  name: string;         // 本名
  role: Role;           // ロール
  assignedStoreId?: string;   // storeId（単数・後方互換）
  assignedStoreIds?: string[]; // storeIds（複数・me APIから取得）
};

const STORAGE_KEY = "qsc_session";

/**
 * ログイン成功後の初期表示用キャッシュ。
 * Cookie は server 側で httpOnly で発行されるため、ここでは触らない。
 */
export function saveSession(user: { email: string; name: string; role: string; storeId?: string }): UserSession {
  const session: UserSession = {
    id: user.email,
    name: user.name || "担当者",
    role: user.role as Role,
    assignedStoreId: user.storeId,
  };

  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
  }
  return session;
}

/**
 * ログアウト処理。サーバーで cookie 削除＋ローカルキャッシュもクリア。
 * 同期API（呼び出し側は await 不要・遷移直後にfire-and-forgetで動作）。
 */
export function logoutMock() {
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    // httpOnly cookie は JS から消せないので server 側で削除
    fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  }
}

/**
 * セッション取得用フック。
 * localStorage を初期描画用キャッシュとして使い、/api/auth/me で正本を取り直す。
 * me が 401 を返したら未ログインとみなしキャッシュも破棄。
 */
export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1) localStorage を読み「初期描画用」セッションをセット（hydration mismatch回避のためマウント後）
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as UserSession);
    } catch {}

    // 2) サーバーから正本を取り直す
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setSession(null);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          return;
        }
        if (!res.ok) return; // ネットワークエラー等はキャッシュを維持
        const data = await res.json();
        const me = data?.user;
        if (!me) return;
        const next: UserSession = {
          id: me.email || "",
          name: me.name || "担当者",
          role: (me.role || "viewer") as Role,
          assignedStoreId: me.assignedStoreIds?.[0] || "",
          assignedStoreIds: me.assignedStoreIds || [],
        };
        setSession(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      } catch {
        // ネットワークエラー時はキャッシュを維持
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { session, loading, isAuth: !!session };
}
