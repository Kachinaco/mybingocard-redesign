"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const errorMessages: Record<string, { title: string; message: string; action: string; href: string }> = {
  Verification: {
    title: "Link expired or already used",
    message: "Magic links can only be used once. Request a new one and click it right away — some email apps pre-scan links which can invalidate them.",
    action: "Request a new magic link",
    href: "/login",
  },
  OAuthAccountNotLinked: {
    title: "Account already exists",
    message: "You previously signed in with a different method. Try signing in the same way you used before.",
    action: "Back to sign in",
    href: "/login",
  },
  OAuthSignin: {
    title: "Sign in failed",
    message: "There was a problem connecting to Google. Please try again.",
    action: "Try again",
    href: "/login",
  },
  Default: {
    title: "Something went wrong",
    message: "There was an error signing you in. Please try again.",
    action: "Back to sign in",
    href: "/login",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const info = errorMessages[error] ?? errorMessages.Default!;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7ff", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "40px 36px", maxWidth: "420px", width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
          {info.title}
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#64748b", lineHeight: 1.6 }}>
          {info.message}
        </p>
        <Link
          href={info.href}
          style={{
            display: "block", padding: "14px 24px", borderRadius: "12px",
            background: "#7c3aed", color: "white", fontWeight: 700,
            fontSize: "15px", textDecoration: "none",
            boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
          }}
        >
          {info.action}
        </Link>
        <p style={{ marginTop: "20px", fontSize: "13px", color: "#94a3b8" }}>
          Need help?{" "}
          <a href="mailto:support@mybingocard.com" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
