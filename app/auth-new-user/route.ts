import {
  decodeNativeOAuthPending,
  NATIVE_OAUTH_PENDING_COOKIE,
} from "@/lib/native-oauth-pending";
import { nativeOAuthRedirectUrl, normalizeNativeCallback } from "@/lib/native-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rawCallback = request.nextUrl.searchParams.get("callbackUrl");
  const callbackUrl = normalizeNativeCallback(rawCallback, request.nextUrl);

  if (
    callbackUrl.startsWith("/api/native/oauth/google/complete") ||
    callbackUrl.startsWith("/api/native/oauth/apple/complete")
  ) {
    return NextResponse.redirect(nativeOAuthRedirectUrl(callbackUrl, request.nextUrl));
  }

  const pending = decodeNativeOAuthPending(request.cookies.get(NATIVE_OAUTH_PENDING_COOKIE)?.value);
  if (pending) {
    const completePath = `/api/native/oauth/${pending.provider}/complete?callbackUrl=${encodeURIComponent(
      normalizeNativeCallback(pending.callbackUrl, request.nextUrl)
    )}`;
    return NextResponse.redirect(nativeOAuthRedirectUrl(completePath, request.nextUrl));
  }

  const redirectUrl = nativeOAuthRedirectUrl("/create", request.nextUrl);
  redirectUrl.searchParams.set("new", "1");
  redirectUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(redirectUrl);
}
