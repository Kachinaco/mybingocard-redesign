import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PATHS = ["/dashboard", "/settings"];
const VALID_ACTION = /^[0-9a-f]{40,}$/i;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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
