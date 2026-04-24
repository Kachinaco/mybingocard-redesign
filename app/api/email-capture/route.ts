import { NextResponse } from "next/server";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";
import clientPromise from "@/lib/mongodb";
import {
  getEmailSubscribersCollection,
  upsertEmailSubscriber,
} from "@/lib/email-capture/subscribers";

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const subscribers = await getEmailSubscribersCollection(db);
    const { email: normalizedEmail, duplicate } = await upsertEmailSubscriber(
      subscribers,
      email,
      source
    );

    const reqCtx = getRequestActivityContext(request);
    trackActivity({
      event: "email_captured",
      source: "server",
      userId: null,
      email: normalizedEmail,
      pathname: "/api/email-capture",
      domain: reqCtx.domain,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
      metadata: {
        source: source || "popup",
        duplicate,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Thanks! Check your email for your free templates." });
  } catch (error) {
    console.error("Email capture error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
