"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/app/(app)/components/BrandLogo";
// ✅ 追加: auth.ts から loginMock をインポート
import { loginMock } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  // ✅ Remember me（ブラウザの保存挙動を補助）
  const [remember, setRemember] = useState(true);

  // ✅ UI states
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ Password visibility (👁️)
  const [showPass, setShowPass] = useState(false);

  // ✅ Focus dim
  const [dim, setDim] = useState(false);
  const logoOpacity = dim ? 0.55 : 1;

  // ✅ Google
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);
  const [googleClientId, setGoogleClientId] = useState<string>("");

  const canSubmit = useMemo(
    () => !!userId && !!password && !loading && !googleBusy,
    [userId, password, loading, googleBusy]
  );

  // ✅ env を確実に読む
  useEffect(() => {
    setGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
  }, []);

  // ✅ Google GIS script load + official button render
  useEffect(() => {
    const clientId = googleClientId;
    if (!clientId) return;
    if (!googleBtnRef.current) return;

    const init = () => {
      if (!window.google?.accounts?.id) return;

      googleBtnRef.current!.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: clientId,
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

            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j?.error || "Google認証に失敗しました");
            }

            // Googleログイン成功時の処理
            document.cookie = `qsc_authed=1; path=/; max-age=${remember ? 60 * 60 * 24 * 7 : 60 * 60 * 6}`;

            router.replace("/");
          } catch (e: any) {
            setErrorMsg(e?.message || "Google認証に失敗しました");
          } finally {
            setGoogleBusy(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 360,
      });
    };

    const ensureScript = () => {
      if (window.google?.accounts?.id) {
        init();
        return;
      }
      if (scriptLoadedRef.current) return;
      scriptLoadedRef.current = true;

      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = init;
      s.onerror = () => {
        setErrorMsg("Googleログインの読み込みに失敗しました（ネットワーク/拡張機能を確認）");
      };
      document.head.appendChild(s);
    };

    ensureScript();
  }, [router, googleClientId, remember]);

  // ✅ モックログイン処理へ変更
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      // UX: ちょい待たせる
      await new Promise((r) => setTimeout(r, 600));

      const id = userId.trim().toLowerCase();
      const pass = password;

      // ✅ デモ用パスワードチェック
      if (pass !== "1234") {
        throw new Error("ID またはパスワードが違います (Test: 1234)");
      }

      // ✅ auth.ts のモックログインを実行（ロール割り当て）
      loginMock(id);

      // ✅ 重要: replaceで戻るとログインに戻りにくい
      router.replace("/");
    } catch (e: any) {
      setErrorMsg(e?.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () => {
    setErrorMsg(null);
    alert("パスワード再発行は準備中です（管理者へ連絡してください）");
  };

  const onFocus = () => setDim(true);
  const onBlur = () => setDim(false);

  return (
    <main 
      className="qsc-auth qsc-login" 
      style={{ 
        minHeight: "100svh", 
        height: "auto", 
        overflowY: "auto", 
        display: "block",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        background: "var(--bg)"
      }}
    >
      {/* ✅ フォーカス時 背景ほんのり暗転 */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,17,21,0.18)",
          opacity: dim ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 160ms ease",
          zIndex: 1,
        }}
      />

      <div 
        className="qsc-auth-inner" 
        style={{ 
          position: "relative", 
          zIndex: 2, 
          padding: "40px 20px 120px", /* 十分なスクロール余白 */
          maxWidth: "420px",
          margin: "0 auto",
          display: "block"
        }}
      >
        {/* ✅ ロゴはカード外 */}
        <div
          className="qsc-enter"
          style={{
            display: "grid",
            placeItems: "center",
            padding: "6px 0 10px",
            opacity: logoOpacity,
            transition: "opacity 180ms ease",
          }}
        >
          <BrandLogo width={320} priority animate delayMs={40} />
        </div>

        <section className="qsc-card qsc-login-card qsc-enter qsc-enter--d4">
          <div
            style={{
              textAlign: "center",
              marginBottom: 12,
              fontWeight: 950,
              fontSize: 22,
              letterSpacing: "-0.02em",
              background: "linear-gradient(90deg, #2f8ce6 0%, #2fb36d 52%, #ff3b30 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              opacity: 0.92,
            }}
          >
            Sign In
          </div>

          {/* ✅ 地味に大事（1つだけ） */}
          <div
            style={{
              marginBottom: 10,
              borderRadius: 14,
              border: "1px solid rgba(15,17,21,.10)",
              background: "rgba(15,17,21,.04)",
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 800,
              opacity: 0.78,
              lineHeight: 1.35,
            }}
          >
            ※ ブラウザの「戻る」でログイン画面に戻らないよう、ログイン後は自動で遷移します
          </div>

          {errorMsg ? (
            <div
              role="alert"
              style={{
                marginBottom: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,59,48,.25)",
                background: "rgba(255,59,48,.10)",
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(15,17,21,.92)",
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="qsc-form" aria-label="login">
            <label className="qsc-label">
              <span className="qsc-label-text">ID</span>
              <input
                className="qsc-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="例：admin"
                autoComplete={remember ? "username" : "off"}
                inputMode="text"
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </label>

            <label className="qsc-label">
              <span className="qsc-label-text">パスワード</span>

              <div style={{ position: "relative" }}>
                <input
                  className="qsc-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={remember ? "current-password" : "off"}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{ paddingRight: 52 }}
                />

                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "パスワードを隠す" : "パスワードを表示"}
                  title={showPass ? "非表示" : "表示"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: "1px solid rgba(15,17,21,.10)",
                    background: "rgba(255,255,255,.92)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    opacity: 0.85,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2.2 12s3.5-7 9.8-7 9.8 7 9.8 7-3.5 7-9.8 7-9.8-7-9.8-7Z"
                      stroke="rgba(15,17,21,.65)"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                      stroke="rgba(15,17,21,.65)"
                      strokeWidth="1.6"
                    />
                    {showPass ? null : (
                      <path
                        d="M5 19L19 5"
                        stroke="rgba(15,17,21,.45)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </button>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onForgot}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 900,
                    opacity: 0.72,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  パスワードを忘れた方はこちらから
                </button>
              </div>
            </label>

            <div className="qsc-remember">
              <label className="qsc-remember-label">
                <input
                  className="qsc-checkbox"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="qsc-remember-text">パスワードを保存</span>
              </label>
            </div>

            <button className="qsc-btn qsc-btn-primary" type="submit" disabled={!canSubmit}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                {loading ? (
                  <span className="qsc-spinner" aria-hidden style={{ width: 18, height: 18, borderWidth: 2 }} />
                ) : null}
                {loading ? "ログイン中…" : "ログイン"}
              </span>
            </button>

            {/* ✅ デモ用アカウントヒント */}
            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(0,0,0,0.04)", borderRadius: 12, fontSize: 11, color: "rgba(15,17,21,0.7)", lineHeight: 1.5 }}>
              <p style={{fontWeight: "900", marginBottom: 6}}>【デモ用アカウント】PWは全て 1234</p>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 4 }}>
                <li><code style={{fontWeight:800, background:"rgba(255,255,255,0.6)", padding:"2px 4px", borderRadius:4}}>admin</code> : 管理者 (全機能)</li>
                <li><code style={{fontWeight:800, background:"rgba(255,255,255,0.6)", padding:"2px 4px", borderRadius:4}}>audit</code> : チェック者 (店舗制限・分析OK)</li>
                <li><code style={{fontWeight:800, background:"rgba(255,255,255,0.6)", padding:"2px 4px", borderRadius:4}}>store</code> : 店舗 (自店のみ・点検不可)</li>
              </ul>
            </div>

            <div className="qsc-or">
              <span>または</span>
            </div>

            <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
              {googleClientId ? (
                <div ref={googleBtnRef} />
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>
                  Googleログインは未設定です
                </div>
              )}
              {googleBusy ? <div style={{ fontSize: 12, opacity: 0.7 }}>Googleで認証中…</div> : null}
            </div>
          </form>

          {/* ✅ 管理画面への導線（修正済み：/admin/login へ） */}
          <div style={{ marginTop: 12, display: "grid", placeItems: "center" }}>
            <Link
              href="/admin/login"
              style={{
                fontSize: 12,
                fontWeight: 900,
                opacity: 0.72,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              管理画面はこちら
            </Link>
          </div>
        </section>

        <footer className="qsc-footer qsc-enter qsc-enter--d5" style={{ padding: "40px 0" }}>© 2026 QSC Check</footer>
      </div>
    </main>
  );
}