import clientPromise from "../mongodb";
import type { Collection, ObjectId } from "mongodb";
import crypto from "crypto";

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

let indexesEnsured = false;
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

async function getSharedLinksCollection() {
  const client = await clientPromise;
  const collection = client
    .db("mybingocard")
    .collection<SharedLink>("shared_links");

  await ensureIndexes(collection);

  return collection;
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
  const collection = await getSharedLinksCollection();
  const now = new Date();

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
  const collection = await getSharedLinksCollection();
  return collection.findOne({ linkId });
}

export async function getSharedLinksByOwner(
  userId: string,
  options: { limit?: number; skip?: number } = {}
): Promise<SharedLink[]> {
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
  const collection = await getSharedLinksCollection();
  return collection
    .find({ batchId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function claimSharedLink(
  linkId: string,
  claimedByUserId: string
): Promise<SharedLink | null> {
  const collection = await getSharedLinksCollection();
  const now = new Date();

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

export async function expireOldLinks(): Promise<number> {
  const collection = await getSharedLinksCollection();
  const now = new Date();

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
  const collection = await getSharedLinksCollection();
  return collection.find({ stripeSessionId: sessionId }).toArray();
}

export async function revokeSharedLinksByStripeSession(
  sessionId: string
): Promise<number> {
  const collection = await getSharedLinksCollection();
  const now = new Date();
  const result = await collection.updateMany(
    { stripeSessionId: sessionId },
    { $set: { status: "refunded", updatedAt: now } }
  );
  return result.modifiedCount;
}

// Bulk-create shared links using a single insertMany with unordered writes.
// Retries any documents that hit duplicate-key collisions on linkId.
export async function bulkCreateSharedLinks(
  links: CreateSharedLinkInput[]
): Promise<SharedLink[]> {
  if (links.length === 0) return [];

  const collection = await getSharedLinksCollection();
  const now = new Date();

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
