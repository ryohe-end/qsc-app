"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Home, ChevronRight, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";

const EMAIL_TYPES = [
  { type: "welcome", label: "アカウント作成", desc: "ログイン情報を送信" },
  { type: "completion", label: "点検完了", desc: "スコア・NG件数サマリー" },
  { type: "correction_submitted", label: "是正報告提出", desc: "管理者への通知" },
  { type: "approval", label: "承認通知", desc: "店舗への承認通知" },
  { type: "rejection", label: "差し戻し通知", desc: "店舗への差し戻し通知" },
  { type: "reminder", label: "改善期限リマインダー", desc: "期限3日前の通知" },
];

export default function AdminSettingsPage() {
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sendTest = async (type: string) => {
    if (!to.trim()) { alert("送信先メールアドレスを入力してください"); return; }
    setResults(prev => ({ ...prev, [type]: "loading" }));
    setErrors(prev => ({ ...prev, [type]: "" }));
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, to: to.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信失敗");
      setResults(prev => ({ ...prev, [type]: "success" }));
      setTimeout(() => setResults(prev => ({ ...prev, [type]: "idle" })), 3000);
    } catch (e: unknown) {
      setResults(prev => ({ ...prev, [type]: "error" }));
      setErrors(prev => ({ ...prev, [type]: e instanceof Error ? e.message : "エラー" }));
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} color="#cbd5e1" />
          <span style={{ color: "#1e293b", fontWeight: 900 }}>設定</span>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 950, color: "#1e293b", margin: "0 0 32px" }}>設定</h1>

        {/* メールテスト */}
        <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", padding: 32, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>メール送信テスト</h2>
          <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600, margin: "0 0 24px" }}>各メールテンプレートのテスト送信ができます</p>

          {/* 送信先 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", display: "block", marginBottom: 8 }}>送信先メールアドレス</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="test@example.com"
              style={{ width: "100%", boxSizing: "border-box", height: 48, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "0 16px", fontSize: 15, fontWeight: 600, outline: "none" }}
            />
          </div>

          {/* テンプレート一覧 */}
          <div style={{ display: "grid", gap: 12 }}>
            {EMAIL_TYPES.map(({ type, label, desc }) => {
              const status = results[type] || "idle";
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
                    {status === "error" && errors[type] && (
                      <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors[type]}</div>
                    )}
                  </div>
                  <button
                    onClick={() => sendTest(type)}
                    disabled={status === "loading"}
                    style={{
                      height: 40, padding: "0 20px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 13, cursor: status === "loading" ? "default" : "pointer",
                      background: status === "success" ? "#d1fae5" : status === "error" ? "#fee2e2" : "#1e293b",
                      color: status === "success" ? "#059669" : status === "error" ? "#dc2626" : "#fff",
                      display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                    }}
                  >
                    {status === "loading" && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    {status === "success" && <CheckCircle2 size={14} />}
                    {status === "error" && <XCircle size={14} />}
                    {status === "idle" && <Send size={14} />}
                    {status === "loading" ? "送信中..." : status === "success" ? "送信完了" : status === "error" ? "失敗" : "テスト送信"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
