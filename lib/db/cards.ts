import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import type { BingoVariant } from "@/lib/classic-bingo";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";
import type { User } from "@/lib/db/users";

export interface BingoCard {
  _id: ObjectId;
  userId: string; // User's _id as string
  batchId?: string; // Stable batch identity for multi-card generation runs
  title: string;
  description?: string;
  size: 3 | 4 | 5; // Grid size (3x3, 4x4, 5x5)
  rows?: number; // Non-square layouts, such as 90-ball 3x9 tickets
  columns?: number;
  bingoVariant?: BingoVariant;
  cells: string[]; // Array of cell values
  freeSpace: boolean; // Whether center is a free space
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    theme?: string; // optional themed card design e.g. "hannah-montana"
  };
  templateId?: ObjectId; // If created from template
  isPublic: boolean;
  shareLink?: string; // Unique share link
  sharePassword?: string | null; // Hashed password for protected share links
  shareExpiresAt?: Date | null; // Expiration date for share links
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCardListOptions {
  page?: number;
  limit?: number;
  search?: string;
  visibility?: string;
}

export interface AdminCardListItem {
  _id: unknown;
  title: string;
  size?: number;
  cells: string[];
  isPublic: boolean;
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
  owner: {
    name: string;
    email: string;
  };
}

export interface AdminCardListResult {
  cards: AdminCardListItem[];
  totalCards: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SharedCardAccessRecord {
  card: BingoCard & Record<string, unknown>;
  collectionName: "cards" | "bingocards";
  // Keeps the Mongo and SQLite paths aligned; legacy rows may hydrate _id
  // from EJSON as ObjectId while old records can still vary by source.
  rawId: any;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildUserIdFilter(userId: string): Record<string, unknown> {
  try {
    const userObjectId = new ObjectId(userId);
    return {
      $or: [
        { userId },
        { userId: userObjectId },
      ],
    };
  } catch {
    return { userId };
  }
}

function idToString(value: unknown) {
  if (
    value
    && typeof value === "object"
    && "toHexString" in value
    && typeof (value as { toHexString?: unknown }).toHexString === "function"
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return String(value ?? "");
}

function toAdminCardListItem(
  card: Partial<BingoCard>,
  owner: { name?: string; email?: string } | undefined
): AdminCardListItem {
  return {
    _id: card._id,
    title: card.title || "Untitled",
    size: card.size,
    cells: card.cells || [],
    isPublic: card.isPublic || false,
    views: card.views || 0,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    owner: {
      name: owner?.name || "Unknown",
      email: owner?.email || "Unknown",
    },
  };
}

function normalizeLegacySharedCard(card: Record<string, unknown>, shareLink: string) {
  const numericSize = Number(card.size);
  const size = numericSize === 3 || numericSize === 4 || numericSize === 5 ? numericSize : 5;
  const cells = Array.isArray(card.cells)
    ? card.cells.map((cell) => (typeof cell === "string" ? cell : (cell as { text?: string })?.text || ""))
    : [];

  return {
    ...card,
    shareLink,
    cells,
    size,
    rows: Number(card.rows) || size,
    columns: Number(card.columns) || size,
    bingoVariant: card.bingoVariant || "custom",
    freeSpace: !!card.freeSpace,
    style: card.style || {},
    isPublic: card.isPublic !== false,
    views: Number(card.views) || 0,
  } as BingoCard & Record<string, unknown>;
}

export async function createCard(data: Omit<BingoCard, "_id" | "createdAt" | "updatedAt" | "views">): Promise<BingoCard> {
  const card: Partial<BingoCard> = {
    ...data,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("cards", card as BingoCard);
    return {
      ...card,
      _id: result.insertedId as ObjectId,
    } as BingoCard;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db.collection<BingoCard>("cards").insertOne(card as BingoCard);

  return {
    ...card,
    _id: result.insertedId,
  } as BingoCard;
}

export async function getUserCards(userId: string): Promise<BingoCard[]> {
  if (useSqliteDb()) {
    let objectId: ObjectId | null = null;
    try { objectId = new ObjectId(userId); } catch { /* invalid ObjectId, string only */ }

    const query = objectId
      ? { $or: [{ userId: userId }, { userId: objectId as unknown as string }] }
      : { userId };

    return getSqliteStore().findMany<BingoCard>("cards", query, { sort: { updatedAt: -1 } });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  // Cards may be stored with userId as string OR ObjectId — query both to handle mixed storage
  let objectId: ObjectId | null = null;
  try { objectId = new ObjectId(userId); } catch { /* invalid ObjectId, string only */ }

  const query = objectId
    ? { $or: [{ userId: userId }, { userId: objectId as unknown as string }] }
    : { userId };

  const cards = await db
    .collection<BingoCard>("cards")
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();

  return cards;
}

export async function countUserCards(userId: string): Promise<number> {
  let objectId: ObjectId | null = null;
  try { objectId = new ObjectId(userId); } catch { /* invalid ObjectId, string only */ }

  const query = objectId
    ? { $or: [{ userId }, { userId: objectId as unknown as string }] }
    : { userId };

  if (useSqliteDb()) {
    return getSqliteStore().count("cards", query);
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<BingoCard>("cards").countDocuments(query);
}

export async function getCardsByBatchIdForUser(
  userId: string,
  batchId: string
): Promise<BingoCard[]> {
  const query = {
    ...buildUserIdFilter(userId),
    batchId,
  };

  if (useSqliteDb()) {
    return getSqliteStore().findMany<BingoCard>("cards", query, {
      sort: { createdAt: 1 },
    });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db
    .collection<BingoCard>("cards")
    .find(query as any)
    .sort({ createdAt: 1 })
    .toArray();
}

export async function getOwnedCardIds(
  userId: string,
  cardIds: string[]
): Promise<string[]> {
  const objectIds = cardIds.flatMap((id) => {
    try {
      return [new ObjectId(id)];
    } catch {
      return [];
    }
  });

  if (objectIds.length === 0) return [];

  const query = {
    _id: { $in: objectIds },
    ...buildUserIdFilter(userId),
  };

  if (useSqliteDb()) {
    return getSqliteStore()
      .findMany<BingoCard>("cards", query)
      .map((card) => card._id.toString());
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const cards = await db
    .collection<BingoCard>("cards")
    .find(query as any, { projection: { _id: 1 } })
    .toArray();

  return cards.map((card) => card._id.toString());
}

export async function getCardTitlesByIds(
  cardIds: string[]
): Promise<Record<string, { title?: string }>> {
  const objectIds = cardIds.flatMap((id) => {
    try {
      return [new ObjectId(id)];
    } catch {
      return [];
    }
  });

  if (objectIds.length === 0) return {};

  const query = { _id: { $in: objectIds } };
  const result: Record<string, { title?: string }> = {};

  if (useSqliteDb()) {
    for (const card of getSqliteStore().findMany<BingoCard>("cards", query)) {
      result[card._id.toString()] = { title: card.title };
    }
    return result;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const cards = await db
    .collection<BingoCard>("cards")
    .find(query, { projection: { title: 1 } })
    .toArray();

  for (const card of cards) {
    result[card._id.toString()] = { title: card.title };
  }

  return result;
}

export type ImplicitBatchCardsResult =
  | { status: "ok"; cards: BingoCard[] }
  | { status: "invalid_batch_id" }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "not_batch" };

export async function getImplicitBatchCardsForRepresentative(
  userId: string,
  cardId: string
): Promise<ImplicitBatchCardsResult> {
  let cardObjectId: ObjectId;
  try {
    cardObjectId = new ObjectId(cardId);
  } catch {
    return { status: "invalid_batch_id" };
  }

  const representative = useSqliteDb()
    ? getSqliteStore().findOne<BingoCard>("cards", { _id: cardObjectId })
    : await (async () => {
        const client = await clientPromise;
        const db = client.db("mybingocard");
        return db.collection<BingoCard>("cards").findOne({ _id: cardObjectId });
      })();

  if (!representative) return { status: "not_found" };

  const ownerIdStr = idToString(representative.userId);
  if (ownerIdStr !== userId) return { status: "forbidden" };

  const baseTitle = (representative.title || "").replace(/\s+#\d+\s*$/, "").trim();
  if (!baseTitle) return { status: "not_batch" };

  const query = {
    ...buildUserIdFilter(userId),
    title: new RegExp(`^${escapeRegex(baseTitle)}\\s+#\\d+\\s*$`),
  };

  if (useSqliteDb()) {
    return {
      status: "ok",
      cards: getSqliteStore().findMany<BingoCard>("cards", query, {
        sort: { createdAt: 1 },
      }),
    };
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return {
    status: "ok",
    cards: await db
      .collection<BingoCard>("cards")
      .find(query as any)
      .sort({ createdAt: 1 })
      .toArray(),
  };
}

export async function getCommunityTemplateCards(limit = 20): Promise<BingoCard[]> {
  const query = {
    isPublic: true,
    views: { $gte: 3 },
  };
  const boundedLimit = Math.max(1, Math.min(100, limit));

  if (useSqliteDb()) {
    return getSqliteStore().findMany<BingoCard>("cards", query, {
      sort: { views: -1 },
      limit: boundedLimit,
    });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<BingoCard>("cards")
    .find(query, { projection: { userId: 0, sharePassword: 0 } })
    .sort({ views: -1 })
    .limit(boundedLimit)
    .toArray();
}

export async function getAdminCardsPage(options: AdminCardListOptions = {}): Promise<AdminCardListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(200, options.limit || 50));
  const skip = (page - 1) * limit;
  const search = options.search?.trim() || "";
  const visibility = options.visibility || "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardFilter: Record<string, any> = {};

  if (visibility === "public") {
    cardFilter.isPublic = true;
  } else if (visibility === "private") {
    cardFilter.isPublic = { $ne: true };
  }

  if (useSqliteDb()) {
    const store = getSqliteStore();

    if (search) {
      const escapedSearch = escapeRegex(search);
      const matchingUsers = store.findMany<User>(
        "users",
        { email: { $regex: escapedSearch, $options: "i" } }
      );
      const userIdFilter = matchingUsers.map((user) => idToString(user._id));
      const titleCondition = { title: { $regex: escapedSearch, $options: "i" } };

      if (userIdFilter.length > 0) {
        cardFilter.$or = [
          titleCondition,
          { userId: { $in: userIdFilter } },
        ];
      } else {
        Object.assign(cardFilter, titleCondition);
      }
    }

    const cards = store.findMany<BingoCard>("cards", cardFilter, {
      sort: { createdAt: -1 },
      skip,
      limit,
    });
    const totalCards = store.count("cards", cardFilter);
    const userIds = [...new Set(cards.map((card) => idToString(card.userId)).filter(Boolean))];
    const ownerIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const users = ownerIds.length > 0
      ? store.findMany<User>("users", { _id: { $in: ownerIds } })
      : [];
    const userMap = new Map(
      users.map((user) => [idToString(user._id), { name: user.name, email: user.email }])
    );

    return {
      cards: cards.map((card) => toAdminCardListItem(card, userMap.get(idToString(card.userId)))),
      totalCards,
      page,
      limit,
      totalPages: Math.ceil(totalCards / limit),
    };
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  if (search) {
    const escapedSearch = escapeRegex(search);
    const emailRegex = new RegExp(escapedSearch, "i");
    const matchingUsers = await db
      .collection("users")
      .find({ email: emailRegex }, { projection: { _id: 1 } })
      .toArray();
    const userIdFilter = matchingUsers.map((user) => user._id.toString());
    const titleCondition = { title: { $regex: escapedSearch, $options: "i" } };

    if (userIdFilter.length > 0) {
      cardFilter.$or = [
        titleCondition,
        { userId: { $in: userIdFilter } },
      ];
    } else {
      Object.assign(cardFilter, titleCondition);
    }
  }

  const [cards, totalCards] = await Promise.all([
    db
      .collection("cards")
      .find(cardFilter, {
        projection: {
          title: 1,
          userId: 1,
          size: 1,
          cells: 1,
          isPublic: 1,
          views: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("cards").countDocuments(cardFilter),
  ]);

  const userIds = [...new Set(cards.map((card) => card.userId))];
  const users = await db
    .collection("users")
    .find(
      {
        _id: {
          $in: userIds
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id)),
        },
      },
      { projection: { name: 1, email: 1 } }
    )
    .toArray();
  const userMap = new Map(
    users.map((user) => [user._id.toString(), { name: user.name, email: user.email }])
  );

  return {
    cards: cards.map((card) => toAdminCardListItem(card, userMap.get(idToString(card.userId)))),
    totalCards,
    page,
    limit,
    totalPages: Math.ceil(totalCards / limit),
  };
}

export async function getCardById(cardId: string): Promise<BingoCard | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<BingoCard>("cards", { _id: new ObjectId(cardId) });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card = await db.collection<BingoCard>("cards").findOne({
    _id: new ObjectId(cardId),
  });

  return card;
}

export async function getCardByShareLink(shareLink: string): Promise<BingoCard | null> {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const card = store.findOne<BingoCard>("cards", { shareLink });

    if (card) {
      store.updateOne<BingoCard>("cards", { _id: card._id }, { $inc: { views: 1 } });
    }

    return card;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card = await db.collection<BingoCard>("cards").findOne({ shareLink });

  if (card) {
    // Increment view count
    await db.collection<BingoCard>("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );
  }

  return card;
}

export async function getSharedCardForShareLink(
  shareLink: string
): Promise<SharedCardAccessRecord | null> {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const card = store.findOne<BingoCard & Record<string, unknown>>("cards", { shareLink });
    if (card) {
      return { card, collectionName: "cards", rawId: card._id };
    }

    const legacyCard = store.findOne<Record<string, unknown>>("bingocards", { shareId: shareLink });
    if (!legacyCard) return null;

    return {
      card: normalizeLegacySharedCard(legacyCard, shareLink),
      collectionName: "bingocards",
      rawId: legacyCard._id,
    };
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card = await db.collection<BingoCard & Record<string, unknown>>("cards").findOne({ shareLink });
  if (card) {
    return { card, collectionName: "cards", rawId: card._id };
  }

  const legacyCard = await db.collection<Record<string, unknown>>("bingocards").findOne({ shareId: shareLink });
  if (!legacyCard) return null;

  return {
    card: normalizeLegacySharedCard(legacyCard, shareLink),
    collectionName: "bingocards",
    rawId: legacyCard._id,
  };
}

export async function incrementSharedCardViews(
  sharedCard: SharedCardAccessRecord
): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().updateOne(
      sharedCard.collectionName,
      { _id: sharedCard.rawId },
      { $inc: { views: 1 } }
    );
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection(sharedCard.collectionName).updateOne(
    { _id: sharedCard.rawId },
    { $inc: { views: 1 } }
  );
}

export async function updateCard(
  cardId: string,
  data: Partial<BingoCard>
): Promise<BingoCard | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOneAndUpdate<BingoCard>(
      "cards",
      { _id: new ObjectId(cardId) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<BingoCard>("cards").findOneAndUpdate(
    { _id: new ObjectId(cardId) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteCard(cardId: string): Promise<boolean> {
  if (useSqliteDb()) {
    return getSqliteStore().deleteOne("cards", { _id: new ObjectId(cardId) }).deletedCount > 0;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<BingoCard>("cards").deleteOne({
    _id: new ObjectId(cardId),
  });

  return result.deletedCount > 0;
}

// Generate a unique share link
export function generateShareLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function markCardAsPremium(cardId: string, userId: string): Promise<boolean> {
  if (useSqliteDb()) {
    const result = getSqliteStore().updateOne(
      "cards",
      { _id: new ObjectId(cardId), userId },
      {
        $set: {
          isPremium: true,
          premiumPurchasedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.matchedCount > 0;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection("cards").updateOne(
    { _id: new ObjectId(cardId), userId },
    {
      $set: {
        isPremium: true,
        premiumPurchasedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}
