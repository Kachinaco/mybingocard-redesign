import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";
import type { User } from "@/lib/db/users";

type SignupBlock = {
  type?: string;
  reason?: string;
  active?: boolean;
  [key: string]: unknown;
};

type MagicLinkToken = {
  email: string;
  tokenHash: string;
  callbackUrl?: string;
  expiresAt: Date;
  createdAt: Date;
};

type LoginAttempt = {
  ip: string;
  email: string;
  success: boolean;
  blocked?: boolean;
  reason?: string;
  createdAt: Date;
};

export type NativeOAuthHandoff = {
  tokenHash: string;
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  callbackUrl: string;
  provider: "google" | "apple";
  appleUserId?: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
};

type AuthAccount = {
  _id?: unknown;
  userId?: ObjectId | string;
  type?: string;
  provider: string;
  providerAccountId: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type EmailVerificationToken = {
  userId: string;
  email: string;
  token: string;
  expires: Date;
  createdAt: Date;
};

export async function findActiveSignupBlock(filters: Array<Record<string, string>>): Promise<SignupBlock | null> {
  const query = {
    active: { $ne: false },
    $or: filters,
  };
    return getSqliteStore().findOne<SignupBlock>("signup_blocks", query);
  }

export async function getConnectedAuthProviders(userId: ObjectId | string): Promise<string[]> {
  const userObjectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
  const query = {
    $or: [
      { userId: userObjectId },
      { userId: userObjectId.toHexString() },
    ],
  };
    return getSqliteStore()
      .findMany<{ provider?: unknown }>("accounts", query)
      .map((account) => account.provider)
      .filter((provider): provider is string => typeof provider === "string");
  }

export async function createNativeOAuthHandoff(record: NativeOAuthHandoff): Promise<void> {
    getSqliteStore().insertOne("native_oauth_handoffs", record);
    return;
  }

export async function consumeNativeOAuthHandoff(
  tokenHash: string,
  now = new Date()
): Promise<NativeOAuthHandoff | null> {
  const query = {
    tokenHash,
    consumedAt: null,
    expiresAt: { $gt: now },
  };
  const update = { $set: { consumedAt: now } };
    return getSqliteStore().findOneAndUpdate<NativeOAuthHandoff>(
      "native_oauth_handoffs",
      query,
      update,
      { returnDocument: "before" }
    );
  }

export async function getUserByAuthAccount(
  provider: string,
  providerAccountId: string
): Promise<User | null> {
  const query = { provider, providerAccountId };
    const account = getSqliteStore().findOne<AuthAccount>("accounts", query);
    if (!account?.userId) return null;
    return getSqliteStore().findOne<User>("users", { _id: normalizeObjectId(account.userId) });
  }

export async function upsertAuthAccountForUser(input: {
  provider: string;
  providerAccountId: string;
  userId: ObjectId | string;
  now?: Date;
}): Promise<void> {
  const now = input.now || new Date();
  const query = {
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  };
  const update = {
    $setOnInsert: {
      userId: normalizeObjectId(input.userId),
      type: "oauth",
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: now,
    },
    $set: {
      updatedAt: now,
    },
  };
    getSqliteStore().updateOne<AuthAccount>("accounts", query, update, { upsert: true });
    return;
  }

export async function claimGuestUser(userId: string, guestToken: string): Promise<User | null> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(userId);
  } catch {
    return null;
  }

  const query = {
    _id: objectId,
    customerType: "guest",
    guestClaimToken: guestToken,
    guestClaimTokenExpiresAt: { $gt: new Date() },
  };
  const update = { $unset: { guestClaimToken: "", guestClaimTokenExpiresAt: "" } };
    return getSqliteStore().findOneAndUpdate<User>("users", query, update, { returnDocument: "before" });
  }

export async function createMagicLinkToken(record: MagicLinkToken): Promise<void> {
    getSqliteStore().insertOne("magic_link_tokens", record);
    return;
  }

export async function consumeMagicLinkToken(tokenHash: string, now = new Date()): Promise<MagicLinkToken | null> {
  const query = {
    tokenHash,
    expiresAt: { $gt: now },
  };
    const record = getSqliteStore().findOne<MagicLinkToken>("magic_link_tokens", query);
    if (!record) return null;
    getSqliteStore().deleteOne("magic_link_tokens", { _id: (record as MagicLinkToken & { _id?: unknown })._id });
    return record;
  }

export async function countRecentFailedLoginAttempts(input: {
  ip: string;
  email: string;
  since: Date;
}): Promise<number> {
  const query = {
    success: false,
    createdAt: { $gte: input.since },
    $or: [{ ip: input.ip }, { email: input.email }],
  };
    return getSqliteStore().count("login_attempts", query);
  }

export async function recordLoginAttempt(record: LoginAttempt): Promise<void> {
    getSqliteStore().insertOne("login_attempts", record);
    return;
  }

export async function countEmailVerificationTokens(input: {
  email: string;
  createdAtSince: Date;
}): Promise<number> {
  const query = {
    email: input.email,
    createdAt: { $gte: input.createdAtSince },
  };
    return getSqliteStore().count("email_verification_tokens", query);
  }

export async function createEmailVerificationToken(record: EmailVerificationToken): Promise<void> {
    getSqliteStore().insertOne("email_verification_tokens", record);
    return;
  }

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
    return getSqliteStore().findOne<EmailVerificationToken>("email_verification_tokens", { token });
  }

export async function deleteEmailVerificationToken(token: string): Promise<void> {
    getSqliteStore().deleteOne("email_verification_tokens", { token });
    return;
  }

export async function deleteEmailVerificationTokensByUserId(userId: string): Promise<void> {
    getSqliteStore().deleteMany("email_verification_tokens", { userId });
    return;
  }

function normalizeObjectId(value: ObjectId | string): ObjectId {
  return value instanceof ObjectId ? value : new ObjectId(value);
}
