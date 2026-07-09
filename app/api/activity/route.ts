import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyBingoAchieved } from "@/lib/discord";
import { readJsonObject } from "@/lib/request-json";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const event = typeof body.data.event === "string" ? body.data.event.trim() : "";

    if (!event) {
      return NextResponse.json({ error: "Event is required" }, { status: 400 });
    }

    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    const metadata = body.data.metadata && typeof body.data.metadata === "object" ? body.data.metadata : {};

    await trackActivity({
      event,
      source: "client",
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      pathname: typeof body.data.pathname === "string" ? body.data.pathname : requestContext.pathname,
      sessionId: typeof body.data.sessionId === "string" ? body.data.sessionId : null,
      anonymousId: typeof body.data.anonymousId === "string" ? body.data.anonymousId : null,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata,
    });

    // Keep raw product telemetry in analytics. Discord is reserved for actual
    // outcomes and exceptions, not every save/checkout/export interaction.
    if (event === "bingo_achieved") {
      notifyBingoAchieved(
        metadata.cardTitle || "Untitled",
        metadata.gridSize || 5,
        metadata.timeToBingoSeconds || 0,
        metadata.context || "unknown"
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
