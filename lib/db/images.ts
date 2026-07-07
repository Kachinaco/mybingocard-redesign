import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface StoredImage {
  _id: ObjectId;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  storagePath: string;
  thumbnailPath: string;
  isSystem: boolean;
  category?: string; // for clip-art library: "animals", "food", "holidays", etc.
  createdAt: Date;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_UPLOADS_FREE = 500;
const MAX_UPLOADS_LEGACY_FREE = 25;
const MAX_UPLOADS_PREMIUM = 500;

export function getUploadLimits(isPremium: boolean, isLegacyFree: boolean = false) {
  const maxUploads = isPremium
    ? MAX_UPLOADS_PREMIUM
    : isLegacyFree
      ? MAX_UPLOADS_LEGACY_FREE
      : MAX_UPLOADS_FREE;

  return {
    maxFileSize: MAX_FILE_SIZE,
    maxUploads,
    canUpload: maxUploads > 0,
  };
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

async function getCollection() {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<StoredImage>("images");
}

export async function createImage(
  data: Omit<StoredImage, "_id" | "createdAt">
): Promise<StoredImage> {
  const image: Partial<StoredImage> = {
    ...data,
    createdAt: new Date(),
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("images", image as StoredImage);
    return {
      ...image,
      _id: result.insertedId as ObjectId,
    } as StoredImage;
  }

  const col = await getCollection();
  const result = await col.insertOne(image as StoredImage);

  return {
    ...image,
    _id: result.insertedId,
  } as StoredImage;
}

export async function getImageById(
  imageId: string
): Promise<StoredImage | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<StoredImage>("images", { _id: new ObjectId(imageId) });
  }

  const col = await getCollection();
  return col.findOne({ _id: new ObjectId(imageId) });
}

export async function updateImagePaths(
  imageId: string,
  paths: {
    storagePath: string;
    thumbnailPath: string;
  }
): Promise<boolean> {
  const objectId = new ObjectId(imageId);

  if (useSqliteDb()) {
    const result = getSqliteStore().updateOne<StoredImage>(
      "images",
      { _id: objectId },
      { $set: paths }
    );
    return result.matchedCount > 0;
  }

  const col = await getCollection();
  const result = await col.updateOne({ _id: objectId }, { $set: paths });
  return result.matchedCount > 0;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function isImageReferencedByPublicCard(imageId: string, userId: string): Promise<boolean> {
  const imageIdPattern = new RegExp(escapeRegExp(imageId));
  let ownerObjectId: ObjectId | null = null;
  try {
    ownerObjectId = new ObjectId(userId);
  } catch {}

  if (useSqliteDb()) {
    const userIdFilter = ownerObjectId ? { $in: [userId, ownerObjectId] } : userId;
    const card = getSqliteStore().findOne(
      "cards",
      {
        isPublic: true,
        userId: userIdFilter,
        cells: { $regex: imageIdPattern },
      }
    );
    return Boolean(card);
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const card = await db.collection("cards").findOne(
    {
      isPublic: true,
      userId: ownerObjectId ? { $in: [userId, ownerObjectId] } : userId,
      cells: { $elemMatch: { $regex: imageIdPattern } },
    },
    { projection: { _id: 1 } }
  );
  return Boolean(card);
}

export async function getUserImages(userId: string): Promise<StoredImage[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<StoredImage>(
      "images",
      { userId, isSystem: false },
      { sort: { createdAt: -1 } }
    );
  }

  const col = await getCollection();
  return col
    .find({ userId, isSystem: false })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getUserImageCount(userId: string): Promise<number> {
  if (useSqliteDb()) {
    return getSqliteStore().count("images", { userId, isSystem: false });
  }

  const col = await getCollection();
  return col.countDocuments({ userId, isSystem: false });
}

export async function deleteImage(
  imageId: string,
  userId: string
): Promise<boolean> {
  if (useSqliteDb()) {
    const result = getSqliteStore().deleteOne("images", {
      _id: new ObjectId(imageId),
      userId,
      isSystem: false,
    });
    return result.deletedCount > 0;
  }

  const col = await getCollection();
  const result = await col.deleteOne({
    _id: new ObjectId(imageId),
    userId,
    isSystem: false,
  });
  return result.deletedCount > 0;
}

export async function getSystemImages(
  category?: string
): Promise<StoredImage[]> {
  if (useSqliteDb()) {
    const query: Record<string, unknown> = { isSystem: true };
    if (category) query.category = category;
    return getSqliteStore().findMany<StoredImage>("images", query, {
      sort: { category: 1, filename: 1 },
    });
  }

  const col = await getCollection();
  const query: Record<string, unknown> = { isSystem: true };
  if (category) query.category = category;
  return col.find(query).sort({ category: 1, filename: 1 }).toArray();
}

export async function getSystemImageCategories(): Promise<string[]> {
  if (useSqliteDb()) {
    const categories = getSqliteStore().distinct<string>("images", "category", { isSystem: true });
    return categories.filter((c): c is string => Boolean(c)).sort();
  }

  const col = await getCollection();
  const categories = await col.distinct("category", { isSystem: true });
  return categories.filter((c): c is string => Boolean(c)).sort();
}
