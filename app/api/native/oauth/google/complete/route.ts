import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import {
  createNativeOAuthToken,
  hashNativeOAuthToken,
  nativeOAuthRedirectUrl,
  normalizeNativeCallback,
} from "@/lib/native-oauth";
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

  const client = await clientPromise;
  const db = client.db("mybingocard");

  await db.collection("native_oauth_handoffs").insertOne({
    tokenHash,
    userId: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    callbackUrl,
    provider: "google",
    createdAt: now,
    expiresAt,
    consumedAt: null,
  });

  const appCallback = new URL("mybingocard://oauth/google");
  appCallback.searchParams.set("token", token);
  appCallback.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(appCallback);
}
