import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { trackActivity } from "@/lib/activity";
import { getRequestActivityContext } from "@/lib/activity";
import { PLANS } from "@/lib/stripe/config";
import { notifySharedCardViewed } from "@/lib/discord";
import { readJsonObject } from "@/lib/request-json";
import {
  getSharedCardForShareLink,
  incrementSharedCardViews,
} from "@/lib/db/cards";
import { getUserById } from "@/lib/db/users";

async function getOwnerFlags(userId: unknown) {
  try {
    if (!userId) return { shuffleEnabled: false, adFree: false };
    const owner = await getUserById(String(userId));
    const plan = PLANS[(owner?.planType as keyof typeof PLANS) || "FREE"] || PLANS.FREE;
    return {
      shuffleEnabled: !!(plan.limits as any).canShuffleSharedCards,
      adFree: !!plan.limits.adFree,
    };
  } catch {
    return { shuffleEnabled: false, adFree: false };
  }
}

function publicCardPayload(card: any) {
  const { sharePassword: _sharePassword, userId: _userId, ...safeCard } = card;
  return safeCard;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const sharedCard = await getSharedCardForShareLink(shareLink);

    if (!sharedCard || !sharedCard.card.isPublic) {
      return NextResponse.json(
        { error: "Card not found or not shared" },
        { status: 404 }
      );
    }
    const card = sharedCard.card;

    // Check expiry
    if (card.shareExpiresAt && new Date(card.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // If password protected, only return title
    if (card.sharePassword) {
      return NextResponse.json({
        requiresPassword: true,
        card: { title: card.title },
      });
    }

    // Increment views for non-password-protected cards
    await incrementSharedCardViews(sharedCard);

    // Look up card owner's plan for feature flags
    const flags = await getOwnerFlags(card.userId);

    // Track shared card view with viewer context
    const reqCtx = getRequestActivityContext(request);
    const url = new URL(request.url);
    const newViewCount = (card.views || 0) + 1;
    trackActivity({
      event: "shared_card_viewed",
      source: "server",
      userId: null,
      email: null,
      pathname: `/share/${shareLink}`,
      domain: reqCtx.domain,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
      metadata: {
        cardId: card._id.toString(),
        cardTitle: card.title,
        cardOwnerId: card.userId,
        shareLink,
        referrer: request.headers.get("referer") || null,
        utm_source: url.searchParams.get("utm_source") || null,
        utm_medium: url.searchParams.get("utm_medium") || null,
        utm_campaign: url.searchParams.get("utm_campaign") || null,
      },
    }).catch(() => {});

    // Discord notify on milestone views
    notifySharedCardViewed(
      card.title,
      card.userId || null,
      request.headers.get("referer") || null,
      newViewCount
    ).catch(() => {});

    return NextResponse.json({ card: publicCardPayload(card), ...flags });
  } catch (error) {
    console.error("Get shared card error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { password } = body.data;

    const sharedCard = await getSharedCardForShareLink(shareLink);

    if (!sharedCard || !sharedCard.card.isPublic) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    const card = sharedCard.card;

    // Check expiry
    if (card.shareExpiresAt && new Date(card.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Look up card owner's plan for feature flags
    const flags = await getOwnerFlags(card.userId);

    // If no password set, return the card directly
    if (!card.sharePassword) {
      return NextResponse.json({ card: publicCardPayload(card), ...flags });
    }

    const valid = await bcrypt.compare(password, card.sharePassword);
    const reqCtxPost = getRequestActivityContext(request);

    trackActivity({
      event: "shared_card_password_attempt",
      source: "server",
      userId: null,
      email: null,
      pathname: `/share/${shareLink}`,
      domain: reqCtxPost.domain,
      ipAddress: reqCtxPost.ipAddress,
      userAgent: reqCtxPost.userAgent,
      metadata: {
        correct: valid,
        ip_address: reqCtxPost.ipAddress,
        cardId: card._id.toString(),
        shareLink,
      },
    }).catch(() => {});

    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Increment views on successful password verification
    await incrementSharedCardViews(sharedCard);

    // Track shared card view (password-protected)
    const reqCtx = getRequestActivityContext(request);
    trackActivity({
      event: "shared_card_viewed",
      source: "server",
      userId: null,
      email: null,
      pathname: `/share/${shareLink}`,
      domain: reqCtx.domain,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
      metadata: {
        cardId: card._id.toString(),
        cardTitle: card.title,
        cardOwnerId: card.userId,
        shareLink,
        passwordProtected: true,
        referrer: request.headers.get("referer") || null,
      },
    }).catch(() => {});

    return NextResponse.json({ card: publicCardPayload(card), ...flags });
  } catch (error) {
    console.error("Verify share password error:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
