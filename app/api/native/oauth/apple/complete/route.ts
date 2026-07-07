import { auth } from "@/auth";
import { createNativeOAuthHandoff } from "@/lib/db/auth-data";
import {
  createNativeOAuthToken,
  hashNativeOAuthToken,
  nativeOAuthRedirectUrl,
  normalizeNativeCallback,
} from "@/lib/native-oauth";
import { NATIVE_OAUTH_PENDING_COOKIE } from "@/lib/native-oauth-pending";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string | null; name?: string | null; image?: string | null }
    | undefined;

  if (!user?.id || !user.email) {
    return NextResponse.redirect(nativeOAuthRedirectUrl("/login?callbackUrl=/dashboard", request.nextUrl));
  }

  const callbackUrl = normalizeNativeCallback(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl);
  const token = createNativeOAuthToken();
  const tokenHash = hashNativeOAuthToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  await createNativeOAuthHandoff({
    tokenHash,
    userId: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    callbackUrl,
    provider: "apple",
    createdAt: now,
    expiresAt,
    consumedAt: null,
  });

  const appCallback = new URL("mybingocard://oauth/apple");
  appCallback.searchParams.set("token", token);
  appCallback.searchParams.set("callbackUrl", callbackUrl);

  const response = NextResponse.redirect(appCallback);
  response.cookies.delete(NATIVE_OAUTH_PENDING_COOKIE);
  return response;
}
