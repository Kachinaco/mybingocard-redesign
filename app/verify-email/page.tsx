"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    missing_token: "No verification token found. Please check your email for the verification link.",
    invalid_token: "This verification link is invalid. It may have already been used.",
    expired_token: "This verification link has expired. Please sign up again to get a new one.",
    server_error: "Something went wrong. Please try again or contact support.",
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification failed</h1>
          <p className="text-slate-500 mb-6">{errorMessages[error] || "Something went wrong."}</p>
          <Link href="/signup" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Sign up again
          </Link>
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
        <p className="text-slate-400 text-sm mb-6">
          Didn&apos;t get it? Check your spam folder.
        </p>
        <div className="border-t border-slate-100 pt-6">
          <p className="text-slate-400 text-sm">
            Already verified?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
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
