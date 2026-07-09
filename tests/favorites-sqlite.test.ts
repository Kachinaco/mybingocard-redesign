import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { ObjectId } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { getUserFavorites, isFavorited, toggleFavorite } from "@/lib/favorites";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  while (cleanupCallbacks.length > 0) cleanupCallbacks.pop()?.();
});

function createFixture() {
  const previousBackend = process.env.MYBINGOCARD_DB_BACKEND;
  const previousPath = process.env.MYBINGOCARD_SQLITE_PATH;
  const previousMongoUri = process.env.MONGODB_URI;
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-favorites-"));
  const db = new Database(join(dir, "shadow.sqlite"));
  db.exec(`
    CREATE TABLE collections (name TEXT PRIMARY KEY, source_count INTEGER NOT NULL, exported_count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE documents (collection TEXT NOT NULL, object_id TEXT NOT NULL, ejson TEXT NOT NULL, PRIMARY KEY (collection, object_id));
  `);

  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);
  delete process.env.MONGODB_URI;

  cleanupCallbacks.push(() => {
    closeSqliteStoreForTests();
    if (previousBackend === undefined) delete process.env.MYBINGOCARD_DB_BACKEND;
    else process.env.MYBINGOCARD_DB_BACKEND = previousBackend;
    if (previousPath === undefined) delete process.env.MYBINGOCARD_SQLITE_PATH;
    else process.env.MYBINGOCARD_SQLITE_PATH = previousPath;
    if (previousMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousMongoUri;
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store };
}

describe("SQLite favorites helpers", () => {
  test("toggles and reads favorites without MongoDB configuration", async () => {
    const { store } = createFixture();

    expect(await isFavorited("user-1", "card-1")).toBe(false);
    expect(await toggleFavorite("user-1", "card-1")).toBe(true);
    expect(await isFavorited("user-1", "card-1")).toBe(true);
    expect(store.findOne("favorites", { userId: "user-1", cardId: "card-1" })).not.toBeNull();

    expect(await toggleFavorite("user-1", "card-1")).toBe(false);
    expect(await isFavorited("user-1", "card-1")).toBe(false);
    expect(store.count("favorites")).toBe(0);
  });

  test("lists SQLite favorites by newest first with a limit", async () => {
    const { store } = createFixture();
    store.insertOne("favorites", {
      _id: new ObjectId("64f500000000000000000001"),
      userId: "user-1",
      cardId: "older",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("favorites", {
      _id: new ObjectId("64f500000000000000000003"),
      userId: "user-1",
      cardId: "newest",
      createdAt: new Date("2026-07-04T00:00:00.000Z"),
    });

    expect((await getUserFavorites("user-1", 1)).map((favorite) => favorite.cardId)).toEqual(["newest"]);
  });
});
