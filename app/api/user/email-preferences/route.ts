import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const prefs = await db.collection("email_preferences").findOne({
      email: session.user.email.toLowerCase().trim(),
    });

    return NextResponse.json({
      marketingEmails: prefs?.marketingEmails !== false,
      productUpdates: prefs?.productUpdates !== false,
    });
  } catch (error) {
    console.error("Email preferences error:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { marketingEmails, productUpdates } = await request.json();

    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("email_preferences").updateOne(
      { email: session.user.email.toLowerCase().trim() },
      {
        $set: {
          email: session.user.email.toLowerCase().trim(),
          marketingEmails: marketingEmails !== false,
          productUpdates: productUpdates !== false,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    await trackActivity({
      event: "email_preferences_updated",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        marketingEmails: marketingEmails !== false,
        productUpdates: productUpdates !== false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email preferences update error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
