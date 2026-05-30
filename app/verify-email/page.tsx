"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { buildVerifyEmailSigninHref } from "@/lib/auth/verify-email-page-links";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const signupEmail = searchParams.get("email");
  const callbackUrl = searchParams.get("callbackUrl");
  const signInHref = useMemo(() => buildVerifyEmailSigninHref(searchParams), [searchParams]);
  const hasFiredFunnelView = useRef(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!hasFiredFunnelView.current) {
      hasFiredFunnelView.current = true;
      trackClientActivity("funnel_email_verification_page_viewed", {
        hasError: !!error,
        errorType: error || undefined,
      });
    }
  }, [error]);

  const handleResend = async () => {
    if (!signupEmail || resendState === "sending") return;
    setResendState("sending");
    trackClientActivity("resend_verification_clicked", { email: signupEmail });

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, callbackUrl }),
      });

      if (res.ok) {
        setResendState("sent");
      } else {
        setResendState("error");
      }
    } catch {
      setResendState("error");
    }
  };

  const errorMessages: Record<string, string> = {
    missing_token: "No verification token found. Please check your email for the verification link.",
    invalid_token: "This verification link is invalid. It may have already been used.",
    expired_token: "This verification link has expired. Please request a new one below.",
    server_error: "Something went wrong. Please try again or contact support.",
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification failed</h1>
          <p className="text-slate-500 mb-6">{errorMessages[error] || "Something went wrong."}</p>

          {signupEmail && (error === "expired_token" || error === "invalid_token") ? (
            <div className="space-y-3">
              {resendState === "sent" ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                  ✅ New verification link sent! Check your inbox.
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendState === "sending"}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-70"
                >
                  {resendState === "sending" ? "Sending..." : "Resend Verification Email"}
                </button>
              )}
              {resendState === "error" && (
                <p className="text-red-500 text-sm">Failed to resend. Please try again.</p>
              )}
            </div>
          ) : (
            <Link href="/signup" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
              Sign up again
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
        <p className="text-slate-500 mb-2">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
        {signupEmail && (
          <p className="text-slate-700 font-medium mb-2">{signupEmail}</p>
        )}
        <p className="text-slate-400 text-sm mb-4">
          Didn&apos;t get it? Check your spam folder, or resend the link below.
        </p>

        {signupEmail && (
          <div className="mb-6">
            {resendState === "sent" ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                ✅ New verification link sent! Check your inbox.
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendState === "sending"}
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline transition-colors disabled:opacity-70"
              >
                {resendState === "sending" ? "Sending..." : "Resend verification email"}
              </button>
            )}
            {resendState === "error" && (
              <p className="text-red-500 text-sm mt-1">Failed to resend. Please try again.</p>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 pt-6">
          <p className="text-slate-400 text-sm">
            Already verified?{" "}
            <Link href={signInHref} className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
