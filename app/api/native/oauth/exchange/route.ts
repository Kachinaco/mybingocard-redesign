import { hashNativeOAuthToken, nativeOAuthCookieName, normalizeNativeCallback } from "@/lib/native-oauth";
import clientPromise from "@/lib/mongodb";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/dashboard", request.url));
  }

  const tokenHash = hashNativeOAuthToken(token);
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const now = new Date();

  const handoff = await db.collection("native_oauth_handoffs").findOneAndUpdate(
    {
      tokenHash,
      consumedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { consumedAt: now },
    },
    { returnDocument: "before" }
  );

  if (!handoff) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/dashboard", request.url));
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

  const response = NextResponse.redirect(new URL(callbackUrl, request.url));
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
