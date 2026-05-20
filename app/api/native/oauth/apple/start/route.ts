import { signIn } from "@/auth";
import {
  encodeNativeOAuthPending,
  NATIVE_OAUTH_PENDING_COOKIE,
} from "@/lib/native-oauth-pending";
import { nativeOAuthRedirectUrl, normalizeNativeCallback } from "@/lib/native-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.AUTH_APPLE_ID || !process.env.AUTH_APPLE_SECRET) {
    return NextResponse.redirect(nativeOAuthRedirectUrl("/auth-error?error=AppleNotConfigured", request.nextUrl));
  }

  const callbackUrl = normalizeNativeCallback(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl);
  const redirectTo = `/api/native/oauth/apple/complete?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const cookieStore = await cookies();

  cookieStore.set({
    name: NATIVE_OAUTH_PENDING_COOKIE,
    value: encodeNativeOAuthPending({ provider: "apple", callbackUrl }),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  return signIn("apple", { redirectTo });
}
