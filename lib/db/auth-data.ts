import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";
import type { User } from "@/lib/db/users";

const DB_NAME = "mybingocard";

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

async function mongoDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function findActiveSignupBlock(filters: Array<Record<string, string>>): Promise<SignupBlock | null> {
  const query = {
    active: { $ne: false },
    $or: filters,
  };

  if (useSqliteDb()) {
    return getSqliteStore().findOne<SignupBlock>("signup_blocks", query);
  }

  const db = await mongoDb();
  return db.collection<SignupBlock>("signup_blocks").findOne(query);
}

export async function getConnectedAuthProviders(userId: ObjectId | string): Promise<string[]> {
  const userObjectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
  const query = {
    $or: [
      { userId: userObjectId },
      { userId: userObjectId.toHexString() },
    ],
  };

  if (useSqliteDb()) {
    return getSqliteStore()
      .findMany<{ provider?: unknown }>("accounts", query)
      .map((account) => account.provider)
      .filter((provider): provider is string => typeof provider === "string");
  }

  const db = await mongoDb();
  const accounts = await db.collection<{ provider?: unknown }>("accounts").find(query).toArray();
  return accounts
    .map((account) => account.provider)
    .filter((provider): provider is string => typeof provider === "string");
}

export async function createNativeOAuthHandoff(record: NativeOAuthHandoff): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("native_oauth_handoffs", record);
    return;
  }

  const db = await mongoDb();
  await db.collection<NativeOAuthHandoff>("native_oauth_handoffs").insertOne(record);
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

  if (useSqliteDb()) {
    return getSqliteStore().findOneAndUpdate<NativeOAuthHandoff>(
      "native_oauth_handoffs",
      query,
      update,
      { returnDocument: "before" }
    );
  }

  const db = await mongoDb();
  return db.collection<NativeOAuthHandoff>("native_oauth_handoffs").findOneAndUpdate(
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

  if (useSqliteDb()) {
    const account = getSqliteStore().findOne<AuthAccount>("accounts", query);
    if (!account?.userId) return null;
    return getSqliteStore().findOne<User>("users", { _id: normalizeObjectId(account.userId) });
  }

  const db = await mongoDb();
  const account = await db.collection<AuthAccount>("accounts").findOne(query);
  if (!account?.userId) return null;
  return db.collection<User>("users").findOne({ _id: normalizeObjectId(account.userId) });
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

  if (useSqliteDb()) {
    getSqliteStore().updateOne<AuthAccount>("accounts", query, update, { upsert: true });
    return;
  }

  const db = await mongoDb();
  await db.collection<AuthAccount>("accounts").updateOne(query, update, { upsert: true });
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

  if (useSqliteDb()) {
    return getSqliteStore().findOneAndUpdate<User>("users", query, update, { returnDocument: "before" });
  }

  const db = await mongoDb();
  return db.collection<User>("users").findOneAndUpdate(query as any, update as any, { returnDocument: "before" });
}

export async function createMagicLinkToken(record: MagicLinkToken): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("magic_link_tokens", record);
    return;
  }

  const db = await mongoDb();
  await db.collection<MagicLinkToken>("magic_link_tokens").insertOne(record);
  await db.collection("magic_link_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export async function consumeMagicLinkToken(tokenHash: string, now = new Date()): Promise<MagicLinkToken | null> {
  const query = {
    tokenHash,
    expiresAt: { $gt: now },
  };

  if (useSqliteDb()) {
    const record = getSqliteStore().findOne<MagicLinkToken>("magic_link_tokens", query);
    if (!record) return null;
    getSqliteStore().deleteOne("magic_link_tokens", { _id: (record as MagicLinkToken & { _id?: unknown })._id });
    return record;
  }

  const db = await mongoDb();
  return db.collection<MagicLinkToken>("magic_link_tokens").findOneAndDelete(query);
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

  if (useSqliteDb()) {
    return getSqliteStore().count("login_attempts", query);
  }

  const db = await mongoDb();
  return db.collection("login_attempts").countDocuments(query);
}

export async function recordLoginAttempt(record: LoginAttempt): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("login_attempts", record);
    return;
  }

  const db = await mongoDb();
  await db.collection<LoginAttempt>("login_attempts").insertOne(record);
}

export async function countEmailVerificationTokens(input: {
  email: string;
  createdAtSince: Date;
}): Promise<number> {
  const query = {
    email: input.email,
    createdAt: { $gte: input.createdAtSince },
  };

  if (useSqliteDb()) {
    return getSqliteStore().count("email_verification_tokens", query);
  }

  const db = await mongoDb();
  return db.collection("email_verification_tokens").countDocuments(query);
}

export async function createEmailVerificationToken(record: EmailVerificationToken): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("email_verification_tokens", record);
    return;
  }

  const db = await mongoDb();
  await db.collection<EmailVerificationToken>("email_verification_tokens").insertOne(record);
}

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<EmailVerificationToken>("email_verification_tokens", { token });
  }

  const db = await mongoDb();
  return db.collection<EmailVerificationToken>("email_verification_tokens").findOne({ token });
}

export async function deleteEmailVerificationToken(token: string): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().deleteOne("email_verification_tokens", { token });
    return;
  }

  const db = await mongoDb();
  await db.collection("email_verification_tokens").deleteOne({ token });
}

export async function deleteEmailVerificationTokensByUserId(userId: string): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().deleteMany("email_verification_tokens", { userId });
    return;
  }

  const db = await mongoDb();
  await db.collection("email_verification_tokens").deleteMany({ userId });
}

function normalizeObjectId(value: ObjectId | string): ObjectId {
  return value instanceof ObjectId ? value : new ObjectId(value);
}
