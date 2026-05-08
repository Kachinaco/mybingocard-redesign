import { normalizeNativeCallback } from "@/lib/native-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rawCallback = request.nextUrl.searchParams.get("callbackUrl");
  const callbackUrl = normalizeNativeCallback(rawCallback, request.nextUrl);

  if (callbackUrl.startsWith("/api/native/oauth/google/complete")) {
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  const redirectUrl = new URL("/create", request.url);
  redirectUrl.searchParams.set("new", "1");
  redirectUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(redirectUrl);
}
