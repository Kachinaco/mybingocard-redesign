import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=missing_token`);
  }

  try {
    const client = await clientPromise;
    const db = client.db("mybingocard");

    const record = await db.collection("email_verification_tokens").findOne({ token });

    if (!record) {
      return NextResponse.redirect(`${appUrl}/verify-email?error=invalid_token`);
    }

    if (new Date(record.expires) < new Date()) {
      await db.collection("email_verification_tokens").deleteOne({ token });
      return NextResponse.redirect(`${appUrl}/verify-email?error=expired_token`);
    }

    // Mark user as verified
    await db.collection("users").updateOne(
      { _id: new ObjectId(record.userId) },
      { $set: { emailVerified: new Date(), updatedAt: new Date() } }
    );

    // Delete the used token
    await db.collection("email_verification_tokens").deleteOne({ token });

    return NextResponse.redirect(`${appUrl}/login?verified=1&email=${encodeURIComponent(record.email)}`);
  } catch (err) {
    console.error("Email verification error:", err);
    return NextResponse.redirect(`${appUrl}/verify-email?error=server_error`);
  }
}
