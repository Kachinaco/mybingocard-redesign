import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/game/host"];
const VALID_ACTION = /^[0-9a-f]{40,}$/i;

// Paths that bypass the subscription gate
// Includes auth/pre-checkout flows AND public/guest content (game join, game play, shareable cards, referral redirects)
const GATE_BYPASS_PREFIXES = [
  "/api",
  "/login",
  "/signup",
  "/auth-error",
  "/create",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/_next",
  "/favicon",
  "/uploads",
  "/icons",
  "/manifest",
  "/game",
  "/play",
  "/r",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isGateBypassed(pathname: string): boolean {
  return GATE_BYPASS_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`) ||
      pathname.startsWith(`${prefix}.`)
  );
}

export default auth(async (req) => {
  // Block malformed Server Action requests (bot protection)
  if (req.method === "POST") {
    const action = req.headers.get("next-action");
    if (action !== null && !VALID_ACTION.test(action)) {
      return new NextResponse(null, { status: 400 });
    }
  }

  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Redirect AI referral traffic to /welcome
  const AI_DOMAINS = [
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "gemini.google.com",
    "perplexity.ai",
    "copilot.microsoft.com",
    "you.com",
    "poe.com",
    "phind.com",
    "bard.google.com",
    "meta.ai",
    "character.ai",
    "pi.ai",
  ];
  if (pathname === "/") {
    // Check utm_source parameter
    const utmSource = nextUrl.searchParams.get("utm_source");
    if (utmSource && AI_DOMAINS.includes(utmSource)) {
      const welcomeUrl = new URL("/welcome", nextUrl.origin);
      return NextResponse.redirect(welcomeUrl);
    }
    // Check referrer header
    const referer = req.headers.get("referer") || "";
    if (AI_DOMAINS.some((domain) => referer.includes(domain))) {
      const welcomeUrl = new URL("/welcome", nextUrl.origin);
      return NextResponse.redirect(welcomeUrl);
    }
    // Check user agent for AI in-app browsers
    const userAgent = req.headers.get("user-agent") || "";
    if (/GeminiiOS|GeminiAndroid|ChatGPT|ClaudeApp/i.test(userAgent)) {
      const welcomeUrl = new URL("/welcome", nextUrl.origin);
      return NextResponse.redirect(welcomeUrl);
    }
  }

  // Subscription gate: FREE/inactive users must complete checkout first.
  // If the JWT planType/subscriptionStatus are missing (stale token from before
  // those fields were added), don't gate — let the page do its own check.
  if (req.auth?.user?.email && !isGateBypassed(pathname)) {
    const session = req.auth as typeof req.auth & {
      planType?: string;
      subscriptionStatus?: string;
    };

    const hasSubFields =
      typeof session.planType === "string" &&
      typeof session.subscriptionStatus === "string";

    if (
      hasSubFields &&
      session.planType === "FREE" &&
      session.subscriptionStatus === "inactive"
    ) {
      const gateUrl = new URL("/create?new=1", nextUrl.origin);
      return NextResponse.redirect(gateUrl);
    }
  }

  // Auth wall for protected paths (dashboard, settings)
  if (!isProtectedPath(pathname)) {
    return undefined;
  }

  if (!req.auth?.user?.email) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads|favicon).*)"],
};
