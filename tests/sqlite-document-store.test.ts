import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDocumentStore, type SqliteDocument } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-store-"));
  const dbPath = join(dir, "shadow.sqlite");
  const db = new Database(dbPath);

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

  const insertCollection = db.prepare(
    "INSERT INTO collections (name, source_count, exported_count) VALUES (?, 0, 0) ON CONFLICT(name) DO NOTHING"
  );
  const insertDocument = db.prepare(
    "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
  );
  const updateCollectionCount = db.prepare(
    `UPDATE collections
     SET exported_count = (SELECT COUNT(*) FROM documents WHERE collection = ?)
     WHERE name = ?`
  );

  const insertShadowDocument = (collection: string, document: SqliteDocument) => {
    insertCollection.run(collection);
    insertDocument.run(collection, String(document._id), EJSON.stringify(document, { relaxed: false }));
    updateCollectionCount.run(collection, collection);
  };

  const store = new SqliteDocumentStore(db);
  cleanupCallbacks.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { db, store, insertShadowDocument };
}

describe("SqliteDocumentStore", () => {
  test("hydrates canonical EJSON and matches ObjectId fields by string", () => {
    const { store, insertShadowDocument } = createFixture();
    const cardId = new ObjectId("64f000000000000000000001");
    const userId = new ObjectId("64f000000000000000000002");
    const createdAt = new Date("2026-01-02T03:04:05.000Z");

    insertShadowDocument("cards", {
      _id: cardId,
      userId,
      title: "Migration proof",
      views: 0,
      createdAt,
      updatedAt: createdAt,
    });

    const byId = store.findOne("cards", { _id: cardId.toHexString() });
    const byUser = store.findMany("cards", { userId: userId.toHexString() });

    expect(byId?._id).toBeInstanceOf(ObjectId);
    expect((byId?._id as ObjectId).toHexString()).toBe(cardId.toHexString());
    expect(byId?.createdAt).toBeInstanceOf(Date);
    expect((byId?.createdAt as Date).toISOString()).toBe(createdAt.toISOString());
    expect(byUser).toHaveLength(1);
    expect(byUser[0]?.title).toBe("Migration proof");
  });

  test("supports document filters, regexes, counts, and sorted windows", () => {
    const { store, insertShadowDocument } = createFixture();

    insertShadowDocument("cards", {
      _id: new ObjectId("64f000000000000000000011"),
      userId: "user-a",
      title: "Kitchen plan",
      status: "draft",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      score: 1,
    });
    insertShadowDocument("cards", {
      _id: new ObjectId("64f000000000000000000012"),
      userId: "user-b",
      title: "Public launch board",
      status: "public",
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      score: 3,
    });
    insertShadowDocument("cards", {
      _id: new ObjectId("64f000000000000000000013"),
      userId: "user-a",
      title: "Sales plan",
      status: "public",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      score: 2,
    });

    const rows = store.findMany(
      "cards",
      {
        $or: [{ userId: "user-a" }, { status: "public" }],
        updatedAt: { $gte: new Date("2026-01-02T00:00:00.000Z") },
      },
      { sort: { updatedAt: -1 }, limit: 2 }
    );

    expect(rows.map((row) => row.title)).toEqual(["Public launch board", "Sales plan"]);
    expect(store.count("cards", { score: { $in: [1, 3] } })).toBe(2);
    expect(store.findMany("cards", { title: { $regex: "plan", $options: "i" } })).toHaveLength(2);
    expect(store.findMany("cards", { missingField: { $exists: false } })).toHaveLength(3);
  });

  test("updates documents with set, inc, min, unset, and canonical EJSON persistence", () => {
    const { db, store, insertShadowDocument } = createFixture();
    const cardId = new ObjectId("64f000000000000000000021");
    const updatedAt = new Date("2026-02-03T04:05:06.000Z");
    const firstSeenAt = new Date("2026-01-15T00:00:00.000Z");

    insertShadowDocument("cards", {
      _id: cardId,
      title: "Editable card",
      views: 4,
      stale: true,
      style: { theme: "plain" },
      firstSeenAt,
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const result = store.updateOne(
      "cards",
      { _id: cardId },
      {
        $set: { "style.theme": "premium", updatedAt },
        $inc: { views: 2 },
        $min: {
          firstSeenAt: new Date("2026-01-20T00:00:00.000Z"),
          firstOpenedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
        $unset: { stale: "" },
      }
    );

    const saved = store.findOne("cards", { _id: cardId.toHexString() });
    const raw = db
      .prepare("SELECT ejson FROM documents WHERE collection = ? AND object_id = ?")
      .get("cards", cardId.toHexString()) as { ejson: string };
    const parsedRaw = EJSON.parse(raw.ejson, { relaxed: false });

    expect(result).toEqual({ matchedCount: 1, modifiedCount: 1 });
    expect(saved?.views).toBe(6);
    expect((saved?.style as { theme?: string }).theme).toBe("premium");
    expect((saved?.firstSeenAt as Date).toISOString()).toBe(firstSeenAt.toISOString());
    expect((saved?.firstOpenedAt as Date).toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect("stale" in (saved ?? {})).toBe(false);
    expect(parsedRaw.updatedAt).toBeInstanceOf(Date);
    expect(parsedRaw.updatedAt.toISOString()).toBe(updatedAt.toISOString());
  });

  test("upserts and applies setOnInsert, addToSet, push, and pull", () => {
    const { store } = createFixture();
    const createdAt = new Date("2026-03-01T00:00:00.000Z");

    const inserted = store.findOneAndUpdate<SqliteDocument>(
      "email_preferences",
      { email: "test@example.com" },
      {
        $setOnInsert: { createdAt, sources: ["signup"] },
        $set: { unsubscribed: false },
        $addToSet: { sources: { $each: ["signup", "import"] } },
        $push: { events: { type: "created", at: createdAt } },
      },
      { upsert: true, returnDocument: "after" }
    );

    const updated = store.findOneAndUpdate<SqliteDocument>(
      "email_preferences",
      { email: "test@example.com" },
      {
        $set: { unsubscribed: true },
        $pull: { sources: "signup" },
        $push: { events: { type: "updated", at: new Date("2026-03-02T00:00:00.000Z") } },
      },
      { returnDocument: "after" }
    );

    expect(inserted?._id).toBeInstanceOf(ObjectId);
    expect(inserted?.createdAt).toBeInstanceOf(Date);
    expect(store.count("email_preferences")).toBe(1);
    expect(updated?.unsubscribed).toBe(true);
    expect(updated?.sources).toEqual(["import"]);
    expect(updated?.events).toHaveLength(2);
  });

  test("flattens array fields for distinct and keeps collection counts after deletes", () => {
    const { db, store, insertShadowDocument } = createFixture();

    insertShadowDocument("images", {
      _id: new ObjectId("64f000000000000000000031"),
      category: "clipart",
      tags: ["door", "trim"],
    });
    insertShadowDocument("images", {
      _id: new ObjectId("64f000000000000000000032"),
      category: "clipart",
      tags: ["trim", "window"],
    });

    expect(store.distinct("images", "tags")).toEqual(["door", "trim", "window"]);

    const deleted = store.deleteMany("images", { tags: "window" });
    const collectionRow = db
      .prepare("SELECT exported_count FROM collections WHERE name = ?")
      .get("images") as { exported_count: number };

    expect(deleted.deletedCount).toBe(1);
    expect(collectionRow.exported_count).toBe(1);
    expect(store.findMany("images")).toHaveLength(1);
  });
});
