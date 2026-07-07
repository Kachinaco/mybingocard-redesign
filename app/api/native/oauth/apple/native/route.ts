import {
  createNativeOAuthHandoff,
  getUserByAuthAccount,
  upsertAuthAccountForUser,
} from "@/lib/db/auth-data";
import { createUser, getUserByEmail, recordNativeOAuthLogin, updateUser } from "@/lib/db/users";
import { createNativeOAuthToken, hashNativeOAuthToken, normalizeNativeCallback } from "@/lib/native-oauth";
import { verifyAppleIdentityToken } from "@/lib/apple-native-auth";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type NativeAppleRequest = {
  identityToken?: string;
  nonce?: string;
  callbackUrl?: string;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
};

function emailIsVerified(value: boolean | string | undefined): boolean {
  return value === true || value === "true";
}

function nameFromBody(body: NativeAppleRequest): string | undefined {
  const parts = [body.fullName?.givenName, body.fullName?.familyName]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export async function POST(request: NextRequest) {
  let body: NativeAppleRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.identityToken || !body.nonce) {
    return NextResponse.json({ error: "Missing Apple identity token." }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyAppleIdentityToken(body.identityToken, body.nonce);
  } catch (error) {
    console.error("Native Apple identity verification failed:", error);
    return NextResponse.json({ error: "Apple sign-in could not be verified." }, { status: 401 });
  }

  const callbackUrl = normalizeNativeCallback(body.callbackUrl, request.nextUrl);
  const appleUserId = identity.sub;
  const appleEmail = identity.email?.toLowerCase();
  const fullName = nameFromBody(body);
  const now = new Date();

  if (appleEmail && !emailIsVerified(identity.email_verified)) {
    return NextResponse.json({ error: "Apple email is not verified." }, { status: 401 });
  }

  let user = await getUserByAuthAccount("apple", appleUserId);

  if (!user && appleEmail) {
    user = await getUserByEmail(appleEmail);
  }

  if (!user) {
    if (!appleEmail) {
      return NextResponse.json(
        { error: "Apple did not return an email address for this first sign-in." },
        { status: 400 }
      );
    }

    user = await createUser({
      email: appleEmail,
      name: fullName || appleEmail,
      signupMethod: "apple",
    });

    user = await updateUser(user._id.toString(), {
      emailVerified: now,
      lastLoginAt: now,
      loginCount: 1,
    });
  } else {
    user = await recordNativeOAuthLogin(user, {
      signupMethod: "apple",
      name: fullName,
      now,
    });
  }

  if (!user?._id || !user.email) {
    return NextResponse.json({ error: "Apple sign-in could not create a session." }, { status: 500 });
  }

  await upsertAuthAccountForUser({
    provider: "apple",
    providerAccountId: appleUserId,
    userId: user._id,
    now,
  });

  const token = createNativeOAuthToken();
  const tokenHash = hashNativeOAuthToken(token);
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  await createNativeOAuthHandoff({
    tokenHash,
    userId: user._id.toString(),
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    callbackUrl,
    provider: "apple",
    appleUserId: crypto.createHash("sha256").update(appleUserId).digest("hex"),
    createdAt: now,
    expiresAt,
    consumedAt: null,
  });

  return NextResponse.json({ token, callbackUrl });
}
