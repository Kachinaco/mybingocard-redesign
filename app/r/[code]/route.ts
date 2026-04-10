import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || typeof code !== "string" || code.length > 64 || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const targetUrl = new URL("/signup", request.url);
  targetUrl.searchParams.set("ref", code);

  const response = NextResponse.redirect(targetUrl);

  response.cookies.set({
    name: "mbc_referral",
    value: code,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  return response;
}
