import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

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

const MAX_FILE_SIZE_FREE = 2 * 1024 * 1024; // 2MB
const MAX_FILE_SIZE_PREMIUM = 5 * 1024 * 1024; // 5MB
const MAX_UPLOADS_FREE = 0; // Free users can't upload (clip-art only)
const MAX_UPLOADS_PREMIUM = 500;

export function getUploadLimits(isPremium: boolean) {
  return {
    maxFileSize: isPremium ? MAX_FILE_SIZE_PREMIUM : MAX_FILE_SIZE_FREE,
    maxUploads: isPremium ? MAX_UPLOADS_PREMIUM : MAX_UPLOADS_FREE,
    canUpload: isPremium,
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
  const col = await getCollection();

  const image: Partial<StoredImage> = {
    ...data,
    createdAt: new Date(),
  };

  const result = await col.insertOne(image as StoredImage);

  return {
    ...image,
    _id: result.insertedId,
  } as StoredImage;
}

export async function getImageById(
  imageId: string
): Promise<StoredImage | null> {
  const col = await getCollection();
  return col.findOne({ _id: new ObjectId(imageId) });
}

export async function getUserImages(userId: string): Promise<StoredImage[]> {
  const col = await getCollection();
  return col
    .find({ userId, isSystem: false })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getUserImageCount(userId: string): Promise<number> {
  const col = await getCollection();
  return col.countDocuments({ userId, isSystem: false });
}

export async function deleteImage(
  imageId: string,
  userId: string
): Promise<boolean> {
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
  const col = await getCollection();
  const query: Record<string, unknown> = { isSystem: true };
  if (category) query.category = category;
  return col.find(query).sort({ category: 1, filename: 1 }).toArray();
}

export async function getSystemImageCategories(): Promise<string[]> {
  const col = await getCollection();
  const categories = await col.distinct("category", { isSystem: true });
  return categories.filter((c): c is string => Boolean(c)).sort();
}
