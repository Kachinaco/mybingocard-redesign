import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSharedLinkByLinkId } from "@/lib/db/sharedLinks";
import { getCardById } from "@/lib/db/cards";
import { getUserById } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

// Generic 404 shown to unauthenticated callers regardless of whether the link
// never existed, was claimed, expired, or was refunded. Collapsing these
// outcomes removes the enumeration oracle.
function genericNotFound() {
  return NextResponse.json(
    { error: "Share link not found" },
    { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;

    if (!linkId || typeof linkId !== "string") {
      return NextResponse.json(
        { error: "Invalid link" },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Fast-fail obviously malformed IDs before hitting the database.
    if (!/^[a-zA-Z0-9]{6,32}$/.test(linkId)) {
      return genericNotFound();
    }

    const session = await auth();
    const sessionUserId = session?.user?.id ?? null;

    const link = await getSharedLinkByLinkId(linkId);

    if (!link) {
      return genericNotFound();
    }

    const now = new Date();
    const isClaimer =
      !!sessionUserId && link.claimedByUserId === sessionUserId;

    if (link.status === "refunded") {
      if (!sessionUserId) {
        return genericNotFound();
      }
      return NextResponse.json(
        { error: "This share link is no longer valid", status: "revoked" },
        { status: 410, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Determine effective status for the frontend.
    // DB statuses: "pending" | "claimed" | "expired" | "refunded"
    // Frontend statuses: "unclaimed" | "claimed" | "expired" | "revoked"
    let effectiveStatus: "unclaimed" | "claimed" | "expired" | "revoked";
    const pastExpiry = !!link.expiresAt && new Date(link.expiresAt) < now;

    if (link.status === "claimed") {
      effectiveStatus = "claimed";
    } else if (link.status === "expired") {
      effectiveStatus = "expired";
    } else if (pastExpiry) {
      effectiveStatus = "expired";
    } else {
      effectiveStatus = "unclaimed";
    }

    // Legitimate claimers can still view their card after expiration — only
    // unclaimed links actually become unreachable when expiresAt passes.
    const claimerBypassExpiry =
      link.status === "claimed" && isClaimer;

    if (effectiveStatus === "expired" && !claimerBypassExpiry) {
      if (!sessionUserId) {
        return genericNotFound();
      }
      return NextResponse.json(
        { error: "This share link has expired", status: "expired" },
        { status: 410, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // If the claimer is bypassing expiry, surface the link as "claimed" so
    // the frontend renders the playable state instead of an expired banner.
    if (claimerBypassExpiry) {
      effectiveStatus = "claimed";
    }

    const [card, owner] = await Promise.all([
      getCardById(link.cardId),
      getUserById(link.ownerUserId),
    ]);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // canPlay: either the link is claimed and the session user is the claimer,
    // or the link was claimed by anybody and there's no session (legacy behavior
    // is strict — only the claimer can play). Unclaimed links show a preview only.
    const canPlay =
      effectiveStatus === "claimed" &&
      !!sessionUserId &&
      link.claimedByUserId === sessionUserId;

    // Only first name to avoid leaking full identity to share recipients.
    const ownerDisplay =
      (owner as { displayName?: string } | null)?.displayName ??
      (owner?.name ? owner.name.split(" ")[0] : null) ??
      null;

    // PlayClient's SSR metadata fetch sets this header so we don't double-count
    // the view from both metadata generation and the actual page render.
    const previewOnly = request.headers.get("x-preview-only") === "1";

    if (!previewOnly) {
      const requestContext = getRequestActivityContext(request);
      trackActivity({
        event: "share_link_viewed",
        source: "server",
        userId: sessionUserId,
        email: session?.user?.email || null,
        pathname: `/play/${linkId}`,
        domain: requestContext.domain,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          linkId,
          batchId: link.batchId,
          cardId: link.cardId,
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        link: {
          id: link.linkId,
          status: effectiveStatus,
          ownerName: ownerDisplay,
          expiresAt: link.expiresAt ?? null,
        },
        card: {
          _id: card._id.toString(),
          title: card.title,
          description: card.description,
          size: card.size,
          rows: card.rows,
          columns: card.columns,
          bingoVariant: card.bingoVariant || "custom",
          cells: card.cells,
          freeSpace: card.freeSpace,
          style: card.style ?? {},
        },
        canPlay,
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Get share link error:", error);
    return NextResponse.json(
      { error: "Failed to fetch share link" },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
