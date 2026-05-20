import { NextResponse } from "next/server";
import { auth } from "./auth";
import {
  decodeNativeOAuthPending,
  nativeOAuthRedirectUrl,
  NATIVE_OAUTH_PENDING_COOKIE,
  normalizeNativeCallback,
} from "./lib/native-oauth-pending";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/game/host"];
const VALID_ACTION = /^[0-9a-f]{40,}$/i;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
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

  if (pathname.endsWith(".map")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pendingNativeOAuth = decodeNativeOAuthPending(
    req.cookies.get(NATIVE_OAUTH_PENDING_COOKIE)?.value
  );

  if (
    req.auth?.user?.email &&
    pendingNativeOAuth &&
    !pathname.startsWith("/api/native/oauth/")
  ) {
    const completePath = `/api/native/oauth/${pendingNativeOAuth.provider}/complete?callbackUrl=${encodeURIComponent(
      normalizeNativeCallback(pendingNativeOAuth.callbackUrl, nextUrl)
    )}`;
    const response = NextResponse.redirect(nativeOAuthRedirectUrl(completePath, nextUrl));
    response.cookies.delete(NATIVE_OAUTH_PENDING_COOKIE);
    return response;
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
  matcher: ["/((?!_next/image|uploads|favicon).*)"],
};
