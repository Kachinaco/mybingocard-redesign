import clientPromise from "../mongodb";
import { ObjectId, type Collection } from "mongodb";
import crypto from "crypto";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

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

let indexesEnsured = false;
let checkoutRefsIndexEnsured = false;
let emailCheckoutRefsIndexEnsured = false;
async function ensureIndexes(collection: Collection<SharedLink>) {
  if (indexesEnsured) return;
  try {
    await Promise.all([
      collection.createIndex({ linkId: 1 }, { unique: true }),
      collection.createIndex({ ownerUserId: 1 }),
      collection.createIndex({ batchId: 1 }),
      collection.createIndex({ stripeSessionId: 1 }, { sparse: true }),
      collection.createIndex({ status: 1, expiresAt: 1 }),
    ]);
    indexesEnsured = true;
  } catch (err) {
    console.error("shared_links index creation failed:", err);
  }
}

async function getShareLinkCheckoutRefsCollection() {
  const client = await clientPromise;
  const collection = client
    .db("mybingocard")
    .collection<ShareLinkCheckoutRef>("share_link_checkout_refs");

  if (!checkoutRefsIndexEnsured) {
    try {
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 24 * 60 * 60, name: "share_link_checkout_refs_ttl" }
      );
    } catch (error) {
      console.error("share_link_checkout_refs index setup failed:", error);
    }
    checkoutRefsIndexEnsured = true;
  }

  return collection;
}

async function getShareEmailCheckoutRefsCollection() {
  const client = await clientPromise;
  const collection = client
    .db("mybingocard")
    .collection<ShareEmailCheckoutRef>("share_email_checkout_refs");

  if (!emailCheckoutRefsIndexEnsured) {
    try {
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 24 * 60 * 60, name: "share_email_checkout_refs_ttl" }
      );
    } catch (error) {
      console.error("share_email_checkout_refs index setup failed:", error);
    }
    emailCheckoutRefsIndexEnsured = true;
  }

  return collection;
}

async function getSharedLinksCollection() {
  const client = await clientPromise;
  const collection = client
    .db("mybingocard")
    .collection<SharedLink>("shared_links");

  await ensureIndexes(collection);

  return collection;
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

export async function ensureShareLinkCheckoutRefsReady(): Promise<void> {
  if (useSqliteDb()) return;
  await getShareLinkCheckoutRefsCollection();
}

export async function insertShareLinkCheckoutRef(
  doc: ShareLinkCheckoutRef
): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("share_link_checkout_refs", doc);
    return;
  }

  const collection = await getShareLinkCheckoutRefsCollection();
  await collection.insertOne(doc);
}

export async function getShareLinkCheckoutRefById(
  id: string
): Promise<ShareLinkCheckoutRef | null> {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return null;

  if (useSqliteDb()) {
    return getSqliteStore().findOne<ShareLinkCheckoutRef>(
      "share_link_checkout_refs",
      { _id: objectId }
    );
  }

  const collection = await getShareLinkCheckoutRefsCollection();
  return collection.findOne({ _id: objectId });
}

export async function deleteShareLinkCheckoutRefsByIds(
  ids: string[]
): Promise<number> {
  const objectIds = ids.flatMap((id) => {
    const objectId = toObjectIdOrNull(id);
    return objectId ? [objectId] : [];
  });

  if (objectIds.length === 0) return 0;

  if (useSqliteDb()) {
    return getSqliteStore().deleteMany(
      "share_link_checkout_refs",
      { _id: { $in: objectIds } }
    ).deletedCount;
  }

  const collection = await getShareLinkCheckoutRefsCollection();
  const result = await collection.deleteMany({ _id: { $in: objectIds } });
  return result.deletedCount || 0;
}

export function createShareEmailCheckoutRefId(): ObjectId {
  return new ObjectId();
}

export async function ensureShareEmailCheckoutRefsReady(): Promise<void> {
  if (useSqliteDb()) return;
  await getShareEmailCheckoutRefsCollection();
}

export async function insertShareEmailCheckoutRef(
  doc: ShareEmailCheckoutRef
): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("share_email_checkout_refs", doc);
    return;
  }

  const collection = await getShareEmailCheckoutRefsCollection();
  await collection.insertOne(doc);
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

  if (useSqliteDb()) {
    return getSqliteStore().findOne<ShareEmailCheckoutRef>(
      "share_email_checkout_refs",
      filter
    );
  }

  const collection = await getShareEmailCheckoutRefsCollection();
  return collection.findOne(filter);
}

export async function deleteShareEmailCheckoutRefById(
  id: string
): Promise<number> {
  const objectId = toObjectIdOrNull(id);
  if (!objectId) return 0;

  if (useSqliteDb()) {
    return getSqliteStore().deleteOne(
      "share_email_checkout_refs",
      { _id: objectId }
    ).deletedCount;
  }

  const collection = await getShareEmailCheckoutRefsCollection();
  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount || 0;
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

  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const linkId = generateLinkId();
    const doc = buildSharedLinkDoc(data, linkId, now);

    try {
      const result = await collection.insertOne(doc as SharedLink);
      return {
        ...doc,
        _id: result.insertedId,
      } as SharedLink;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `createSharedLink: failed to generate unique linkId after 3 attempts: ${String(lastError)}`
  );
}

export async function getSharedLinkByLinkId(
  linkId: string
): Promise<SharedLink | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<SharedLink>("shared_links", { linkId });
  }

  const collection = await getSharedLinksCollection();
  return collection.findOne({ linkId });
}

export async function getSharedLinksByOwner(
  userId: string,
  options: { limit?: number; skip?: number } = {}
): Promise<SharedLink[]> {
  if (useSqliteDb()) {
    const { limit = 500, skip = 0 } = options;
    return getSqliteStore().findMany<SharedLink>(
      "shared_links",
      { ownerUserId: userId },
      { sort: { createdAt: -1 }, skip, limit }
    );
  }

  const collection = await getSharedLinksCollection();
  const { limit = 500, skip = 0 } = options;
  return collection
    .find({ ownerUserId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getSharedLinksByBatch(
  batchId: string
): Promise<SharedLink[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<SharedLink>(
      "shared_links",
      { batchId },
      { sort: { createdAt: -1 } }
    );
  }

  const collection = await getSharedLinksCollection();
  return collection
    .find({ batchId })
    .sort({ createdAt: -1 })
    .toArray();
}

export interface ShareGroupInviteTarget {
  seed: SharedLink;
  pending: SharedLink | null;
}

export async function getShareGroupInviteTarget(
  code: string,
  now = new Date()
): Promise<ShareGroupInviteTarget | null> {
  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();
  const seed = await collection.findOne({ linkId: code });
  if (!seed || seed.status === "refunded") return null;

  const pending = await collection
    .find({
      ownerUserId: seed.ownerUserId,
      batchId: seed.batchId,
      status: "pending",
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } },
      ],
    })
    .sort({ createdAt: 1 })
    .limit(1)
    .next();

  return { seed, pending };
}

export async function claimSharedLink(
  linkId: string,
  claimedByUserId: string
): Promise<SharedLink | null> {
  const now = new Date();

  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();
  const result = await collection.findOneAndUpdate(
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

  return result;
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

  if (useSqliteDb()) {
    return getSqliteStore().updateOne<SharedLink>(
      "shared_links",
      filter,
      update
    ).matchedCount > 0;
  }

  const collection = await getSharedLinksCollection();
  const result = await collection.updateOne(filter, update);
  return result.matchedCount > 0;
}

export async function expireOldLinks(): Promise<number> {
  const now = new Date();

  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();
  const result = await collection.updateMany(
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
  );

  return result.modifiedCount;
}

export async function getSharedLinkByStripeSession(
  sessionId: string
): Promise<SharedLink[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<SharedLink>("shared_links", { stripeSessionId: sessionId });
  }

  const collection = await getSharedLinksCollection();
  return collection.find({ stripeSessionId: sessionId }).toArray();
}

export async function countSharedLinksByStripeSession(
  sessionId: string
): Promise<number> {
  if (useSqliteDb()) {
    return getSqliteStore().count("shared_links", { stripeSessionId: sessionId });
  }

  const collection = await getSharedLinksCollection();
  return collection.countDocuments({ stripeSessionId: sessionId });
}

export async function revokeSharedLinksByStripeSession(
  sessionId: string
): Promise<number> {
  const now = new Date();
  if (useSqliteDb()) {
    return getSqliteStore().updateMany<SharedLink>(
      "shared_links",
      { stripeSessionId: sessionId },
      { $set: { status: "refunded", updatedAt: now } }
    ).modifiedCount;
  }

  const collection = await getSharedLinksCollection();
  const result = await collection.updateMany(
    { stripeSessionId: sessionId },
    { $set: { status: "refunded", updatedAt: now } }
  );
  return result.modifiedCount;
}

export async function findExistingSharedLinkIds(
  linkIds: string[]
): Promise<string[]> {
  if (linkIds.length === 0) return [];

  if (useSqliteDb()) {
    return getSqliteStore()
      .findMany<Pick<SharedLink, "linkId">>(
        "shared_links",
        { linkId: { $in: linkIds } }
      )
      .map((link) => link.linkId);
  }

  const collection = await getSharedLinksCollection();
  const docs = await collection
    .find({ linkId: { $in: linkIds } }, { projection: { linkId: 1 } })
    .toArray();
  return docs.map((doc) => doc.linkId);
}

export async function insertPreparedSharedLinks(
  docs: Array<Omit<SharedLink, "_id">>
): Promise<PreparedSharedLinkInsertResult> {
  if (docs.length === 0) {
    return { insertedIndexes: [], failed: [] };
  }

  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();

  try {
    const result = await collection.insertMany(docs as SharedLink[], {
      ordered: false,
    });
    return {
      insertedIndexes: Object.keys(result.insertedIds || {})
        .map((index) => Number(index))
        .filter((index) => Number.isInteger(index))
        .sort((left, right) => left - right),
      failed: [],
    };
  } catch (error: any) {
    const writeErrors: any[] =
      error?.writeErrors || error?.result?.writeErrors || [];

    if (writeErrors.length === 0) {
      const message = error?.errmsg || error?.message || String(error);
      return {
        insertedIndexes: [],
        failed: docs.map((_, index) => ({ index, error: message })),
      };
    }

    const failedIndexes = new Set<number>(
      writeErrors
        .map((writeError: any) => writeError.index)
        .filter((index: unknown): index is number => typeof index === "number")
    );

    return {
      insertedIndexes: docs
        .map((_, index) => index)
        .filter((index) => !failedIndexes.has(index)),
      failed: writeErrors.map((writeError: any) => ({
        index: typeof writeError.index === "number" ? writeError.index : -1,
        error:
          writeError.errmsg ||
          writeError.message ||
          "insertMany error",
      })),
    };
  }
}

// Bulk-create shared links using a single insertMany with unordered writes.
// Retries any documents that hit duplicate-key collisions on linkId.
export async function bulkCreateSharedLinks(
  links: CreateSharedLinkInput[]
): Promise<SharedLink[]> {
  if (links.length === 0) return [];

  const now = new Date();

  if (useSqliteDb()) {
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

  const collection = await getSharedLinksCollection();

  const buildDocs = (inputs: CreateSharedLinkInput[]) => {
    const seen = new Set<string>();
    return inputs.map((input) => {
      let linkId = generateLinkId();
      while (seen.has(linkId)) {
        linkId = generateLinkId();
      }
      seen.add(linkId);
      return buildSharedLinkDoc(input, linkId, now);
    });
  };

  const created: SharedLink[] = [];
  let pending = links;

  for (let attempt = 0; attempt < 3 && pending.length > 0; attempt++) {
    const docs = buildDocs(pending);

    try {
      const result = await collection.insertMany(docs as SharedLink[], {
        ordered: false,
      });
      docs.forEach((doc, idx) => {
        const insertedId = result.insertedIds[idx];
        if (insertedId) {
          created.push({ ...doc, _id: insertedId } as SharedLink);
        }
      });
      pending = [];
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;

      const bulkErr = err as {
        result?: { insertedIds?: Array<{ index: number; _id: ObjectId }> };
        writeErrors?: Array<{ index: number }>;
      };

      const insertedIdxs = new Set<number>();
      for (const entry of bulkErr.result?.insertedIds ?? []) {
        insertedIdxs.add(entry.index);
      }
      const failedIdxs = new Set<number>(
        (bulkErr.writeErrors ?? []).map((e) => e.index)
      );

      docs.forEach((doc, idx) => {
        if (insertedIdxs.has(idx) && !failedIdxs.has(idx)) {
          created.push(doc as SharedLink);
        }
      });

      pending = pending.filter((_, idx) => failedIdxs.has(idx));
    }
  }

  if (pending.length > 0) {
    throw new Error(
      `bulkCreateSharedLinks: failed to insert ${pending.length} link(s) after 3 attempts due to linkId collisions`
    );
  }

  return created;
}
