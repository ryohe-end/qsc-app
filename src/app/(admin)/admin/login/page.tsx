"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight } from "lucide-react";
import { loginMock } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await new Promise((r) => setTimeout(r, 800));

      // デモ用チェック: admin / 1234 のみ許可
      if (userId !== "admin" || password !== "1234") {
        throw new Error("管理者IDまたはパスワードが違います");
      }

      // ログイン処理 (Cookieセット)
      loginMock("admin");

      // 管理画面へ
      router.replace("/admin");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
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
      fontFamily: "Inter, sans-serif" 
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        
        {/* Logo Area */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ 
            width: 64, height: 64, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", 
            borderRadius: 20, display: "grid", placeItems: "center", margin: "0 auto 16px",
            boxShadow: "0 0 40px -10px rgba(99, 102, 241, 0.5)"
          }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 950, letterSpacing: "-0.02em" }}>Admin Console</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: 8 }}>システム管理者専用ログイン</p>
        </div>

        {/* Form Card */}
        <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 32, backdropFilter: "blur(12px)" }}>
          {errorMsg && (
            <div style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", fontSize: 12, fontWeight: 800, padding: "12px", borderRadius: 12, marginBottom: 20, textAlign: "center", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: "#cbd5e1", marginLeft: 4 }}>ADMIN ID</label>
              <input 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="admin"
                style={{ height: 48, borderRadius: 14, background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "0 16px", fontSize: 15, outline: "none", fontWeight: 700 }}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: "#cbd5e1", marginLeft: 4 }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 16, top: 16, color: "#64748b" }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", height: 48, borderRadius: 14, background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "0 16px 0 44px", fontSize: 15, outline: "none", fontWeight: 700 }}
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
                transition: "0.2s"
              }}
            >
              {loading ? "認証中..." : "ログイン"} <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/login" style={{ color: "#64748b", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>← 通常ログインへ戻る</a>
        </div>
      </div>
    </main>
  );
}