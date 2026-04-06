import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyBingoAchieved, notifyUpgradeDismissed, notifyBatchSelected } from "@/lib/discord";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = typeof body?.event === "string" ? body.event.trim() : "";

    if (!event) {
      return NextResponse.json({ error: "Event is required" }, { status: 400 });
    }

    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

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
      metadata,
    });

    // Fire Discord notifications for high-signal client events
    if (event === "bingo_achieved") {
      notifyBingoAchieved(
        metadata.cardTitle || "Untitled",
        metadata.gridSize || 5,
        metadata.timeToBingoSeconds || 0,
        metadata.context || "unknown"
      ).catch(() => {});
    }

    if (event === "upgrade_dismissed") {
      notifyUpgradeDismissed(
        session?.user?.email || null,
        metadata.source || "unknown",
        metadata
      ).catch(() => {});
    }

    if (event === "batch_tier_selected") {
      notifyBatchSelected(
        session?.user?.email || null,
        metadata.batch_count || 0,
        metadata.price || "$0",
        metadata.plan_type || "GUEST",
        !session?.user
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
