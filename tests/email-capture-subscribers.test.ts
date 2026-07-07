import { afterEach, describe, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureEmailSubscriber, upsertEmailSubscriber } from "@/lib/email-capture/subscribers";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  closeSqliteStoreForTests();
  delete process.env.MYBINGOCARD_DB_BACKEND;
  delete process.env.MYBINGOCARD_SQLITE_PATH;

  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-email-capture-subscribers-"));
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
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store };
}

describe("upsertEmailSubscriber", () => {
  test("creates a normalized Mongo subscriber record for a new capture", async () => {
    const now = new Date("2026-04-23T20:30:00.000Z");
    const updateOne = mock(async () => ({ matchedCount: 0, upsertedCount: 1 }));

    const result = await upsertEmailSubscriber(
      { updateOne },
      " TestUser@Example.com ",
      "popup",
      now
    );

    expect(updateOne).toHaveBeenCalledWith(
      { email: "testuser@example.com" },
      {
        $setOnInsert: {
          email: "testuser@example.com",
          source: "popup",
          subscribedAt: now,
          unsubscribedAt: null,
        },
        $set: {
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    expect(result).toEqual({
      email: "testuser@example.com",
      duplicate: false,
    });
  });

  test("treats an existing Mongo subscriber as a duplicate capture", async () => {
    const updateOne = mock(async () => ({ matchedCount: 1, upsertedCount: 0 }));

    const result = await upsertEmailSubscriber(
      { updateOne },
      "repeat@example.com",
      undefined,
      new Date("2026-04-23T20:35:00.000Z")
    );

    expect(result).toEqual({
      email: "repeat@example.com",
      duplicate: true,
    });
  });

  test("captures SQLite subscribers and reports duplicate captures", async () => {
    const { store } = createFixture();
    const now = new Date("2026-04-23T20:40:00.000Z");

    const first = await captureEmailSubscriber(" TestUser@Example.com ", " inline ", now);
    const second = await captureEmailSubscriber("testuser@example.com", undefined, new Date("2026-04-23T20:41:00.000Z"));
    const stored = store.findOne<Record<string, unknown>>("email_subscribers", { email: "testuser@example.com" });

    expect(first).toEqual({ email: "testuser@example.com", duplicate: false });
    expect(second).toEqual({ email: "testuser@example.com", duplicate: true });
    expect(stored).toMatchObject({
      email: "testuser@example.com",
      source: "inline",
      unsubscribedAt: null,
    });
    expect((stored?.subscribedAt as Date).toISOString()).toBe(now.toISOString());
    expect((stored?.updatedAt as Date).toISOString()).toBe("2026-04-23T20:41:00.000Z");
  });
});
