import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import {
  notifyBatchButtonClicked,
  notifyBatchSelected,
  notifyBingoAchieved,
  notifyExportButtonClicked,
  notifyUpgradeDismissed,
} from "@/lib/discord";
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

    if (event === "export_button_clicked") {
      notifyExportButtonClicked(
        session?.user?.email || null,
        {
          source: String(metadata.source || "unknown"),
          exportType: String(metadata.export_type || metadata.exportType || "unknown"),
          cardTitle: typeof metadata.title === "string" ? metadata.title : typeof metadata.cardTitle === "string" ? metadata.cardTitle : null,
          planType: typeof metadata.plan_type === "string" ? metadata.plan_type : typeof metadata.planType === "string" ? metadata.planType : null,
          batchCount: typeof metadata.batch_count === "number" ? metadata.batch_count : typeof metadata.batchCount === "number" ? metadata.batchCount : null,
          isGuest: !session?.user,
        }
      ).catch(() => {});
    }

    if (
      event === "batch_button_clicked" ||
      event === "batch_primary_clicked" ||
      event === "batch_pdf_export_started"
    ) {
      notifyBatchButtonClicked(
        session?.user?.email || null,
        {
          action: String(metadata.action || event),
          source: String(metadata.source || "unknown"),
          batchCount: typeof metadata.batch_count === "number" ? metadata.batch_count : typeof metadata.batchCount === "number" ? metadata.batchCount : null,
          price: typeof metadata.price === "string" ? metadata.price : null,
          planType: typeof metadata.plan_type === "string" ? metadata.plan_type : typeof metadata.planType === "string" ? metadata.planType : null,
          cardsPerPage: typeof metadata.cardsPerPage === "number" ? metadata.cardsPerPage : null,
          grayscale: typeof metadata.grayscale === "boolean" ? metadata.grayscale : undefined,
          isGuest: !session?.user,
        }
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
