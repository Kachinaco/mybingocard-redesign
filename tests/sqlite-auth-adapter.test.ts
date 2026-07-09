import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSqliteAuthAdapter } from "@/lib/db/auth-adapter";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-auth-adapter-"));
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
  const adapter = createSqliteAuthAdapter(store);

  cleanupCallbacks.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { adapter, store };
}

describe("SQLite Auth.js adapter", () => {
  test("stores users and linked OAuth accounts with ObjectId shape", async () => {
    const { adapter, store } = createFixture();

    const createdUser = await adapter.createUser!({
      id: "64f100000000000000000001",
      email: "oauth@example.com",
      emailVerified: null,
      name: "OAuth User",
      image: null,
    });

    expect(createdUser.id).toBe("64f100000000000000000001");
    expect((await adapter.getUser!(createdUser.id))?.email).toBe("oauth@example.com");
    expect((await adapter.getUserByEmail!("oauth@example.com"))?.id).toBe(createdUser.id);

    await adapter.linkAccount!({
      userId: createdUser.id,
      provider: "google",
      providerAccountId: "google-123",
      type: "oauth",
    });

    const storedAccount = store.findOne<Record<string, unknown>>("accounts", {
      provider: "google",
      providerAccountId: "google-123",
    });
    expect(storedAccount?.userId).toHaveProperty("toHexString");
    expect((storedAccount?.userId as { toHexString: () => string }).toHexString()).toBe(createdUser.id);

    expect((await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: "google-123",
    }))?.email).toBe("oauth@example.com");
    expect((await adapter.getAccount!("google-123", "google"))?.userId).toBe(createdUser.id);

    const updated = await adapter.updateUser!({
      id: createdUser.id,
      name: "Updated OAuth User",
    });
    expect(updated.name).toBe("Updated OAuth User");
    expect((await adapter.getUser!(createdUser.id))?.name).toBe("Updated OAuth User");
  });

  test("creates, updates, reads, and deletes sessions with user joins", async () => {
    const { adapter } = createFixture();

    const user = await adapter.createUser!({
      id: "64f100000000000000000011",
      email: "session@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      name: "Session User",
      image: null,
    });

    const session = await adapter.createSession!({
      sessionToken: "session-token",
      userId: user.id,
      expires: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(session.userId).toBe(user.id);

    const joined = await adapter.getSessionAndUser!("session-token");
    expect(joined?.user.email).toBe("session@example.com");
    expect(joined?.session.expires.toISOString()).toBe("2026-02-01T00:00:00.000Z");

    const updated = await adapter.updateSession!({
      sessionToken: "session-token",
      expires: new Date("2026-03-01T00:00:00.000Z"),
    });
    expect(updated?.expires.toISOString()).toBe("2026-03-01T00:00:00.000Z");

    const deleted = await adapter.deleteSession!("session-token");
    expect(deleted?.sessionToken).toBe("session-token");
    expect(await adapter.getSessionAndUser!("session-token")).toBeNull();
  });

  test("uses verification tokens only once", async () => {
    const { adapter, store } = createFixture();

    const token = {
      identifier: "verify@example.com",
      token: "hashed-token",
      expires: new Date("2026-04-01T00:00:00.000Z"),
    };

    await adapter.createVerificationToken!(token);
    expect(store.count("verification_tokens")).toBe(1);

    const used = await adapter.useVerificationToken!({
      identifier: token.identifier,
      token: token.token,
    });
    expect(used).toEqual(token);
    expect(await adapter.useVerificationToken!({
      identifier: token.identifier,
      token: token.token,
    })).toBeNull();
    expect(store.count("verification_tokens")).toBe(0);
  });

  test("deletes a user with linked accounts and sessions", async () => {
    const { adapter, store } = createFixture();

    const user = await adapter.createUser!({
      id: "64f100000000000000000021",
      email: "delete@example.com",
      emailVerified: null,
      name: "Delete User",
      image: null,
    });

    await adapter.linkAccount!({
      userId: user.id,
      provider: "google",
      providerAccountId: "delete-google",
      type: "oauth",
    });
    await adapter.createSession!({
      sessionToken: "delete-session",
      userId: user.id,
      expires: new Date("2026-05-01T00:00:00.000Z"),
    });

    const deleted = await adapter.deleteUser!(user.id);
    expect(deleted?.email).toBe("delete@example.com");
    expect(store.count("users")).toBe(0);
    expect(store.count("accounts")).toBe(0);
    expect(store.count("sessions")).toBe(0);
  });

  test("stores canonical EJSON values compatible with the shadow export format", async () => {
    const { adapter, store } = createFixture();

    const user = await adapter.createUser!({
      id: "64f100000000000000000031",
      email: "ejson@example.com",
      emailVerified: new Date("2026-06-01T00:00:00.000Z"),
      name: "EJSON User",
      image: null,
    });

    const stored = store.findOne<Record<string, unknown>>("users", { _id: user.id });
    const encoded = EJSON.stringify(stored, { relaxed: false });
    expect(encoded).toContain("$oid");
    expect(encoded).toContain("$date");
  });
});
