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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side - Visual & Testimonial */}
      <div className="hidden lg:flex flex-col justify-between lg:w-1/2 bg-gradient-to-br from-[#7c5cff] via-[#7c5cff] to-[#33312e] p-12 text-white relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#7c5cff] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#7c5cff] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-200"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7c5cff] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-400"></div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors w-fit">
            <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center border border-white/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Create unforgettable moments with custom bingo cards.
            </h2>
            <div className="flex gap-2 mb-8">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-[#ffb800] fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              ))}
            </div>
            <blockquote className="text-xl text-[#7c5cff]/15 italic leading-relaxed">
              &ldquo;MyBingoCard saved my wedding reception! The guests absolutely loved the custom cards, and it was so easy to make them.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7c5cff] flex items-center justify-center text-white font-bold border-2 border-[#7c5cff]">
                SM
              </div>
              <div>
                <div className="font-bold">Sarah Miller</div>
                <div className="text-[#7c5cff] text-sm">Wedding Planner</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#7c5cff]">
          © {new Date().getFullYear()} MyBingoCard. All rights reserved.
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
             <Link href="/" className="lg:hidden flex items-center justify-center gap-2 mb-8 text-[#6b6459]">
               <span className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
               </span>
               <span className="font-bold text-[#33312e] text-xl">MyBingoCard</span>
             </Link>
            <h1 className="text-3xl font-bold tracking-tight text-[#33312e]">Create your account</h1>
            <p className="mt-2 text-[#33312e]">
              Sign in first to save your first card. Premium unlocks unlimited cards, exports, and sharing.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignup}
              data-mybingocard-oauth-provider="google"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[#a39a88] rounded-xl text-[#33312e] font-medium hover:bg-[#fff7ed] hover:border-[#a39a88] transition-all duration-200 shadow-sm hover:shadow-md"
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
              Sign up with Google
            </button>

            {appleSignInEnabled && (
              <button
                onClick={handleAppleSignup}
                data-mybingocard-oauth-provider="apple"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black border border-black rounded-xl text-white font-medium hover:bg-[#33312e] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.37 1.51c0 1.14-.42 2.14-1.25 3-.9.92-1.95 1.45-3.08 1.36-.14-1.1.43-2.28 1.25-3.12.86-.88 2.25-1.55 3.08-1.24ZM20.5 17.38c-.47 1.07-.7 1.55-1.3 2.5-.84 1.29-2.02 2.9-3.48 2.91-1.3.01-1.64-.85-3.4-.84-1.77.01-2.14.85-3.44.84-1.46-.01-2.57-1.46-3.41-2.75-2.35-3.61-2.6-7.85-1.15-10.1 1.03-1.6 2.65-2.53 4.18-2.53 1.55 0 2.53.86 3.82.86 1.25 0 2.02-.86 3.83-.86 1.37 0 2.82.75 3.84 2.04-3.37 1.85-2.82 6.67.01 7.93Z" />
                </svg>
                Sign up with Apple
              </button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#a39a88]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#6b6459]">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
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
                <div className="bg-[#ff5d8f]/10 border border-[#ff5d8f]/15 text-[#ff5d8f] px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#33312e] mb-1.5">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff] focus:border-transparent outline-none transition-all duration-200"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#33312e] mb-1.5">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff] focus:border-transparent outline-none transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#33312e] mb-1.5">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff] focus:border-transparent outline-none transition-all duration-200"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#33312e] mb-1.5">Confirm</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff] focus:border-transparent outline-none transition-all duration-200"
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#7c5cff] hover:shadow-xl hover:shadow-[#7c5cff] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
                    "Create Account"
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-[#33312e] mt-8">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#7c5cff] hover:text-[#7c5cff] hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
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
