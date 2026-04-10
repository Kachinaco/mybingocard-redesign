import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSharedLinksByOwner,
  type SharedLink,
} from "@/lib/db/sharedLinks";

function serializeLink(link: SharedLink) {
  return {
    _id: link._id?.toString(),
    linkId: link.linkId,
    batchId: link.batchId,
    cardId: link.cardId,
    ownerUserId: link.ownerUserId,
    ownerEmail: link.ownerEmail,
    recipientEmail: link.recipientEmail,
    recipientPhone: link.recipientPhone,
    recipientName: link.recipientName,
    status: link.status,
    claimedAt: link.claimedAt
      ? new Date(link.claimedAt).toISOString()
      : undefined,
    createdAt: new Date(link.createdAt).toISOString(),
    amountCents: link.amountCents,
    expiresAt: link.expiresAt
      ? new Date(link.expiresAt).toISOString()
      : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const owner = url.searchParams.get("owner");

    if (owner !== "me") {
      return NextResponse.json(
        { error: "Only owner=me is supported" },
        { status: 400 }
      );
    }

    const rawLinks = await getSharedLinksByOwner(session.user.id);
    const links = rawLinks.map(serializeLink);

    const grouped: Record<string, ReturnType<typeof serializeLink>[]> = {};
    for (const link of links) {
      const key = link.batchId;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key]!.push(link);
    }

    return NextResponse.json({ links, grouped });
  } catch (error) {
    console.error("List share links error:", error);
    return NextResponse.json(
      { error: "Failed to list share links" },
      { status: 500 }
    );
  }
}
