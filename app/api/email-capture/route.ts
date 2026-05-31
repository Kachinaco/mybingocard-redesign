import { NextResponse } from "next/server";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";
import clientPromise from "@/lib/mongodb";
import {
  getEmailSubscribersCollection,
  upsertEmailSubscriber,
} from "@/lib/email-capture/subscribers";
import { readJsonObject } from "@/lib/request-json";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { email, source } = body.data;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const normalizedInputEmail = email.toLowerCase().trim();
    const reqCtx = getRequestActivityContext(request);
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const blockFilters: Array<Record<string, string>> = [{ type: "email", value: normalizedInputEmail }];
    if (reqCtx.ipAddress) {
      blockFilters.push({ type: "ip", value: reqCtx.ipAddress });
    }
    const captureBlock = await db.collection("signup_blocks").findOne({
      active: { $ne: false },
      $or: blockFilters,
    });
    if (captureBlock) {
      trackActivity({
        event: "email_capture_blocked",
        source: "server",
        userId: null,
        email: normalizedInputEmail,
        pathname: "/api/email-capture",
        domain: reqCtx.domain,
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
        metadata: {
          source: source || "popup",
          blockType: captureBlock.type,
          reason: captureBlock.reason || "blocked_identity",
        },
      }).catch(() => {});
      return NextResponse.json({ success: true, message: "Thanks! Check your email for your free templates." });
    }

    const subscribers = await getEmailSubscribersCollection(db);
    const { email: normalizedEmail, duplicate } = await upsertEmailSubscriber(
      subscribers,
      normalizedInputEmail,
      source
    );
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
