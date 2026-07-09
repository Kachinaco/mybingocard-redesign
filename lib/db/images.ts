import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

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
  category?: string;
  createdAt: Date;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

export async function createImage(
  data: Omit<StoredImage, "_id" | "createdAt">
): Promise<StoredImage> {
  const image: Partial<StoredImage> = {
    ...data,
    createdAt: new Date(),
  };
  const result = getSqliteStore().insertOne("images", image as StoredImage);

  return {
    ...image,
    _id: result.insertedId as ObjectId,
  } as StoredImage;
}

export async function getImageById(imageId: string): Promise<StoredImage | null> {
  return getSqliteStore().findOne<StoredImage>("images", { _id: new ObjectId(imageId) });
}

export async function updateImagePaths(
  imageId: string,
  paths: {
    storagePath: string;
    thumbnailPath: string;
  }
): Promise<boolean> {
  const result = getSqliteStore().updateOne<StoredImage>(
    "images",
    { _id: new ObjectId(imageId) },
    { $set: paths }
  );
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
  } catch {
    // IDs from older records can remain non-ObjectId strings.
  }

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

export async function getUserImages(userId: string): Promise<StoredImage[]> {
  return getSqliteStore().findMany<StoredImage>(
    "images",
    { userId, isSystem: false },
    { sort: { createdAt: -1 } }
  );
}

export async function getUserImageCount(userId: string): Promise<number> {
  return getSqliteStore().count("images", { userId, isSystem: false });
}

export async function deleteImage(imageId: string, userId: string): Promise<boolean> {
  const result = getSqliteStore().deleteOne("images", {
    _id: new ObjectId(imageId),
    userId,
    isSystem: false,
  });
  return result.deletedCount > 0;
}

export async function getSystemImages(category?: string): Promise<StoredImage[]> {
  const query: Record<string, unknown> = { isSystem: true };
  if (category) query.category = category;
  return getSqliteStore().findMany<StoredImage>("images", query, {
    sort: { category: 1, filename: 1 },
  });
}

export async function getSystemImageCategories(): Promise<string[]> {
  const categories = getSqliteStore().distinct<string>("images", "category", { isSystem: true });
  return categories.filter((category): category is string => Boolean(category)).sort();
}
