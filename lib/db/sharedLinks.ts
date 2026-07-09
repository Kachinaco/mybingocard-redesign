import { ObjectId } from "bson";
import crypto from "crypto";
import { getSqliteStore } from "@/lib/db/sqlite";

export type SharedLinkStatus = "pending" | "claimed" | "expired" | "refunded";

export interface SharedLink {
  _id: ObjectId;
  linkId: string;
  batchId: string;
  cardId: string;
  ownerUserId: string;
  ownerEmail: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  claimedByUserId?: string;
  claimedAt?: Date;
  status: SharedLinkStatus;
  stripeSessionId?: string;
  amountCents: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export type CreateSharedLinkInput = Omit<
  SharedLink,
  "_id" | "linkId" | "createdAt" | "updatedAt" | "status"
> & {
  status?: SharedLinkStatus;
};

export interface ShareLinkCheckoutRef {
  _id: ObjectId;
  userId: string;
  createdAt: Date;
  cardIds?: string[];
  recipientEmails?: string[];
  recipientPhones?: string[];
}

export interface ShareEmailCheckoutRef {
  _id: ObjectId;
  userId: string;
  userEmail: string;
  cardId: string;
  emails: string[];
  createdAt: Date;
}

export interface PreparedSharedLinkInsertFailure {
  index: number;
  error: string;
}

export interface PreparedSharedLinkInsertResult {
  insertedIndexes: number[];
  failed: PreparedSharedLinkInsertFailure[];
}

function toObjectIdOrNull(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Generate a URL-safe 8-char token using crypto randomness.
// Alphabet avoids visually ambiguous characters.
export function generateLinkId(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

export async function ensureShareLinkCheckoutRefsReady(): Promise<void> { return;}

export async function insertShareLinkCheckoutRef(
  doc: ShareLinkCheckoutRef
): Promise<void> {
    getSqliteStore().insertOne("share_link_checkout_refs", doc);
    return;
  }

export async function getShareLinkCheckoutRefById(
  id: string
): Promise<ShareLinkCheckoutRef | null> {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return null;
    return getSqliteStore().findOne<ShareLinkCheckoutRef>(
      "share_link_checkout_refs",
      { _id: objectId }
    );
  }

export async function deleteShareLinkCheckoutRefsByIds(
  ids: string[]
): Promise<number> {
  const objectIds = ids.flatMap((id) => {
    const objectId = toObjectIdOrNull(id);
    return objectId ? [objectId] : [];
  });

  if (objectIds.length === 0) return 0;
    return getSqliteStore().deleteMany(
      "share_link_checkout_refs",
      { _id: { $in: objectIds } }
    ).deletedCount;
  }

export function createShareEmailCheckoutRefId(): ObjectId {
  return new ObjectId();
}

export async function ensureShareEmailCheckoutRefsReady(): Promise<void> { return;}

export async function insertShareEmailCheckoutRef(
  doc: ShareEmailCheckoutRef
): Promise<void> {
    getSqliteStore().insertOne("share_email_checkout_refs", doc);
    return;
  }

export async function getShareEmailCheckoutRefForCheckout(data: {
  id: string;
  userId: string;
  cardId: string;
}): Promise<ShareEmailCheckoutRef | null> {
  const objectId = toObjectIdOrNull(data.id);
  if (!objectId) return null;

  const filter = {
    _id: objectId,
    userId: data.userId,
    cardId: data.cardId,
  };
    return getSqliteStore().findOne<ShareEmailCheckoutRef>(
      "share_email_checkout_refs",
      filter
    );
  }

export async function deleteShareEmailCheckoutRefById(
  id: string
): Promise<number> {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return 0;
    return getSqliteStore().deleteOne(
      "share_email_checkout_refs",
      { _id: objectId }
    ).deletedCount;
  }

function buildSharedLinkDoc(
  data: CreateSharedLinkInput,
  linkId: string,
  now: Date
): Omit<SharedLink, "_id"> {
  return {
    linkId,
    batchId: data.batchId,
    cardId: data.cardId,
    ownerUserId: data.ownerUserId,
    ownerEmail: data.ownerEmail,
    ...(data.recipientEmail ? { recipientEmail: data.recipientEmail } : {}),
    ...(data.recipientPhone ? { recipientPhone: data.recipientPhone } : {}),
    ...(data.recipientName ? { recipientName: data.recipientName } : {}),
    ...(data.claimedByUserId ? { claimedByUserId: data.claimedByUserId } : {}),
    ...(data.claimedAt ? { claimedAt: data.claimedAt } : {}),
    status: data.status ?? "pending",
    ...(data.stripeSessionId ? { stripeSessionId: data.stripeSessionId } : {}),
    amountCents: data.amountCents,
    createdAt: now,
    updatedAt: now,
    ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

export async function createSharedLink(
  data: CreateSharedLinkInput
): Promise<SharedLink> {
  const now = new Date();
    const store = getSqliteStore();

    for (let attempt = 0; attempt < 3; attempt++) {
      const linkId = generateLinkId();
      if (store.findOne("shared_links", { linkId })) continue;

      const doc = buildSharedLinkDoc(data, linkId, now);
      const result = store.insertOne("shared_links", doc as SharedLink);
      return {
        ...doc,
        _id: result.insertedId as ObjectId,
      } as SharedLink;
    }

    throw new Error("createSharedLink: failed to generate unique linkId after 3 attempts");
  }

export async function getSharedLinkByLinkId(
  linkId: string
): Promise<SharedLink | null> {
    return getSqliteStore().findOne<SharedLink>("shared_links", { linkId });
  }

export async function getSharedLinksByOwner(
  userId: string,
  options: { limit?: number; skip?: number } = {}
): Promise<SharedLink[]> {
    const { limit = 500, skip = 0 } = options;
    return getSqliteStore().findMany<SharedLink>(
      "shared_links",
      { ownerUserId: userId },
      { sort: { createdAt: -1 }, skip, limit }
    );
  }

export async function getSharedLinksByBatch(
  batchId: string
): Promise<SharedLink[]> {
    return getSqliteStore().findMany<SharedLink>(
      "shared_links",
      { batchId },
      { sort: { createdAt: -1 } }
    );
  }

export interface ShareGroupInviteTarget {
  seed: SharedLink;
  pending: SharedLink | null;
}

export async function getShareGroupInviteTarget(
  code: string,
  now = new Date()
): Promise<ShareGroupInviteTarget | null> {
    const store = getSqliteStore();
    const seed = store.findOne<SharedLink>("shared_links", { linkId: code });
    if (!seed || seed.status === "refunded") return null;

    const pending = store.findMany<SharedLink>(
      "shared_links",
      {
        ownerUserId: seed.ownerUserId,
        batchId: seed.batchId,
        status: "pending",
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } },
        ],
      },
      { sort: { createdAt: 1 }, limit: 1 }
    )[0] ?? null;

    return { seed, pending };
  }

export async function claimSharedLink(
  linkId: string,
  claimedByUserId: string
): Promise<SharedLink | null> {
  const now = new Date();
    return getSqliteStore().findOneAndUpdate<SharedLink>(
      "shared_links",
      {
        linkId,
        status: "pending",
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } },
        ],
      },
      {
        $set: {
          status: "claimed",
          claimedByUserId,
          claimedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );
  }

export async function revertSharedLinkClaim(
  linkId: string,
  claimedByUserId: string
): Promise<boolean> {
  const now = new Date();
  const filter = { linkId, claimedByUserId };
  const update = {
    $set: { status: "pending" as SharedLinkStatus, updatedAt: now },
    $unset: { claimedByUserId: "" as const, claimedAt: "" as const },
  };
    return getSqliteStore().updateOne<SharedLink>(
      "shared_links",
      filter,
      update
    ).matchedCount > 0;
  }

export async function expireOldLinks(): Promise<number> {
  const now = new Date();
    return getSqliteStore().updateMany<SharedLink>(
      "shared_links",
      {
        status: "pending",
        expiresAt: { $exists: true, $lt: now },
      },
      {
        $set: {
          status: "expired",
          updatedAt: now,
        },
      }
    ).modifiedCount;
  }

export async function getSharedLinkByStripeSession(
  sessionId: string
): Promise<SharedLink[]> {
    return getSqliteStore().findMany<SharedLink>("shared_links", { stripeSessionId: sessionId });
  }

export async function countSharedLinksByStripeSession(
  sessionId: string
): Promise<number> {
    return getSqliteStore().count("shared_links", { stripeSessionId: sessionId });
  }

export async function revokeSharedLinksByStripeSession(
  sessionId: string
): Promise<number> {
  const now = new Date();
    return getSqliteStore().updateMany<SharedLink>(
      "shared_links",
      { stripeSessionId: sessionId },
      { $set: { status: "refunded", updatedAt: now } }
    ).modifiedCount;
  }

export async function findExistingSharedLinkIds(
  linkIds: string[]
): Promise<string[]> {
  if (linkIds.length === 0) return [];
    return getSqliteStore()
      .findMany<Pick<SharedLink, "linkId">>(
        "shared_links",
        { linkId: { $in: linkIds } }
      )
      .map((link) => link.linkId);
  }

export async function insertPreparedSharedLinks(
  docs: Array<Omit<SharedLink, "_id">>
): Promise<PreparedSharedLinkInsertResult> {
  if (docs.length === 0) {
    return { insertedIndexes: [], failed: [] };
  }
    const store = getSqliteStore();
    const insertedIndexes: number[] = [];
    const failed: PreparedSharedLinkInsertFailure[] = [];

    for (const [index, doc] of docs.entries()) {
      try {
        if (store.findOne("shared_links", { linkId: doc.linkId })) {
          failed.push({ index, error: "duplicate linkId" });
          continue;
        }

        store.insertOne("shared_links", doc as SharedLink);
        insertedIndexes.push(index);
      } catch (error) {
        failed.push({
          index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { insertedIndexes, failed };
  }

// Bulk-create shared links using a single insertMany with unordered writes.
// Retries any documents that hit duplicate-key collisions on linkId.
export async function bulkCreateSharedLinks(
  links: CreateSharedLinkInput[]
): Promise<SharedLink[]> {
  if (links.length === 0) return [];

  const now = new Date();
    const store = getSqliteStore();
    const created: SharedLink[] = [];

    for (const input of links) {
      let inserted: SharedLink | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const linkId = generateLinkId();
        if (store.findOne("shared_links", { linkId })) continue;

        const doc = buildSharedLinkDoc(input, linkId, now);
        const result = store.insertOne("shared_links", doc as SharedLink);
        inserted = { ...doc, _id: result.insertedId as ObjectId } as SharedLink;
        break;
      }

      if (!inserted) {
        throw new Error("bulkCreateSharedLinks: failed to generate unique linkId after 3 attempts");
      }

      created.push(inserted);
    }

    return created;
  }
