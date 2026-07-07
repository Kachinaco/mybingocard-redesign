import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { ObjectId } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claimGuestUser,
  consumeNativeOAuthHandoff,
  consumeMagicLinkToken,
  countEmailVerificationTokens,
  countRecentFailedLoginAttempts,
  createEmailVerificationToken,
  createMagicLinkToken,
  createNativeOAuthHandoff,
  deleteEmailVerificationToken,
  deleteEmailVerificationTokensByUserId,
  findActiveSignupBlock,
  findEmailVerificationToken,
  getUserByAuthAccount,
  recordLoginAttempt,
  upsertAuthAccountForUser,
} from "@/lib/db/auth-data";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { checkSignupAbuseLimit } from "@/lib/signup-abuse";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const previousBackend = process.env.MYBINGOCARD_DB_BACKEND;
  const previousPath = process.env.MYBINGOCARD_SQLITE_PATH;
  const previousShortMax = process.env.MBC_SIGNUP_RATE_SHORT_MAX;
  const previousHourlyMax = process.env.MBC_SIGNUP_RATE_HOURLY_MAX;
  const previousIpUaMax = process.env.MBC_SIGNUP_RATE_IP_UA_MAX;
  const previousUaGlobalMax = process.env.MBC_SIGNUP_RATE_UA_GLOBAL_MAX;
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-auth-data-"));
  const db = new Database(join(dir, "shadow.sqlite"));

  db.exec(`
    CREATE TABLE collections (
      name TEXT PRIMARY KEY,
      source_count INTEGER NOT NULL,
      exported_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE documents (
      collection TEXT NOT NULL,
      object_id TEXT NOT NULL,
      ejson TEXT NOT NULL,
      PRIMARY KEY (collection, object_id),
      FOREIGN KEY (collection) REFERENCES collections(name) ON DELETE CASCADE
    );

    CREATE INDEX documents_collection_idx ON documents(collection);
  `);

  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);

  cleanupCallbacks.push(() => {
    closeSqliteStoreForTests();
    if (previousBackend === undefined) delete process.env.MYBINGOCARD_DB_BACKEND;
    else process.env.MYBINGOCARD_DB_BACKEND = previousBackend;
    if (previousPath === undefined) delete process.env.MYBINGOCARD_SQLITE_PATH;
    else process.env.MYBINGOCARD_SQLITE_PATH = previousPath;
    if (previousShortMax === undefined) delete process.env.MBC_SIGNUP_RATE_SHORT_MAX;
    else process.env.MBC_SIGNUP_RATE_SHORT_MAX = previousShortMax;
    if (previousHourlyMax === undefined) delete process.env.MBC_SIGNUP_RATE_HOURLY_MAX;
    else process.env.MBC_SIGNUP_RATE_HOURLY_MAX = previousHourlyMax;
    if (previousIpUaMax === undefined) delete process.env.MBC_SIGNUP_RATE_IP_UA_MAX;
    else process.env.MBC_SIGNUP_RATE_IP_UA_MAX = previousIpUaMax;
    if (previousUaGlobalMax === undefined) delete process.env.MBC_SIGNUP_RATE_UA_GLOBAL_MAX;
    else process.env.MBC_SIGNUP_RATE_UA_GLOBAL_MAX = previousUaGlobalMax;
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store };
}

describe("SQLite auth data helpers", () => {
  test("creates and consumes native OAuth handoffs once", async () => {
    const { store } = createFixture();
    const now = new Date("2026-07-02T20:00:00.000Z");

    await createNativeOAuthHandoff({
      tokenHash: "native-hash-1",
      userId: "64f100000000000000000101",
      email: "native@example.com",
      name: "Native User",
      image: null,
      callbackUrl: "/dashboard",
      provider: "google",
      createdAt: new Date("2026-07-02T19:59:00.000Z"),
      expiresAt: new Date("2026-07-02T20:02:00.000Z"),
      consumedAt: null,
    });

    const consumed = await consumeNativeOAuthHandoff("native-hash-1", now);
    expect(consumed?.email).toBe("native@example.com");
    expect(await consumeNativeOAuthHandoff("native-hash-1", now)).toBeNull();

    const stored = store.findOne<{ consumedAt?: Date }>(
      "native_oauth_handoffs",
      { tokenHash: "native-hash-1" }
    );
    expect(stored?.consumedAt?.toISOString()).toBe(now.toISOString());
  });

  test("links auth accounts and resolves account users from SQLite", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f100000000000000000102");
    const createdAt = new Date("2026-07-02T20:00:00.000Z");
    const updatedAt = new Date("2026-07-02T20:05:00.000Z");

    store.insertOne("users", {
      _id: userId,
      email: "apple-native@example.com",
      planType: "FREE",
      createdAt,
      updatedAt: createdAt,
    });

    await upsertAuthAccountForUser({
      provider: "apple",
      providerAccountId: "apple-subject-1",
      userId,
      now: createdAt,
    });
    await upsertAuthAccountForUser({
      provider: "apple",
      providerAccountId: "apple-subject-1",
      userId,
      now: updatedAt,
    });

    const user = await getUserByAuthAccount("apple", "apple-subject-1");
    expect(user?.email).toBe("apple-native@example.com");

    const account = store.findOne<{
      userId?: ObjectId | string;
      createdAt?: Date;
      updatedAt?: Date;
    }>("accounts", { provider: "apple", providerAccountId: "apple-subject-1" });
    expect(account?.createdAt?.toISOString()).toBe(createdAt.toISOString());
    expect(account?.updatedAt?.toISOString()).toBe(updatedAt.toISOString());
    expect(account?.userId?.toString()).toBe(userId.toHexString());
  });

  test("claims guest users once and clears the guest token fields", async () => {
    const { store } = createFixture();
    const userId = new ObjectId();

    store.insertOne("users", {
      _id: userId,
      email: "guest@example.com",
      name: "Guest",
      customerType: "guest",
      guestClaimToken: "claim-token",
      guestClaimTokenExpiresAt: new Date("2026-08-01T00:00:00.000Z"),
      planType: "FREE",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const claimed = await claimGuestUser(userId.toHexString(), "claim-token");
    expect(claimed?.email).toBe("guest@example.com");
    expect(await claimGuestUser(userId.toHexString(), "claim-token")).toBeNull();

    const stored = store.findOne<Record<string, unknown>>("users", { _id: userId });
    expect(stored).not.toHaveProperty("guestClaimToken");
    expect(stored).not.toHaveProperty("guestClaimTokenExpiresAt");
  });

  test("creates and consumes magic link tokens from SQLite", async () => {
    createFixture();

    await createMagicLinkToken({
      email: "magic@example.com",
      tokenHash: "hash-1",
      callbackUrl: "/dashboard",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const consumed = await consumeMagicLinkToken("hash-1", new Date("2026-07-02T00:00:00.000Z"));
    expect(consumed?.email).toBe("magic@example.com");
    expect(await consumeMagicLinkToken("hash-1", new Date("2026-07-02T00:00:00.000Z"))).toBeNull();
  });

  test("counts and records login attempts with the same throttle query used by auth", async () => {
    createFixture();
    const since = new Date("2026-07-01T00:00:00.000Z");

    await recordLoginAttempt({
      ip: "203.0.113.1",
      email: "person@example.com",
      success: false,
      createdAt: new Date("2026-07-01T00:01:00.000Z"),
    });
    await recordLoginAttempt({
      ip: "203.0.113.2",
      email: "person@example.com",
      success: false,
      createdAt: new Date("2026-07-01T00:02:00.000Z"),
    });
    await recordLoginAttempt({
      ip: "203.0.113.1",
      email: "other@example.com",
      success: true,
      createdAt: new Date("2026-07-01T00:03:00.000Z"),
    });

    expect(await countRecentFailedLoginAttempts({
      ip: "203.0.113.1",
      email: "person@example.com",
      since,
    })).toBe(2);
  });

  test("manages email verification token lifecycle", async () => {
    createFixture();

    await createEmailVerificationToken({
      userId: "64f100000000000000000041",
      email: "verify@example.com",
      token: "verify-token-1",
      expires: new Date("2026-08-01T00:00:00.000Z"),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    await createEmailVerificationToken({
      userId: "64f100000000000000000041",
      email: "verify@example.com",
      token: "verify-token-2",
      expires: new Date("2026-08-01T00:00:00.000Z"),
      createdAt: new Date("2026-07-01T00:05:00.000Z"),
    });

    expect(await countEmailVerificationTokens({
      email: "verify@example.com",
      createdAtSince: new Date("2026-07-01T00:01:00.000Z"),
    })).toBe(1);
    expect((await findEmailVerificationToken("verify-token-1"))?.userId).toBe("64f100000000000000000041");

    await deleteEmailVerificationToken("verify-token-1");
    expect(await findEmailVerificationToken("verify-token-1")).toBeNull();

    await deleteEmailVerificationTokensByUserId("64f100000000000000000041");
    expect(await findEmailVerificationToken("verify-token-2")).toBeNull();
  });

  test("finds signup blocks and applies signup abuse limits on SQLite", async () => {
    const { store } = createFixture();
    process.env.MBC_SIGNUP_RATE_SHORT_MAX = "1";
    process.env.MBC_SIGNUP_RATE_HOURLY_MAX = "99";
    process.env.MBC_SIGNUP_RATE_IP_UA_MAX = "99";
    process.env.MBC_SIGNUP_RATE_UA_GLOBAL_MAX = "99";

    store.insertOne("signup_blocks", {
      type: "email",
      value: "blocked@example.com",
      active: true,
      reason: "manual_test",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const block = await findActiveSignupBlock([{ type: "email", value: "blocked@example.com" }]);
    expect(block?.reason).toBe("manual_test");

    const first = await checkSignupAbuseLimit({
      email: "new@example.com",
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(first.allowed).toBe(true);

    const second = await checkSignupAbuseLimit({
      email: "new@example.com",
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      now: new Date("2026-07-01T00:01:00.000Z"),
    });
    expect(second).toMatchObject({
      allowed: false,
      reason: "ip_short_window",
      count: 1,
      limit: 1,
    });
  });
});
