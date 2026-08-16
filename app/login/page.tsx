"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";
import { getInitialLoginEmails } from "@/lib/auth/login-prefill";
import { useSession } from "next-auth/react";
import { getBrowserStorageItem } from "@/lib/browser-storage";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/callback-url";

function LoginContent() {
  const searchParams = useSearchParams();
  const sessionState = useSession();
  const callbackUrl = sanitizeAuthCallbackUrl(searchParams.get("callbackUrl"));
  const appleSignInEnabled = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
  const justVerified = searchParams.get("verified") === "1";
  const authError = searchParams.get("error") || "";
  const initialEmails = getInitialLoginEmails(searchParams);

  const [email, setEmail] = useState(initialEmails.email);
  const [password, setPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState(initialEmails.magicLinkEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(false);

  const startNativeOAuth = (provider: "google" | "apple", targetCallbackUrl: string) => {
    if (typeof window === "undefined") return false;

    const nativeHandler = (window as any).webkit?.messageHandlers?.mybingocardOAuth;
    const nativeAppFlag = getBrowserStorageItem("localStorage", "mybingocard-ios-app") === "1";
    const isNativeApp =
      searchParams.get("app") === "1" ||
      nativeAppFlag ||
      Boolean(nativeHandler);

    if (!isNativeApp) return false;

    if (nativeHandler) {
      nativeHandler.postMessage({
        provider,
        callbackUrl: targetCallbackUrl || "/dashboard",
      });
      return true;
    }

    window.location.href = `/api/native/oauth/${provider}/start?callbackUrl=${encodeURIComponent(targetCallbackUrl || "/dashboard")}`;
    return true;
  };

  useEffect(() => {
    if (sessionState.status !== "authenticated") return;

    const redirectTarget =
      authError === "OAuthAccountNotLinked" ? "/dashboard" : callbackUrl;

    window.location.href = redirectTarget;
  }, [authError, callbackUrl, sessionState.status]);

  useEffect(() => {
    if (initialEmails.email && !email) {
      setEmail(initialEmails.email);
    }

    if (initialEmails.magicLinkEmail && !magicLinkEmail) {
      setMagicLinkEmail(initialEmails.magicLinkEmail);
    }
  }, [email, initialEmails.email, initialEmails.magicLinkEmail, magicLinkEmail]);

  if (sessionState.status === "authenticated") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#33312e]">
        Redirecting...
      </div>
    );
  }

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      const msg = "Enter your email first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "login",
        field: "email",
        rule: "required",
        message: msg,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Enter a valid email address.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "login",
        field: "email",
        rule: "invalid_format",
        message: msg,
      });
      return;
    }

    if (!trimmedPassword) {
      const msg = "Enter your password first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "login",
        field: "password",
        rule: "required",
        message: msg,
      });
      return;
    }

    setIsLoading(true);
    trackClientActivity("login_attempted", {
      method: "credentials",
      callbackUrl,
    });

    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        let errorMsg: string;
        let rule: string;

        if (result.error === "CallbackRouteError" || result.error.includes("EMAIL_NOT_VERIFIED")) {
          errorMsg = "Please verify your email address before signing in. Check your inbox for a verification link.";
          rule = "email_not_verified";
        } else {
          errorMsg = "Invalid email or password";
          rule = "invalid_credentials";
        }

        setError(errorMsg);
        trackClientActivity("auth_error_shown", {
          form: "login",
          method: "credentials",
          reason: rule,
          message: errorMsg,
        });
        trackClientActivity("validation_error", {
          form: "login",
          field: "general",
          rule,
          message: errorMsg,
        });
        trackClientActivity("login_failed", {
          method: "credentials",
          callbackUrl,
          reason: rule,
        });
      } else {
        window.location.href = callbackUrl;
      }
    } catch (error) {
      const errorMsg = "An error occurred. Please try again.";
      setError(errorMsg);
      trackClientActivity("auth_error_shown", {
        form: "login",
        method: "credentials",
        reason: "unexpected_error",
        message: errorMsg,
      });
      trackClientActivity("validation_error", {
        form: "login",
        field: "general",
        rule: "unexpected_error",
        message: errorMsg,
      });
      trackClientActivity("login_failed", {
        method: "credentials",
        callbackUrl,
        reason: "unexpected_error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    trackClientActivity("signup_google_clicked", {
      provider: "google",
      callbackUrl,
      surface: "login_page",
      intent: "sign_in_or_create",
    });
    trackClientActivity("oauth_login_started", {
      provider: "google",
      callbackUrl,
      surface: "login_page",
    });
    if (startNativeOAuth("google", callbackUrl)) return;
    signIn("google", { callbackUrl });
  };

  const handleAppleLogin = () => {
    trackClientActivity("oauth_login_started", {
      provider: "apple",
      callbackUrl,
      surface: "login_page",
    });
    if (startNativeOAuth("apple", callbackUrl)) return;
    signIn("apple", { callbackUrl });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedMagicEmail = magicLinkEmail.trim();

    if (!trimmedMagicEmail) {
      const msg = "Enter your email first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "login",
        field: "email",
        rule: "required",
        message: msg,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedMagicEmail)) {
      const msg = "Enter a valid email address.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "login",
        field: "email",
        rule: "invalid_format",
        message: msg,
      });
      return;
    }

    setIsLoading(true);

    try {
      trackClientActivity("magic_link_requested", {
        callbackUrl,
      });
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedMagicEmail, callbackUrl }),
      });
      if (!response.ok) throw new Error("magic_link_failed");
      setMagicLinkSent(true);
    } catch (error) {
      const errorMsg = "Failed to send magic link. Please try again.";
      setError(errorMsg);
      trackClientActivity("auth_error_shown", {
        form: "login",
        method: "magic_link",
        message: errorMsg,
      });
      trackClientActivity("validation_error", {
        form: "login",
        field: "general",
        rule: "magic_link_failed",
        message: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link href="/" className="brand" aria-label="MyBingoCard home">
          My<span>Bingo</span>Card
        </Link>
        <div className="auth-story-copy">
          <span className="pill pill-local">Account access</span>
          <h2>Keep every card and game in one happy place</h2>
          <p>Save drafts, reuse past cards, manage shared links, and host live games without losing the playful part.</p>
        </div>
        <div className="bingo-card auth-bingo-card" aria-label="Welcome bingo card preview">
          <div className="bingo-card-title">
            <strong>Welcome bingo</strong>
            <span className="pill">Let&apos;s play!</span>
          </div>
          <div className="bingo-grid auth-bingo-grid">
            {["Make a card", "Share a link", "Try a theme", "Invite a friend", "FREE", "Play a round", "Save a draft", "Call a number", "Get a bingo"].map((cell) => (
              <span key={cell} className={`bingo-cell${cell === "FREE" ? " is-free" : ""}`}>{cell}</span>
            ))}
          </div>
          <p className="caption">Make a card and keep the fun going.</p>
        </div>
      </aside>

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-card">
          <div className="auth-heading">
            <Link href="/" className="lg:hidden flex items-center justify-center gap-2 mb-8 text-[#6b6459]">
               <span className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
               </span>
               <span className="font-bold text-[#33312e] text-xl">MyBingoCard</span>
             </Link>
            <h1 id="login-title">Sign in</h1>
            <p>Use an account method below to continue to your cards and games.</p>
          </div>

          <div className="notice auth-notice" role="note">
            <span className="notice-icon" aria-hidden="true">🔒</span>
            <div><strong>Secure account access</strong><p className="caption">Your account methods connect to the live MyBingoCard service.</p></div>
          </div>

          <div className="auth-form-stack">
            <div className="field-row auth-social-row">
            <button
              type="button"
              onClick={handleGoogleLogin}
              data-mybingocard-oauth-provider="google"
              className="button social-button"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {appleSignInEnabled && (
              <button
                type="button"
                onClick={handleAppleLogin}
                data-mybingocard-oauth-provider="apple"
                className="button social-button auth-apple-button"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.37 1.51c0 1.14-.42 2.14-1.25 3-.9.92-1.95 1.45-3.08 1.36-.14-1.1.43-2.28 1.25-3.12.86-.88 2.25-1.55 3.08-1.24ZM20.5 17.38c-.47 1.07-.7 1.55-1.3 2.5-.84 1.29-2.02 2.9-3.48 2.91-1.3.01-1.64-.85-3.4-.84-1.77.01-2.14.85-3.44.84-1.46-.01-2.57-1.46-3.41-2.75-2.35-3.61-2.6-7.85-1.15-10.1 1.03-1.6 2.65-2.53 4.18-2.53 1.55 0 2.53.86 3.82.86 1.25 0 2.02-.86 3.83-.86 1.37 0 2.82.75 3.84 2.04-3.37 1.85-2.82 6.67.01 7.93Z" />
                </svg>
                Continue with Apple
              </button>
            )}
            </div>

            <div className="form-divider">or with email</div>

            {justVerified && (
              <div className="notice notice-success" role="status">
                <span className="notice-icon" aria-hidden="true">✓</span>
                <div><strong>Email verified</strong><p className="caption">You can now sign in.</p></div>
              </div>
            )}

            {error && (
              <div className="notice notice-danger" role="alert">
                <span className="notice-icon" aria-hidden="true">!</span>
                <div><strong>Sign in needs another try</strong><p className="caption">{error}</p></div>
              </div>
            )}

            {useMagicLink ? (
              // Magic Link Form
              !magicLinkSent ? (
                <form onSubmit={handleMagicLink} className="form">
                  <div className="field">
                    <label htmlFor="magic-email">Email address</label>
                    <input
                      id="magic-email"
                      type="email"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      required
                      className="text-input"
                      placeholder="name@example.com"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="button button-primary"
                  >
                    {isLoading ? "Sending link..." : "Send sign-in link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className="auth-secondary-link"
                  >
                    Back to password sign in
                  </button>
                </form>
              ) : (
                <div className="auth-success-state">
                  <div className="auth-success-icon">
                     <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                  </div>
                  <h2>Check your email</h2>
                  <p>We&apos;ve sent a magic link to <strong>{magicLinkEmail}</strong>.</p>
                  <button 
                    onClick={() => { setMagicLinkSent(false); setUseMagicLink(false); }}
                    className="auth-secondary-link"
                  >
                    Back to login
                  </button>
                </div>
              )
            ) : (
              // Password Login Form
              <form onSubmit={handleCredentialsLogin} className="form">
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-input"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="field">
                  <div className="form-split">
                    <label htmlFor="password">Password</label>
                    <Link href="/forgot-password">Forgot password?</Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-input"
                    placeholder="At least 8 characters"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="button button-primary"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>

              </form>
            )}

            {!useMagicLink && (
              <button type="button" onClick={() => setUseMagicLink(true)} className="auth-secondary-link">
                Email me a sign-in link
              </button>
            )}

            <p className="auth-account-prompt">
              New here? <Link href="/signup">Create an account</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
