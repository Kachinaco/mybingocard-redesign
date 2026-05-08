import { signIn } from "@/auth";
import { normalizeNativeCallback } from "@/lib/native-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.AUTH_APPLE_ID || !process.env.AUTH_APPLE_SECRET) {
    return NextResponse.redirect(new URL("/auth-error?error=AppleNotConfigured", request.url));
  }

  const callbackUrl = normalizeNativeCallback(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl);
  const redirectTo = `/api/native/oauth/apple/complete?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return signIn("apple", { redirectTo });
}
