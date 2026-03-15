import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = typeof body?.event === "string" ? body.event.trim() : "";

    if (!event) {
      return NextResponse.json({ error: "Event is required" }, { status: 400 });
    }

    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    await trackActivity({
      event,
      source: "client",
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      pathname: typeof body?.pathname === "string" ? body.pathname : requestContext.pathname,
      sessionId: typeof body?.sessionId === "string" ? body.sessionId : null,
      anonymousId: typeof body?.anonymousId === "string" ? body.anonymousId : null,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
