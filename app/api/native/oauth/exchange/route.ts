import {
  hashNativeOAuthToken,
  nativeOAuthCookieName,
  nativeOAuthRedirectUrl,
  normalizeNativeCallback,
} from "@/lib/native-oauth";
import { consumeNativeOAuthHandoff } from "@/lib/db/auth-data";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(nativeOAuthRedirectUrl("/login?callbackUrl=/dashboard", request.nextUrl));
  }

  const tokenHash = hashNativeOAuthToken(token);
  const now = new Date();

  const handoff = await consumeNativeOAuthHandoff(tokenHash, now);

  if (!handoff) {
    return NextResponse.redirect(nativeOAuthRedirectUrl("/login?callbackUrl=/dashboard", request.nextUrl));
  }

  const callbackUrl = normalizeNativeCallback(handoff.callbackUrl, request.nextUrl);
  const cookieName = nativeOAuthCookieName(request.nextUrl);
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Missing AUTH_SECRET/NEXTAUTH_SECRET for native OAuth exchange");
  }

  const sessionToken = await encode({
    token: {
      sub: handoff.userId,
      id: handoff.userId,
      email: handoff.email,
      name: handoff.name || undefined,
      picture: handoff.image || undefined,
    },
    secret,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const response = NextResponse.redirect(nativeOAuthRedirectUrl(callbackUrl, request.nextUrl));
  response.cookies.set({
    name: cookieName,
    value: sessionToken,
    httpOnly: true,
    secure: cookieName.startsWith("__Secure-"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
