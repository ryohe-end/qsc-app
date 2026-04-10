"use client";

import React, { useState } from "react";
import { Shield, Lock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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