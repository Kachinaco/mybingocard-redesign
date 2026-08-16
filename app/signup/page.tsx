"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";
import { buildVerifyEmailPageUrl } from "@/lib/auth/verify-email-page-links";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/callback-url";

type StoredAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
};

function readStoredAttribution(): StoredAttribution {
  try {
    const raw = getBrowserStorageItem("localStorage", "utm_params");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeDocumentReferrer(): string {
  try {
    return typeof document !== "undefined" ? document.referrer : "";
  } catch {
    return "";
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appleSignInEnabled = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasFiredFunnelView = useRef(false);
  const signupCompanyRef = useRef<HTMLInputElement>(null);
  const signupStartedAt = useRef(Date.now());

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

  // Track funnel: signup page viewed (fire once)
  useEffect(() => {
    if (!hasFiredFunnelView.current) {
      hasFiredFunnelView.current = true;
      trackClientActivity("funnel_signup_page_viewed", {
        callbackUrl: sanitizeAuthCallbackUrl(searchParams.get("callbackUrl")),
      });
    }
  }, [searchParams]);

  // Persist UTM params to localStorage so Google OAuth flow can pick them up too
  useEffect(() => {
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer"];
    const stored: Record<string, string> = {};
    utmKeys.forEach((key) => {
      const val = searchParams.get(key);
      if (val) stored[key] = val;
    });
    if (Object.keys(stored).length > 0) {
      setBrowserStorageItem("localStorage", "utm_params", JSON.stringify(stored));
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Client-side validation with tracking
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      const msg = "Enter your name first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "name",
        rule: "required",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    if (!email.trim()) {
      const msg = "Enter your email first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "email",
        rule: "required",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    if (!emailRegex.test(email)) {
      const msg = "Enter a valid email address.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "email",
        rule: "invalid_format",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    if (!password) {
      const msg = "Create a password first.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "password",
        rule: "required",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      const msg = "Use at least 8 characters for your password.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "password",
        rule: "too_short",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      const msg = "Make sure both password fields match.";
      setError(msg);
      trackClientActivity("validation_error", {
        form: "signup",
        field: "password",
        rule: "mismatch",
        message: msg,
      });
      setIsLoading(false);
      return;
    }

    try {
      const storedAttribution = readStoredAttribution();
      trackClientActivity("signup_email_submitted", {
        callbackUrl: sanitizeAuthCallbackUrl(searchParams.get("callbackUrl")),
        has_name: Boolean(name.trim()),
      });
      trackClientActivity("signup_attempted", {
        method: "credentials",
        callbackUrl: sanitizeAuthCallbackUrl(searchParams.get("callbackUrl")),
      });
      const callbackUrl = sanitizeAuthCallbackUrl(searchParams.get("callbackUrl"));
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          callbackUrl,
          utm_source: searchParams.get("utm_source") || storedAttribution.utm_source || undefined,
          utm_medium: searchParams.get("utm_medium") || storedAttribution.utm_medium || undefined,
          utm_campaign: searchParams.get("utm_campaign") || storedAttribution.utm_campaign || undefined,
          utm_content: searchParams.get("utm_content") || storedAttribution.utm_content || undefined,
          utm_term: searchParams.get("utm_term") || storedAttribution.utm_term || undefined,
          referrer: storedAttribution.referrer || safeDocumentReferrer() || undefined,
          companyName: signupCompanyRef.current?.value || "",
          signupStartedAt: signupStartedAt.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const serverError = data.error || "Failed to create account";
        setError(serverError);

        // Classify server error into field + rule for validation_error tracking
        let field = "general";
        let rule = "server_error";
        if (/already exists/i.test(serverError)) {
          field = "email";
          rule = "already_exists";
        } else if (/missing required/i.test(serverError)) {
          field = "general";
          rule = "required";
        } else if (/password.*characters/i.test(serverError)) {
          field = "password";
          rule = "too_short";
        }

        trackClientActivity("auth_error_shown", {
          form: "signup",
          method: "credentials",
          field,
          rule,
          message: serverError,
        });

        trackClientActivity("validation_error", {
          form: "signup",
          field,
          rule,
          message: serverError,
        });

        trackClientActivity("signup_failed", {
          method: "credentials",
          reason: data.error || "signup_failed",
        });
        setIsLoading(false);
        return;
      }

      // Redirect to verify-email page — user must confirm email before logging in
      router.push(
        buildVerifyEmailPageUrl({
          email,
          callbackUrl,
        })
      );
    } catch (error) {
      const msg = "An error occurred. Please try again.";
      setError(msg);
      trackClientActivity("auth_error_shown", {
        form: "signup",
        method: "credentials",
        rule: "unexpected_error",
        message: msg,
      });
      trackClientActivity("validation_error", {
        form: "signup",
        field: "general",
        rule: "unexpected_error",
        message: msg,
      });
      trackClientActivity("signup_failed", {
        method: "credentials",
        reason: "unexpected_error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const callbackUrl = sanitizeAuthCallbackUrl(searchParams.get("callbackUrl"));
    trackClientActivity("signup_google_clicked", {
      provider: "google",
      callbackUrl,
      surface: "signup_page",
      intent: "create_account",
    });
    trackClientActivity("oauth_signup_started", {
      provider: "google",
      callbackUrl,
      surface: "signup_page",
    });
    if (startNativeOAuth("google", callbackUrl)) return;
    signIn("google", { callbackUrl });
  };

  const handleAppleSignup = () => {
    const callbackUrl = sanitizeAuthCallbackUrl(searchParams.get("callbackUrl"));
    trackClientActivity("oauth_signup_started", {
      provider: "apple",
      callbackUrl,
      surface: "signup_page",
    });
    if (startNativeOAuth("apple", callbackUrl)) return;
    signIn("apple", { callbackUrl });
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

      <section className="auth-panel" aria-labelledby="signup-title">
        <div className="auth-card">
          <div className="auth-heading">
             <Link href="/" className="hidden items-center justify-center gap-2 mb-8 text-[#6b6459]">
               <span className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
               </span>
               <span className="font-bold text-[#33312e] text-xl">MyBingoCard</span>
             </Link>
            <h1 id="signup-title">Create an account</h1>
            <p>Register for MyBingoCard and begin your account setup.</p>
          </div>

          <div className="notice auth-notice" role="note">
            <span className="notice-icon" aria-hidden="true">🔒</span>
            <div><strong>Secure account access</strong><p className="caption">Use an email address you control to finish verification.</p></div>
          </div>

          <div className="auth-form-stack">
            <div className="field-row auth-social-row">
            <button
              type="button"
              onClick={handleGoogleSignup}
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
                onClick={handleAppleSignup}
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

            <form onSubmit={handleSignup} className="form">
              <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="companyName">Company</label>
                <input
                  ref={signupCompanyRef}
                  id="companyName"
                  name="companyName"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              {error && (
                <div className="notice notice-danger" role="alert">
                  <span className="notice-icon" aria-hidden="true">!</span>
                  <div><strong>Account setup needs another try</strong><p className="caption">{error}</p></div>
                </div>
              )}

              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-input"
                  placeholder="Your name"
                />
              </div>

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

              <div className="field-row auth-password-row">
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="text-input"
                    placeholder="At least 8 characters"
                  />
                  <span className="field-hint">Use at least 8 characters.</span>
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-input"
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              <div className="auth-submit-row">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="button button-primary"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </form>

            <p className="auth-account-prompt">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
