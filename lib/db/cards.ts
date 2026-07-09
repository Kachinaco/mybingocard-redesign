import { ObjectId } from "bson";
import type { BingoVariant } from "@/lib/classic-bingo";
import { getSqliteStore } from "@/lib/db/sqlite";
import type { User } from "@/lib/db/users";

export interface BingoCard {
  _id: ObjectId;
  userId: string;
  batchId?: string;
  title: string;
  description?: string;
  size: 3 | 4 | 5;
  rows?: number;
  columns?: number;
  bingoVariant?: BingoVariant;
  cells: string[];
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    theme?: string;
  };
  templateId?: ObjectId;
  isPublic: boolean;
  shareLink?: string;
  sharePassword?: string | null;
  shareExpiresAt?: Date | null;
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
  // Legacy EJSON rows can still vary by source while retaining their raw ID.
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
  const result = getSqliteStore().insertOne("cards", card as BingoCard);
  return {
    ...card,
    _id: result.insertedId as ObjectId,
  } as BingoCard;
}

export async function getUserCards(userId: string): Promise<BingoCard[]> {
  let objectId: ObjectId | null = null;
  try {
    objectId = new ObjectId(userId);
  } catch {
    // Older identifiers can be strings.
  }

  const query = objectId
    ? { $or: [{ userId }, { userId: objectId as unknown as string }] }
    : { userId };

  return getSqliteStore().findMany<BingoCard>("cards", query, { sort: { updatedAt: -1 } });
}

export async function countUserCards(userId: string): Promise<number> {
  let objectId: ObjectId | null = null;
  try {
    objectId = new ObjectId(userId);
  } catch {
    // Older identifiers can be strings.
  }

  const query = objectId
    ? { $or: [{ userId }, { userId: objectId as unknown as string }] }
    : { userId };

  return getSqliteStore().count("cards", query);
}

export async function getCardsByBatchIdForUser(
  userId: string,
  batchId: string
): Promise<BingoCard[]> {
  return getSqliteStore().findMany<BingoCard>(
    "cards",
    { ...buildUserIdFilter(userId), batchId },
    { sort: { createdAt: 1 } }
  );
}

export async function getOwnedCardIds(userId: string, cardIds: string[]): Promise<string[]> {
  const objectIds = cardIds.flatMap((id) => {
    try {
      return [new ObjectId(id)];
    } catch {
      return [];
    }
  });

  if (objectIds.length === 0) return [];

  return getSqliteStore()
    .findMany<BingoCard>("cards", {
      _id: { $in: objectIds },
      ...buildUserIdFilter(userId),
    })
    .map((card) => card._id.toString());
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

  const result: Record<string, { title?: string }> = {};
  for (const card of getSqliteStore().findMany<BingoCard>("cards", { _id: { $in: objectIds } })) {
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

  const representative = getSqliteStore().findOne<BingoCard>("cards", { _id: cardObjectId });
  if (!representative) return { status: "not_found" };

  const ownerIdStr = idToString(representative.userId);
  if (ownerIdStr !== userId) return { status: "forbidden" };

  const baseTitle = (representative.title || "").replace(/\s+#\d+\s*$/, "").trim();
  if (!baseTitle) return { status: "not_batch" };

  return {
    status: "ok",
    cards: getSqliteStore().findMany<BingoCard>(
      "cards",
      {
        ...buildUserIdFilter(userId),
        title: new RegExp(`^${escapeRegex(baseTitle)}\\s+#\\d+\\s*$`),
      },
      { sort: { createdAt: 1 } }
    ),
  };
}

export async function getCommunityTemplateCards(limit = 20): Promise<BingoCard[]> {
  return getSqliteStore().findMany<BingoCard>(
    "cards",
    { isPublic: true, views: { $gte: 3 } },
    { sort: { views: -1 }, limit: Math.max(1, Math.min(100, limit)) }
  );
}

export async function getAdminCardsPage(options: AdminCardListOptions = {}): Promise<AdminCardListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(200, options.limit || 50));
  const skip = (page - 1) * limit;
  const search = options.search?.trim() || "";
  const visibility = options.visibility || "all";
  const cardFilter: Record<string, any> = {};

  if (visibility === "public") {
    cardFilter.isPublic = true;
  } else if (visibility === "private") {
    cardFilter.isPublic = { $ne: true };
  }

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

export async function getCardById(cardId: string): Promise<BingoCard | null> {
  return getSqliteStore().findOne<BingoCard>("cards", { _id: new ObjectId(cardId) });
}

export async function getCardByShareLink(shareLink: string): Promise<BingoCard | null> {
  const store = getSqliteStore();
  const card = store.findOne<BingoCard>("cards", { shareLink });
  if (card) {
    store.updateOne<BingoCard>("cards", { _id: card._id }, { $inc: { views: 1 } });
  }
  return card;
}

export async function getSharedCardForShareLink(
  shareLink: string
): Promise<SharedCardAccessRecord | null> {
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

export async function incrementSharedCardViews(sharedCard: SharedCardAccessRecord): Promise<void> {
  getSqliteStore().updateOne(
    sharedCard.collectionName,
    { _id: sharedCard.rawId },
    { $inc: { views: 1 } }
  );
}

export async function updateCard(
  cardId: string,
  data: Partial<BingoCard>
): Promise<BingoCard | null> {
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

export async function deleteCard(cardId: string): Promise<boolean> {
  return getSqliteStore().deleteOne("cards", { _id: new ObjectId(cardId) }).deletedCount > 0;
}

export function generateShareLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function markCardAsPremium(cardId: string, userId: string): Promise<boolean> {
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
