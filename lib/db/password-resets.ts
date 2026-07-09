import crypto from "node:crypto";
import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

interface PasswordResetToken {
  _id: ObjectId;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
}

const COLLECTION = "passwordResetTokens";
const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const store = getSqliteStore();

  store.deleteMany(COLLECTION, {
    email,
    usedAt: { $exists: false },
  });
  store.insertOne(COLLECTION, {
    email,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  } as PasswordResetToken);

  return token;
}

export async function getEmailForValidResetToken(token: string): Promise<string | null> {
  const record = getSqliteStore().findOne<PasswordResetToken>(COLLECTION, {
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
    usedAt: { $exists: false },
  });

  return record?.email || null;
}

export async function markResetTokenUsed(token: string): Promise<void> {
  getSqliteStore().updateMany<PasswordResetToken>(
    COLLECTION,
    { tokenHash: hashToken(token), usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );
}
