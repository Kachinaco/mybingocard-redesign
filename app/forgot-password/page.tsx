"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      const msg = "Enter your email first.";
      setError(msg);
      setMessage("");
      trackClientActivity("auth_error_shown", {
        form: "forgot_password",
        field: "email",
        rule: "required",
        message: msg,
      });
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Enter a valid email address.";
      setError(msg);
      setMessage("");
      trackClientActivity("auth_error_shown", {
        form: "forgot_password",
        field: "email",
        rule: "invalid_format",
        message: msg,
      });
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    trackClientActivity("password_reset_requested", {
      surface: "forgot_password_page",
    });

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data.error || "Unable to send reset email.";
        setError(msg);
        trackClientActivity("auth_error_shown", {
          form: "forgot_password",
          rule: "server_error",
          message: msg,
        });
      } else {
        setMessage(data.message || `If ${trimmedEmail} has an account, a reset link is on the way.`);
      }
    } catch {
      const msg = "Unable to send reset email. Please try again.";
      setError(msg);
      trackClientActivity("auth_error_shown", {
        form: "forgot_password",
        rule: "network_error",
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#a39a88] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#33312e] mb-2">Forgot your password?</h1>
        <p className="text-[#33312e] mb-6">Enter your email and we'll send a reset link if an account exists.</p>

        {message && <div className="mb-4 rounded-lg bg-[#2ec4b6]/10 text-[#2ec4b6] px-3 py-2 text-sm">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-[#ff5d8f]/10 text-[#ff5d8f] px-3 py-2 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#33312e] mb-1">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#a39a88] px-3 py-2 outline-none focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#7c5cff] text-white py-2.5 font-semibold hover:bg-[#7c5cff] disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#33312e] text-center">
          Remembered your password?{" "}
          <Link href="/login" className="text-[#7c5cff] hover:text-[#7c5cff] font-semibold">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
