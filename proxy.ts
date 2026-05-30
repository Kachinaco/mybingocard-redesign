import {
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
  NextResponse,
} from "next/server";
import { auth } from "./auth";
import {
  decodeNativeOAuthPending,
  nativeOAuthRedirectUrl,
  NATIVE_OAUTH_PENDING_COOKIE,
  normalizeNativeCallback,
} from "./lib/native-oauth-pending";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/game/host"];
const SERVER_ACTION_PATHS = ["/admin/errors"];
const VALID_ACTION = /^[0-9a-f]{40,}$/i;
const BLOCK_MALFORMED_SERVER_ACTION =
  process.env.MBC_BLOCK_MALFORMED_SERVER_ACTION === "1";

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function sanitizedRequestHeaders(req: { headers: Headers }): Headers {
  const headers = new Headers(req.headers);
  headers.delete("next-action");
  return headers;
}

function shouldStripMalformedServerAction(req: NextRequest): boolean {
  if (req.method !== "POST") return false;
  const action = req.headers.get("next-action");
  return action !== null && !VALID_ACTION.test(action);
}

function isSupportedServerActionPath(pathname: string): boolean {
  return SERVER_ACTION_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isUnsupportedServerActionRequest(req: NextRequest): boolean {
  if (req.method !== "POST") return false;
  if (!req.headers.has("next-action")) return false;
  return !isSupportedServerActionPath(req.nextUrl.pathname);
}

function nextWithSanitizedHeaders(req: NextRequest): NextResponse {
  return NextResponse.next({
    request: {
      headers: sanitizedRequestHeaders(req),
    },
  });
}

function getPendingNativeOAuth(req: NextRequest) {
  return decodeNativeOAuthPending(
    req.cookies.get(NATIVE_OAUTH_PENDING_COOKIE)?.value
  );
}

function shouldRunAuth(req: NextRequest): boolean {
  const pathname = req.nextUrl.pathname;
  if (isProtectedPath(pathname)) return true;
  return Boolean(getPendingNativeOAuth(req)) && !pathname.startsWith("/api/native/oauth/");
}

const authenticatedProxy = auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const strippedMalformedServerAction = shouldStripMalformedServerAction(req);
  const pendingNativeOAuth = getPendingNativeOAuth(req);

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
    if (strippedMalformedServerAction) {
      return NextResponse.next({
        request: {
          headers: sanitizedRequestHeaders(req),
        },
      });
    }
    return undefined;
  }

  if (!req.auth?.user?.email) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (strippedMalformedServerAction) {
    return NextResponse.next({
      request: {
        headers: sanitizedRequestHeaders(req),
      },
    });
  }

  return undefined;
}) as unknown as NextMiddleware;

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  const strippedMalformedServerAction = shouldStripMalformedServerAction(req);

  if (pathname.endsWith(".map")) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (isUnsupportedServerActionRequest(req)) {
    return new NextResponse(null, { status: 400 });
  }

  // Optional bot protection. Disabled by default so unexpected framework action
  // formats cannot block real users before the app can handle the request.
  if (strippedMalformedServerAction && BLOCK_MALFORMED_SERVER_ACTION) {
    return new NextResponse(null, { status: 400 });
  }

  if (!shouldRunAuth(req)) {
    if (strippedMalformedServerAction) {
      return nextWithSanitizedHeaders(req);
    }
    return NextResponse.next();
  }

  return authenticatedProxy(req, event);
}

export const config = {
  matcher: ["/((?!_next/image|uploads|favicon).*)"],
};
