import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import type { BatchPurchase } from "@/lib/db/batchPurchases";
import type { BingoCard } from "@/lib/db/cards";
import { bulkCreateSharedLinks } from "@/lib/db/sharedLinks";
import { sendShareLinkInvitationEmail, sendShareLinkSummaryEmail } from "@/lib/email";

const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://mybingocard.com"
).replace(/\/$/, "");

const PRICE_PER_LINK_CENTS = 0;
const MIN_SHARE_LINKS = 5;
const MAX_EXPIRES_DAYS = 365;

let checkoutRefsIndexEnsured = false;

function sanitizeContactList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (trimmed.length > 254) continue;
    cleaned.push(trimmed);
  }
  return cleaned;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureCheckoutRefsIndexes(db: any) {
  if (checkoutRefsIndexEnsured) return;
  try {
    await db.collection("share_link_checkout_refs").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 24 * 60 * 60, name: "share_link_checkout_refs_ttl" }
    );
  } catch (error) {
    console.error("share_link_checkout_refs index setup failed:", error);
  }
  checkoutRefsIndexEnsured = true;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id;
    const sessionUserEmail = session.user.email;

    const body = await request.json();
    const {
      batchId,
      count: rawCount,
      recipientEmails: rawEmails,
      recipientPhones: rawPhones,
      expiresInDays: rawExpiresInDays,
    } = body ?? {};

    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 }
      );
    }

    const recipientEmails = sanitizeContactList(rawEmails).filter(isEmail);
    const recipientPhones = sanitizeContactList(rawPhones);

    // Determine effective count: explicit count OR number of recipients provided.
    let count = Number(rawCount);
    if (!Number.isFinite(count) || count <= 0) {
      count = Math.max(recipientEmails.length, recipientPhones.length);
    }
    count = Math.floor(count);

    if (count < MIN_SHARE_LINKS) {
      return NextResponse.json(
        { error: `count must be at least ${MIN_SHARE_LINKS}` },
        { status: 400 }
      );
    }

    if (count > 500) {
      return NextResponse.json(
        { error: "count cannot exceed 500 per request" },
        { status: 400 }
      );
    }

    if (recipientEmails.length > count) {
      return NextResponse.json(
        { error: "More recipients than links" },
        { status: 400 }
      );
    }

    // Optional expiration window. 0 / missing = no expiration.
    let expiresInDays: number | null = null;
    if (rawExpiresInDays !== undefined && rawExpiresInDays !== null) {
      const parsed = Number(rawExpiresInDays);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_EXPIRES_DAYS) {
        return NextResponse.json(
          { error: `expiresInDays must be between 0 and ${MAX_EXPIRES_DAYS}` },
          { status: 400 }
        );
      }
      if (parsed > 0) {
        expiresInDays = Math.floor(parsed);
      }
    }

    // Resolve card IDs for this batch. The frontend may pass either:
    //   (a) a real batch_purchases._id, or
    //   (b) a synthetic batchId that is actually a card _id (because batches are
    //       implicit "Title #N" groupings with no real batchId field on cards).
    const client = await clientPromise;
    const db = client.db("mybingocard");
    await ensureCheckoutRefsIndexes(db);

    let batchObjectId: ObjectId | null = null;
    try {
      batchObjectId = new ObjectId(batchId);
    } catch {
      batchObjectId = null;
    }

    let generatedCardIds: string[] = [];

    // Try real batch_purchases lookup first.
    const batchPurchase = batchObjectId
      ? await db
          .collection<BatchPurchase>("batch_purchases")
          .findOne({ _id: batchObjectId })
      : null;

    if (batchPurchase) {
      if (batchPurchase.userId !== sessionUserId) {
        return NextResponse.json(
          { error: "You do not own this batch" },
          { status: 403 }
        );
      }
      if (batchPurchase.status !== "generated") {
        return NextResponse.json(
          {
            error: `Batch is not ready for share links (status: ${batchPurchase.status})`,
          },
          { status: 400 }
        );
      }
      generatedCardIds = Array.isArray(batchPurchase.generatedCardIds)
        ? batchPurchase.generatedCardIds
        : [];
    } else {
      let userIdQuery: any = { userId: sessionUserId };
      try {
        const userObjectId = new ObjectId(sessionUserId);
        userIdQuery = {
          $or: [
            { userId: sessionUserId },
            { userId: userObjectId },
          ],
        };
      } catch {
        // keep string-only query
      }

      const explicitBatchCards = await db
        .collection<BingoCard>("cards")
        .find({
          ...userIdQuery,
          batchId,
        })
        .sort({ createdAt: 1 })
        .toArray();

      if (explicitBatchCards.length > 0) {
        generatedCardIds = explicitBatchCards.map((card) => card._id.toString());
      } else if (!batchObjectId) {
        return NextResponse.json(
          { error: "Invalid batchId" },
          { status: 400 }
        );
      } else {
      // Fall back to treating batchId as a card _id, then finding all cards
      // from the same user that share the stripped title prefix.
      const representative = await db
        .collection<BingoCard>("cards")
        .findOne({ _id: batchObjectId });

      if (!representative) {
        return NextResponse.json(
          { error: "Batch not found" },
          { status: 404 }
        );
      }

      const ownerIdStr =
        typeof representative.userId === "string"
          ? representative.userId
          : (representative.userId as any)?.toString?.() || "";

      if (ownerIdStr !== sessionUserId) {
        return NextResponse.json(
          { error: "You do not own this batch" },
          { status: 403 }
        );
      }

      // Strip trailing " #N" from the title to get the batch base title.
      const baseTitle = (representative.title || "").replace(/\s+#\d+\s*$/, "").trim();

      if (!baseTitle) {
        return NextResponse.json(
          { error: "Card is not part of a batch" },
          { status: 400 }
        );
      }

      // Escape regex special chars and match "<baseTitle> #N"
      const escaped = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const titleRegex = new RegExp(`^${escaped}\\s+#\\d+\\s*$`);

      const batchCards = await db
        .collection<BingoCard>("cards")
        .find({
          ...userIdQuery,
          title: titleRegex,
        })
        .sort({ createdAt: 1 })
        .toArray();

      generatedCardIds = batchCards.map((c) => c._id.toString());
      }
    }

    if (generatedCardIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "This batch has no generated cards yet. Generate the cards first before selling share links.",
        },
        { status: 400 }
      );
    }

    if (count > generatedCardIds.length) {
      return NextResponse.json(
        {
          error: `count (${count}) exceeds number of cards in the batch (${generatedCardIds.length}).`,
        },
        { status: 400 }
      );
    }

    const totalAmountCents = PRICE_PER_LINK_CENTS * count;
    const recipientEmailCount = recipientEmails.length;
    const selfFallbackCount = Math.max(0, count - recipientEmailCount);

    const cardIdsForCheckout = generatedCardIds.slice(0, count);
    const expiresAt = expiresInDays === null
      ? undefined
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const cardObjectIds = cardIdsForCheckout.flatMap((cardId) => {
      try {
        return [new ObjectId(cardId)];
      } catch {
        return [];
      }
    });
    const cardsForLinks = await db
      .collection<BingoCard>("cards")
      .find({ _id: { $in: cardObjectIds } })
      .project({ title: 1 })
      .toArray();
    const titleByCardId = new Map(cardsForLinks.map((card) => [card._id.toString(), card.title || "Bingo card"]));

    const createdLinks = await bulkCreateSharedLinks(
      cardIdsForCheckout.map((cardId, index) => ({
        batchId,
        cardId,
        ownerUserId: sessionUserId,
        ownerEmail: sessionUserEmail,
        recipientEmail: recipientEmails[index],
        recipientPhone: recipientPhones[index],
        amountCents: 0,
        ...(expiresAt ? { expiresAt } : {}),
      }))
    );

    const ownerName = session.user.name || sessionUserEmail;
    const summaryLinks = createdLinks.map((link) => ({
      linkId: link.linkId,
      cardTitle: titleByCardId.get(link.cardId) || "Bingo card",
      linkUrl: `${appUrl}/play/${link.linkId}`,
    }));

    await Promise.allSettled([
      sendShareLinkSummaryEmail(sessionUserEmail, ownerName, summaryLinks),
      ...createdLinks
        .filter((link) => link.recipientEmail)
        .map((link) =>
          sendShareLinkInvitationEmail(
            link.recipientEmail!,
            null,
            ownerName,
            `${appUrl}/play/${link.linkId}`,
            titleByCardId.get(link.cardId) || "Bingo card"
          )
        ),
    ]);

    await trackActivity({
      event: "share_links_generated",
      source: "server",
      userId: sessionUserId,
      email: sessionUserEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        purchaseType: "share_links",
        batchId,
        count: createdLinks.length,
        requestedCount: count,
        amountCents: totalAmountCents,
        recipientEmailCount,
        recipientPhoneCount: recipientPhones.length,
        freeForAll: true,
      },
    });

    return NextResponse.json({
      free: true,
      generated: true,
      redirectUrl: `${appUrl}/dashboard/share-links?generated=true&count=${createdLinks.length}&recipientCount=${recipientEmailCount}&selfCount=${selfFallbackCount}`,
      checkoutUrl: `${appUrl}/dashboard/share-links?generated=true&count=${createdLinks.length}&recipientCount=${recipientEmailCount}&selfCount=${selfFallbackCount}`,
      count: createdLinks.length,
      amountCents: totalAmountCents,
    });
  } catch (error: any) {
    console.error("Share link generate error:", error);
    return NextResponse.json(
      { error: "Could not generate share links" },
      { status: 500 }
    );
  }
}
