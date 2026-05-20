import { signIn } from "@/auth";
import {
  encodeNativeOAuthPending,
  NATIVE_OAUTH_PENDING_COOKIE,
} from "@/lib/native-oauth-pending";
import {
  normalizeNativeCallback,
} from "@/lib/native-oauth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const callbackUrl = normalizeNativeCallback(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl);
  const redirectTo = `/api/native/oauth/google/complete?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const cookieStore = await cookies();

  cookieStore.set({
    name: NATIVE_OAUTH_PENDING_COOKIE,
    value: encodeNativeOAuthPending({ provider: "google", callbackUrl }),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  return signIn("google", { redirectTo });
}
