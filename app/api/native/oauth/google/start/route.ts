import { signIn } from "@/auth";
import { normalizeNativeCallback } from "@/lib/native-oauth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const callbackUrl = normalizeNativeCallback(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl);
  const redirectTo = `/api/native/oauth/google/complete?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return signIn("google", { redirectTo });
}
