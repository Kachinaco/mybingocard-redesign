import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getEmailPreferences, updateEmailPreferences } from "@/lib/db/email-marketing";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getEmailPreferences(session.user.email));
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

    await updateEmailPreferences({
      email: session.user.email,
      marketingEmails: marketingEmails !== false,
      productUpdates: productUpdates !== false,
    });

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
