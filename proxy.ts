import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PATHS = ["/dashboard", "/settings"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default auth(async (req) => {
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
  matcher: ["/dashboard/:path*", "/settings"],
};
