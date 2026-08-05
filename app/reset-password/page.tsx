"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Missing reset token");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to reset password");
      } else {
        setMessage("Password reset successful. You can now sign in.");
      }
    } catch {
      setError("Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#a39a88] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#33312e] mb-2">Set a new password</h1>
        <p className="text-[#33312e] mb-6">Choose a secure password for your account.</p>

        {message && <div className="mb-4 rounded-lg bg-[#2ec4b6]/10 text-[#2ec4b6] px-3 py-2 text-sm">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-[#ff5d8f]/10 text-[#ff5d8f] px-3 py-2 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#33312e] mb-1">New password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#a39a88] px-3 py-2 outline-none focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#33312e] mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-[#a39a88] px-3 py-2 outline-none focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#7c5cff] text-white py-2.5 font-semibold hover:bg-[#7c5cff] disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#33312e] text-center">
          <Link href="/login" className="text-[#7c5cff] hover:text-[#7c5cff] font-semibold">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
