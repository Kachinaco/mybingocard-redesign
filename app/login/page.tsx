"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";
import { getInitialLoginEmails } from "@/lib/auth/login-prefill";
import { useSession } from "next-auth/react";

function LoginContent() {
  const searchParams = useSearchParams();
  const sessionState = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
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
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-600">
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
      const msg = "Email address is required.";
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
      const msg = "Please enter a valid email address.";
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
      const msg = "Password is required.";
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
        } else if (result.error.includes("TOO_MANY_ATTEMPTS")) {
          errorMsg = "Too many failed login attempts. Please wait an hour before trying again.";
          rule = "rate_limited";
        } else {
          errorMsg = "Invalid email or password";
          rule = "invalid_credentials";
        }

        setError(errorMsg);
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
    trackClientActivity("oauth_login_started", {
      provider: "google",
      callbackUrl,
    });
    signIn("google", { callbackUrl });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedMagicEmail = magicLinkEmail.trim();

    if (!trimmedMagicEmail) {
      const msg = "Email address is required.";
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
      const msg = "Please enter a valid email address.";
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
      await signIn("nodemailer", {
        email: trimmedMagicEmail,
        callbackUrl,
        redirect: false,
      });
      setMagicLinkSent(true);
    } catch (error) {
      const errorMsg = "Failed to send magic link. Please try again.";
      setError(errorMsg);
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side - Visual & Testimonial */}
      <div className="hidden lg:flex flex-col justify-between lg:w-1/2 bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-200"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-400"></div>
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
              Welcome back to your creative space.
            </h2>
            <div className="flex gap-2 mb-8">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              ))}
            </div>
            <blockquote className="text-xl text-indigo-100 italic leading-relaxed">
              &ldquo;MyBingoCard has completely transformed how I organize classroom activities. It's so intuitive and the designs are beautiful.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-indigo-400">
                JD
              </div>
              <div>
                <div className="font-bold">Jennifer Davis</div>
                <div className="text-indigo-300 text-sm">Elementary Teacher</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-indigo-200">
          © {new Date().getFullYear()} MyBingoCard. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <Link href="/" className="lg:hidden flex items-center justify-center gap-2 mb-8 text-gray-500">
               <span className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
               </span>
               <span className="font-bold text-gray-900 text-xl">MyBingoCard</span>
             </Link>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in to your account</h1>
            <p className="mt-2 text-gray-600">
              Enter your details below to access your cards.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
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
              Sign in with Google
            </button>

            {!useMagicLink && (
              <button
                type="button"
                onClick={() => setUseMagicLink(true)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-16 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email me a Magic Link
              </button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>

            {justVerified && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                ✅ Email verified! You can now sign in.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {useMagicLink ? (
              // Magic Link Form
              !magicLinkSent ? (
                <form onSubmit={handleMagicLink} className="space-y-5">
                  <div>
                    <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <input
                      id="magic-email"
                      type="email"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all duration-200"
                      placeholder="you@example.com"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? "Sending Link..." : "Send Magic Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Back to password sign in
                  </button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
                  <p className="text-gray-600 mb-6">We've sent a magic link to <strong>{magicLinkEmail}</strong></p>
                  <button 
                    onClick={() => { setMagicLinkSent(false); setUseMagicLink(false); }}
                    className="text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Back to login
                  </button>
                </div>
              )
            ) : (
              // Password Login Form
              <form onSubmit={handleCredentialsLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all duration-200"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700">Forgot password?</Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all duration-200"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

              </form>
            )}

            <p className="text-center text-sm text-gray-600 mt-8">
              Don't have an account?{" "}
              <Link href="/signup" className="font-semibold text-violet-600 hover:text-violet-700 hover:underline transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
