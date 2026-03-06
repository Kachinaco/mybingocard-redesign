import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PATHS = ["/dashboard", "/templates", "/settings", "/cards"];

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

  const response = await fetch(new URL("/api/user/plan", nextUrl.origin), {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return undefined;
  }

  const plan = await response.json();
  if (!plan.trialEligible) {
    return undefined;
  }

  const trialUrl = new URL("/start-trial", nextUrl.origin);
  trialUrl.searchParams.set("returnTo", `${pathname}${nextUrl.search}`);
  return NextResponse.redirect(trialUrl);
});

export const config = {
  matcher: ["/dashboard/:path*", "/templates", "/settings", "/cards/:path*"],
};
