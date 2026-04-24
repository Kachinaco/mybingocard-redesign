import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createUser, getUserByEmail } from "@/lib/db/users";
import { sendEmailVerificationEmail } from "@/lib/email";
import { notifySignup, sendDiscordNotification } from "@/lib/discord";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getReferralByCode, createReferral } from "@/lib/db/referrals";
import { parseUserAgent } from "@/lib/parse-user-agent";
import { sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";

export async function POST(request: Request) {
  try {
    const { name, email, password, website, callbackUrl, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer } = await request.json();
    const requestContext = getRequestActivityContext(request);

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Honeypot: bots fill in the "website" field, humans leave it blank
    if (website) {
      // Silently accept but don't create the user (fool the bot)
      return NextResponse.json({ message: "User created successfully", user: { id: "bot", name, email } }, { status: 201 });
    }

    // Name validation: reject bot-like names (3+ consecutive uppercase letters in a single token)
    const nameLooksLikeBot = /[A-Z]{3,}/.test(name.replace(/\s+/g, ' ').split(' ').filter((w: string) => w.length > 6).join(''));
    if (nameLooksLikeBot) {
      return NextResponse.json({ error: "Please enter your real name" }, { status: 400 });
    }

    // Rate limiting: max 5 signups per IP per hour
    const ip = requestContext.ipAddress || "unknown";
    if (ip !== "unknown") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { default: clientPromisePre } = await import("@/lib/mongodb");
      const dbPre = (await clientPromisePre).db("mybingocard");
      const recentFromIp = await dbPre.collection("users").countDocuments({
        createdAt: { $gte: oneHourAgo },
        createdByIp: ip,
      });
      if (recentFromIp >= 5) {
        return NextResponse.json({ error: "Too many accounts created from this location. Please try again later." }, { status: 429 });
      }
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Parse device & language from request headers
    const rawUA = request.headers.get("user-agent") || "";
    const signupDevice = rawUA ? parseUserAgent(rawUA) : undefined;
    const signupLanguage = request.headers.get("accept-language")?.split(",")[0]?.trim() || undefined;

    // Create user (emailVerified left unset = unverified for credentials signup)
    const user = await createUser({
      name,
      email,
      password,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      last_utm_source: utm_source,
      last_utm_medium: utm_medium,
      last_utm_campaign: utm_campaign,
      last_utm_content: utm_content,
      last_utm_term: utm_term,
      last_referrer: referrer,
      signupMethod: "credentials",
      signupDevice,
      signupLanguage,
    });

    // Normalize referrer domain from the Referer header or body referrer
    let referrerDomain = "direct";
    try {
      const refererHeader = request.headers.get("referer") || referrer;
      if (refererHeader) {
        const refUrl = new URL(refererHeader);
        referrerDomain = refUrl.hostname.replace(/^www\./, "");
      }
    } catch {
      // Invalid URL or missing — keep as 'direct'
    }

    // Store the IP and referrerDomain on the user record
    {
      const { default: clientPromiseIp } = await import("@/lib/mongodb");
      const dbIp = (await clientPromiseIp).db("mybingocard");
      const updateFields: Record<string, unknown> = { referrerDomain };
      if (requestContext.ipAddress) {
        updateFields.createdByIp = requestContext.ipAddress;
      }
      await dbIp.collection("users").updateOne(
        { _id: user._id },
        { $set: updateFields }
      );
    }

    // Generate email verification token
    const { randomBytes } = await import("crypto");
    const verifyToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const { default: clientPromise } = await import("@/lib/mongodb");
    const dbClient = await clientPromise;
    const db = dbClient.db("mybingocard");
    await db.collection("email_verification_tokens").insertOne({
      userId: user._id.toString(),
      email,
      token: verifyToken,
      expires,
      createdAt: new Date(),
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
    const nextCallbackUrl = sanitizePostVerificationCallback(callbackUrl);
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verifyToken}&callbackUrl=${encodeURIComponent(nextCallbackUrl)}`;

    // Send verification email instead of welcome email
    sendEmailVerificationEmail(email, name, verifyUrl).catch(console.error);

    // Notify Discord
    notifySignup(name, email, {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    }).catch(console.error);

    await trackActivity({
      event: "signup_completed",
      source: "server",
      userId: user._id.toString(),
      email: user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        method: "credentials",
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer,
        referrerDomain,
      },
    });

    // Track referral if mbc_referral cookie exists
    try {
      const cookieStore = await cookies();
      const referralCode = cookieStore.get("mbc_referral")?.value;
      if (referralCode) {
        const referrer = await getReferralByCode(referralCode);
        if (referrer && referrer.email !== email) {
          await createReferral({
            referrerId: referrer._id.toString(),
            referredEmail: email,
            referredUserId: user._id.toString(),
          });

          sendDiscordNotification("", [{
            title: "Referral Signup!",
            color: 0x8b5cf6,
            fields: [
              { name: "Referred By", value: referrer.name || referrer.email, inline: true },
              { name: "New User", value: `${name} (${email})`, inline: true },
              { name: "Referral Code", value: referralCode, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }]).catch(console.error);
        }
      }
    } catch (referralError) {
      console.error("Referral tracking error:", referralError);
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
