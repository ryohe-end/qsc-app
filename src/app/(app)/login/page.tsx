"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/app/(app)/components/BrandLogo";
import { AlertCircle } from "lucide-react";

// ✅ 認証情報を保存するための関数をインポート
import { saveSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";


export default function LoginPage() {
  const router = useRouter();

  // 認証用ステート
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [dim, setDim] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);
  const [googleClientId, setGoogleClientId] = useState<string>("");

  const canSubmit = useMemo(
    () => !!email && !!password && !loading && !googleBusy,
    [email, password, loading, googleBusy]
  );

  useEffect(() => {
    setGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
  }, []);

  // Google認証初期化 (既存ロジックを完全維持)
  useEffect(() => {
    const clientId = googleClientId;
    if (!clientId || !googleBtnRef.current) return;
    const init = () => {
      if (!window.google?.accounts?.id) return;
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
            const data = await res.json();
            if (!res.ok) throw new Error("Google認証に失敗しました");
            
            // ✅ Googleログイン成功時も本名を保存
            if (data.user) {
              saveSession(data.user);
            }

            router.replace("/");
          } catch (e: any) { setErrorMsg(e.message); }
          finally { setGoogleBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard", theme: "outline", size: "large", width: 360, text: "signin_with", shape: "rectangular"
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
  }, [router, googleClientId]);

  // ✅ DynamoDB認証（ここを修正：名前保存を追加）
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password, 
          remember 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      // ✅ これ！DynamoDBから返ってきた user (name, role等) をLocalStorageに保存
      if (data.user) {
        saveSession(data.user);
      }

      router.replace("/");
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="qsc-auth-container">
      <div className={`dim-overlay ${dim ? "is-active" : ""}`} />

      <div className="content-wrapper">
        <div className="logo-section" style={{ opacity: dim ? 0.55 : 1 }}>
          <BrandLogo width={320} priority animate delayMs={40} />
        </div>

        <section className="login-card">
          <div className="sign-in-header">Sign In</div>

          <div className="instruction-box">
            ※ 登録済みのメールアドレスとパスワードでログインしてください
          </div>

          {errorMsg && (
            <div className="error-banner">
              <AlertCircle size={16} /> <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="login-form">
            <div className="form-group">
              <label className="field-label">EMAIL (ID)</label>
              <input
                className="custom-input"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@joyfit.jp"
                onFocus={() => setDim(true)}
                onBlur={() => setDim(false)}
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label">パスワード</label>
              <div className="password-input-container">
                <input
                  className="custom-input password-input"
                  type={showPass ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onFocus={() => setDim(true)}
                  onBlur={() => setDim(false)}
                  required
                />
                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "パスワードを隠す" : "パスワードを表示"}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                    {!showPass && <line x1="2" y1="2" x2="22" y2="22" />}
                  </svg>
                </button>
              </div>
            </div>

            <div className="forgot-password-link">
              <Link href="/forgot-password">パスワードを忘れた方はこちら</Link>
            </div>

            <div className="remember-me-section">
              <label className="custom-checkbox-label">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="custom-checkmark" />
                <span className="remember-text">ログイン状態を保持</span>
              </label>
            </div>

            <button className="login-submit-button" type="submit" disabled={!canSubmit}>
              {loading ? <div className="button-spinner" /> : "ログイン"}
            </button>

            <div className="login-divider">
              <span>または</span>
            </div>

            <div className="google-signin-wrapper">
              {googleClientId ? <div ref={googleBtnRef} /> : <div className="google-unavailable">Googleログイン未設定</div>}
              {googleBusy && <div className="google-busy-status">認証中…</div>}
            </div>

            <div className="admin-redirect-link">
              <Link href="/admin/login">管理画面はこちら</Link>
            </div>
          </form>
        </section>

        <footer className="auth-footer">© 2026 QSC Check</footer>
      </div>

      <style jsx>{`
        /* 500行規模のオリジナルCSSをすべて完全に復元 */
        .qsc-auth-container {
          min-height: 100svh;
          background: #f8fafc;
          display: flex;
          justify-content: center;
          position: relative;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }

        .dim-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.12);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 10;
        }
        .dim-overlay.is-active {
          opacity: 1;
        }

        .content-wrapper {
          position: relative;
          z-index: 20;
          padding: 60px 24px;
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-section {
          margin-bottom: 32px;
          transition: opacity 0.2s ease;
        }

        .login-card {
          background: #fff;
          border-radius: 40px;
          padding: 56px 48px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          width: 100%;
        }

        .sign-in-header {
          text-align: center;
          margin-bottom: 24px;
          font-weight: 900;
          font-size: 26px;
          color: #38a169;
          letter-spacing: -0.01em;
        }

        .instruction-box {
          margin-bottom: 24px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 16px;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          text-align: center;
          line-height: 1.6;
        }

        .error-banner {
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 900;
          color: #475569;
          padding-left: 4px;
        }

        .custom-input {
          width: 100%;
          height: 60px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0 20px;
          font-size: 17px;
          font-weight: 700;
          color: #1e293b;
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .custom-input::placeholder {
          color: #cbd5e1;
          font-weight: 600;
        }
        .custom-input:focus {
          background: #fff;
          border-color: #cbd5e1;
        }

        .password-input-container {
          position: relative;
        }
        .password-input {
          padding-right: 64px;
        }
        .password-eye-button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #94a3b8;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: color 0.2s;
        }
        .password-eye-button:hover {
          color: #475569;
        }

        .forgot-password-link {
          text-align: left;
          margin-top: -12px;
          padding-left: 4px;
        }
        .forgot-password-link :global(a) {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          text-decoration: underline;
        }

        .custom-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          position: relative;
        }
        .custom-checkbox-label input {
          position: absolute;
          opacity: 0;
        }
        .custom-checkmark {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background-color: #cbd5e1;
          transition: background-color 0.2s;
        }
        .custom-checkbox-label input:checked + .custom-checkmark {
          background-color: #3b82f6;
        }
        .custom-checkmark::after {
          content: "";
          position: absolute;
          display: none;
          left: 8px;
          top: 4px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .custom-checkbox-label input:checked + .custom-checkmark::after {
          display: block;
        }
        .remember-text {
          font-size: 15px;
          font-weight: 800;
          color: #475569;
        }

        .login-submit-button {
          height: 68px;
          border-radius: 24px;
          border: none;
          background: #717b85;
          color: #fff;
          font-size: 19px;
          font-weight: 900;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .login-submit-button:not(:disabled):hover {
          background: #5a646f;
        }
        .login-submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #cbd5e1;
          font-size: 14px;
          margin: 4px 0;
        }
        .login-divider::before, .login-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .google-signin-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .google-unavailable {
          font-size: 13px;
          color: #94a3b8;
        }
        .google-busy-status {
          font-size: 13px;
          color: #3b82f6;
          margin-top: 10px;
          font-weight: 700;
        }

        .admin-redirect-link {
          text-align: center;
          margin-top: 4px;
        }
        .admin-redirect-link :global(a) {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          text-decoration: underline;
        }

        .auth-footer {
          text-align: center;
          padding: 60px 0 20px;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 800;
        }

        .button-spinner {
          width: 22px;
          height: 22px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}