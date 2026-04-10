"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

const errorMessages: Record<string, { title: string; message: string; action: string; href: string; showGoogle?: boolean }> = {
  Verification: {
    title: "Link expired or already used",
    message: "Magic links can only be used once. Request a new one and click it right away — some email apps pre-scan links which can invalidate them.",
    action: "Request a new magic link",
    href: "/login",
    showGoogle: true,
  },
  OAuthAccountNotLinked: {
    title: "Account already exists",
    message: "You previously signed in with a different method. Try signing in the same way you used before.",
    action: "Back to sign in",
    href: "/login",
  },
  Configuration: {
    title: "Sign in hiccup",
    message: "Something went wrong during sign in. This is usually temporary — please try again.",
    action: "Try again",
    href: "/login",
    showGoogle: true,
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
    showGoogle: true,
  },
};

function AuthErrorContent() {
  const sessionState = useSession();
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const info = errorMessages[error] ?? errorMessages.Default!;
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (sessionState.status !== "authenticated") return;
    if (error !== "Configuration" && error !== "OAuthAccountNotLinked") return;

    window.location.href = callbackUrl;
  }, [callbackUrl, error, sessionState.status]);

  if (
    sessionState.status === "authenticated" &&
    (error === "Configuration" || error === "OAuthAccountNotLinked")
  ) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#64748b" }}>
        Redirecting...
      </div>
    );
  }

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
        {info.showGoogle && (
          <>
            <div style={{ margin: "20px 0 16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                width: "100%", padding: "14px 24px", borderRadius: "12px",
                background: "white", color: "#334155", fontWeight: 700,
                fontSize: "15px", border: "2px solid #e2e8f0", cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </>
        )}
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
