import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import type Stripe from "stripe";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe/config";
import clientPromise from "@/lib/mongodb";
import { getUserById } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyCheckoutStarted } from "@/lib/discord";
import type { BatchPurchase } from "@/lib/db/batchPurchases";
import type { BingoCard } from "@/lib/db/cards";

const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://mybingocard.com"
).replace(/\/$/, "");

const PRICE_PER_LINK_CENTS = 10;
const MIN_SHARE_LINKS = 5;
const MAX_EXPIRES_DAYS = 365;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const checkoutRateLimit = new Map<string, number[]>();
let checkoutRefsIndexEnsured = false;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = checkoutRateLimit.get(userId) || [];
  const recent = timestamps.filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    checkoutRateLimit.set(userId, recent);
    return false;
  }
  recent.push(now);
  checkoutRateLimit.set(userId, recent);
  return true;
}

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

    if (!checkRateLimit(sessionUserId)) {
      return NextResponse.json(
        { error: "Too many checkout attempts, please wait a minute" },
        { status: 429 }
      );
    }

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
        { error: "count cannot exceed 500 per checkout" },
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

    // Resolve current user record for Stripe customer reuse.
    const userRecord = await getUserById(sessionUserId);
    let reusableCustomerId = userRecord?.stripeCustomerId || null;

    if (!reusableCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: sessionUserEmail,
        limit: 10,
      });
      for (const customer of existingCustomers.data) {
        if ("deleted" in customer && customer.deleted) continue;
        reusableCustomerId = customer.id;
        break;
      }
    }

    const totalAmountCents = PRICE_PER_LINK_CENTS * count;
    const recipientEmailCount = recipientEmails.length;
    const selfFallbackCount = Math.max(0, count - recipientEmailCount);

    // Cards the webhook should attach share links to. Passed through Stripe
    // metadata so the webhook doesn't have to re-resolve synthetic batchIds.
    const cardIdsForCheckout = generatedCardIds.slice(0, count);

    const metadata: Record<string, string> = {
      purchaseType: "share_links",
      userId: sessionUserId,
      userEmail: sessionUserEmail,
      batchId,
      count: String(count),
      pricePerLinkCents: String(PRICE_PER_LINK_CENTS),
      amountCents: String(totalAmountCents),
    };

    if (expiresInDays !== null) {
      metadata.expiresInDays = String(expiresInDays);
    }

    // Stripe metadata values are capped at 500 chars per key. Encode the card
    // ids as JSON. If we exceed the limit we stash them in a temp collection
    // and pass a reference id in metadata instead.
    let checkoutRefId: ObjectId | null = null;
    let checkoutRefDoc:
      | {
          _id: ObjectId;
          userId: string;
          createdAt: Date;
          cardIds?: string[];
          recipientEmails?: string[];
          recipientPhones?: string[];
        }
      | null = null;

    const ensureCheckoutRef = () => {
      if (!checkoutRefId) {
        checkoutRefId = new ObjectId();
        checkoutRefDoc = {
          _id: checkoutRefId,
          userId: sessionUserId,
          createdAt: new Date(),
        };
      }
      return checkoutRefId;
    };

    const cardIdsJson = JSON.stringify(cardIdsForCheckout);
    if (cardIdsJson.length <= 500) {
      metadata.cardIds = cardIdsJson;
    } else {
      const tempRef = ensureCheckoutRef();
      checkoutRefDoc!.cardIds = cardIdsForCheckout;
      metadata.cardIdsRef = tempRef.toString();
    }

    // Stripe metadata values are capped at 500 chars per key. Encode recipient
    // lists as JSON and drop to a "too long" signal if exceeded.
    const emailsJson = JSON.stringify(recipientEmails);
    if (emailsJson.length <= 500) {
      metadata.recipientEmails = emailsJson;
    } else {
      const tempRef = ensureCheckoutRef();
      checkoutRefDoc!.recipientEmails = recipientEmails;
      metadata.recipientEmailsRef = tempRef.toString();
    }

    const phonesJson = JSON.stringify(recipientPhones);
    if (phonesJson.length <= 500) {
      metadata.recipientPhones = phonesJson;
    } else if (recipientPhones.length > 0) {
      const tempRef = ensureCheckoutRef();
      checkoutRefDoc!.recipientPhones = recipientPhones;
      metadata.recipientPhonesRef = tempRef.toString();
    }

    if (checkoutRefDoc) {
      await db.collection("share_link_checkout_refs").insertOne(checkoutRefDoc);
    }

    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PRICE_PER_LINK_CENTS,
            product_data: {
              name: "Bingo Card Share Link",
              description: `Paid share link granting play access to a single bingo card from your batch.`,
            },
          },
          quantity: count,
        },
      ],
      success_url: `${appUrl}/dashboard/share-links?generated=true&count=${count}&recipientCount=${recipientEmailCount}&selfCount=${selfFallbackCount}`,
      cancel_url: `${appUrl}/dashboard/cards?shareLinks=canceled&batchId=${encodeURIComponent(batchId)}`,
      client_reference_id: session.user.id,
      metadata,
    };

    if (reusableCustomerId) {
      checkoutSessionParams.customer = reusableCustomerId;
    } else {
      checkoutSessionParams.customer_email = sessionUserEmail;
    }

    const recipientEmailsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(recipientEmails))
      .digest("hex");
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`share-links-v2:${sessionUserId}:${batchId}:${count}:${recipientEmailsHash}:${recipientEmailCount}:${selfFallbackCount}`)
      .digest("hex")
      .slice(0, 32);

    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutSessionParams,
      { idempotencyKey }
    );

    await trackActivity({
      event: "checkout_started",
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
        count,
        amountCents: totalAmountCents,
        checkoutSessionId: checkoutSession.id,
        recipientEmailCount,
        recipientPhoneCount: recipientPhones.length,
      },
    });

    notifyCheckoutStarted(
      sessionUserEmail,
      session.user.name || "",
      "one_time",
      `Share Links (${count})`,
      totalAmountCents,
      "usd",
      checkoutSession.id
    ).catch(console.error);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
      count,
      amountCents: totalAmountCents,
    });
  } catch (error: any) {
    console.error("Share link generate error:", error);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 }
    );
  }
}
