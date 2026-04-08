import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PATHS = ["/dashboard", "/settings"];
const VALID_ACTION = /^[0-9a-f]{40,}$/i;

// Paths that bypass the subscription gate (unauthenticated or pre-checkout flows)
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

  // Subscription gate: FREE/inactive users must complete checkout first
  if (req.auth?.user?.email && !isGateBypassed(pathname)) {
    const session = req.auth as typeof req.auth & {
      planType?: string;
      subscriptionStatus?: string;
    };

    if (
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
