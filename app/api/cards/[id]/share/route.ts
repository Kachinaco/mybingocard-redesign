import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById, updateCard, generateShareLink } from "@/lib/db/cards";
import { getUserById } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { hasPremiumAccess, isLegacyFreeUser } from "@/lib/subscription-status";
import bcrypt from "bcryptjs";

function hasShareSettingsAccess(user: Parameters<typeof isLegacyFreeUser>[0]): boolean {
  return hasPremiumAccess(user) || isLegacyFreeUser(user);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const card = await getCardById(id);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    if (card.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to share this card" },
        { status: 403 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!hasShareSettingsAccess(user)) {
      return NextResponse.json(
        {
          error: "Start your 3-day trial or choose lifetime access to share bingo cards.",
          upgradeRequired: true,
          trialRequired: true,
        },
        { status: 403 }
      );
    }

    // If card already has a share link, return it
    if (card.shareLink) {
      await trackActivity({
        event: "share_link_reused",
        source: "server",
        userId: session.user.id,
        email: session.user.email || null,
        pathname: requestContext.pathname,
        domain: requestContext.domain,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          cardId: id,
          shareLink: card.shareLink,
        },
      });
      return NextResponse.json({ shareLink: card.shareLink });
    }

    // Generate new share link
    const shareLink = generateShareLink();
    await updateCard(id, { shareLink, isPublic: true });

    await trackActivity({
      event: "share_link_generated",
      source: "server",
      userId: session.user.id,
      email: session.user.email || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardId: id,
        shareLink,
      },
    });

    return NextResponse.json({ shareLink });
  } catch (error) {
    console.error("Generate share link error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const card = await getCardById(id);
    if (!card || card.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or forbidden" },
        { status: 404 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!hasShareSettingsAccess(user)) {
      return NextResponse.json(
        {
          error: "Start your 3-day trial or choose lifetime access to update share settings.",
          upgradeRequired: true,
          trialRequired: true,
        },
        { status: 403 }
      );
    }

    const { password, expiresAt } = await request.json();

    const updateData: Record<string, unknown> = {};

    if (password !== undefined) {
      if (password === null || password === "") {
        updateData.sharePassword = null;
      } else {
        updateData.sharePassword = await bcrypt.hash(password, 10);
      }
    }

    if (expiresAt !== undefined) {
      updateData.shareExpiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    await updateCard(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update share settings error:", error);
    return NextResponse.json(
      { error: "Failed to update share settings" },
      { status: 500 }
    );
  }
}
