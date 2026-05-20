import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { trackActivity } from "@/lib/activity";
import { getRequestActivityContext } from "@/lib/activity";
import { PLANS } from "@/lib/stripe/config";
import { notifySharedCardViewed } from "@/lib/discord";

const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_ATTEMPT_MAX = 10;
const passwordAttemptHits = new Map<string, number[]>();

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkPasswordAttemptLimit(shareLink: string, request: Request): boolean {
  const key = `${shareLink}:${getClientIp(request)}`;
  const now = Date.now();
  const cutoff = now - PASSWORD_ATTEMPT_WINDOW_MS;
  const recent = (passwordAttemptHits.get(key) || []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= PASSWORD_ATTEMPT_MAX) {
    passwordAttemptHits.set(key, recent);
    return false;
  }

  recent.push(now);
  passwordAttemptHits.set(key, recent);
  return true;
}

async function getOwnerFlags(db: any, userId: string) {
  try {
    const owner = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { planType: 1 } }
    );
    const plan = PLANS[(owner?.planType as keyof typeof PLANS) || "FREE"] || PLANS.FREE;
    return {
      shuffleEnabled: !!(plan.limits as any).canShuffleSharedCards,
      adFree: !!plan.limits.adFree,
    };
  } catch {
    return { shuffleEnabled: false, adFree: false };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const card = await db.collection("cards").findOne({ shareLink });

    if (!card || !card.isPublic) {
      return NextResponse.json(
        { error: "Card not found or not shared" },
        { status: 404 }
      );
    }

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
    await db.collection("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );

    // Look up card owner's plan for feature flags
    const flags = await getOwnerFlags(db, card.userId);

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

    return NextResponse.json({ card, ...flags });
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
    const { password } = await request.json();

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const card = await db.collection("cards").findOne({ shareLink });

    if (!card || !card.isPublic) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Check expiry
    if (card.shareExpiresAt && new Date(card.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Look up card owner's plan for feature flags
    const flags = await getOwnerFlags(db, card.userId);

    // If no password set, return the card directly
    if (!card.sharePassword) {
      return NextResponse.json({ card, ...flags });
    }

    if (!checkPasswordAttemptLimit(shareLink, request)) {
      return NextResponse.json(
        { error: "Too many password attempts. Please try again later." },
        { status: 429 }
      );
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
    await db.collection("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );

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

    return NextResponse.json({ card, ...flags });
  } catch (error) {
    console.error("Verify share password error:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
