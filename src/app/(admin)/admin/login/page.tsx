"use client";

import React, { useState, useRef, useEffect } from "react";
import { Shield, Lock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement | null, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function AdminLoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    setGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
  }, []);

  // Google認証初期化
  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;
    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp: { credential?: string }) => {
          const idToken = resp?.credential;
          if (!idToken) return;
          setErrorMsg(null);
          setGoogleBusy(true);
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Google認証に失敗しました");

            // adminロールかチェック
            if (data.user?.role !== "admin") {
              throw new Error("管理者権限がありません");
            }

            window.location.href = "/admin";
          } catch (e: unknown) {
            setErrorMsg(e instanceof Error ? e.message : "Google認証に失敗しました");
          } finally {
            setGoogleBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard", theme: "filled_black", size: "large",
        width: 336, text: "signin_with", shape: "rectangular",
      });
    };
    if (window.google?.accounts?.id) { init(); }
    else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, [googleClientId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // ✅ 専用APIを呼ぶ → path:"/admin" のクッキーが発行される
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      // 強制リロードで管理画面へ
      window.location.href = "/admin";
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "ログインに失敗しました");
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#0f172a",
      color: "#f8fafc",
      fontFamily: "Inter, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "100vh",
        background: "radial-gradient(circle at 50% -20%, #1e293b 0%, #0f172a 100%)",
        zIndex: 0,
      }} />

      <div style={{ width: "100%", maxWidth: 400, padding: 24, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            borderRadius: 20, display: "grid", placeItems: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 40px -10px rgba(99, 102, 241, 0.5)",
          }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 950, letterSpacing: "-0.02em", color: "#fff" }}>Admin Console</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: 8 }}>システム管理者専用ログイン</p>
        </div>

        {/* Form */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: 32,
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}>
          {errorMsg && (
            <div style={{
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 800,
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
              textAlign: "center",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: "#cbd5e1", marginLeft: 4 }}>ADMIN ID</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                style={{
                  height: 48, borderRadius: 14, background: "#0f172a",
                  border: "1px solid #334155", color: "#fff",
                  padding: "0 16px", fontSize: 15, outline: "none", fontWeight: 700,
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: "#cbd5e1", marginLeft: 4 }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 16, top: 16, color: "#64748b" }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%", height: 48, borderRadius: 14, background: "#0f172a",
                    border: "1px solid #334155", color: "#fff",
                    padding: "0 16px 0 44px", fontSize: 15, outline: "none", fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !userId || !password}
              style={{
                marginTop: 8, height: 50, borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                color: "#fff", fontWeight: 950, fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                opacity: (loading || !userId || !password) ? 0.6 : 1,
                transition: "0.2s",
                boxShadow: (loading || !userId || !password) ? "none" : "0 10px 20px -5px rgba(79, 70, 229, 0.4)",
              }}
            >
              {loading ? "認証中..." : "ログイン"} <ArrowRight size={18} />
            </button>
          </form>

          {/* Google認証 */}
          {googleClientId && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                margin: "24px 0", color: "#475569", fontSize: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ color: "#64748b", fontWeight: 700 }}>または</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div ref={googleBtnRef} />
                {googleBusy && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#818cf8", fontWeight: 700 }}>
                    Google認証中...
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => { window.location.href = "/login"; }}
            style={{
              background: "none", border: "none", color: "#64748b",
              fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}
          >
            ← 通常ログインへ戻る
          </button>
        </div>
      </div>

      <footer style={{
        position: "fixed", bottom: 24, width: "100%", textAlign: "center",
        color: "#334155", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em",
      }}>
        © 2026 QSC CHECK ADMIN SYSTEM
      </footer>
    </main>
  );
}