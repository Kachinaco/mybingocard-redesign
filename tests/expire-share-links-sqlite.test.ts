import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("expire share links script SQLite backend", () => {
  test("expires only old pending links in the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-expire-share-links-"));
    const dbPath = join(dir, "shadow.sqlite");
    const db = new Database(dbPath);

    try {
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
      `);

      const insertCollection = db.prepare(
        "INSERT INTO collections (name, source_count, exported_count) VALUES (?, 0, 0)"
      );
      const insertDocument = db.prepare(
        "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
      );
      insertCollection.run("shared_links");

      const insertLink = (id: string, link: Record<string, unknown>) => {
        insertDocument.run("shared_links", id, EJSON.stringify(link, { relaxed: false }));
      };

      insertLink("64f000000000000000009001", {
        _id: new ObjectId("64f000000000000000009001"),
        linkId: "oldpend",
        status: "pending",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        updatedAt: new Date("2020-01-01T00:00:00.000Z"),
      });
      insertLink("64f000000000000000009002", {
        _id: new ObjectId("64f000000000000000009002"),
        linkId: "future",
        status: "pending",
        expiresAt: new Date("2999-01-01T00:00:00.000Z"),
        updatedAt: new Date("2020-01-01T00:00:00.000Z"),
      });
      insertLink("64f000000000000000009003", {
        _id: new ObjectId("64f000000000000000009003"),
        linkId: "claimed",
        status: "claimed",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        updatedAt: new Date("2020-01-01T00:00:00.000Z"),
      });
      db.close();

      const result = spawnSync("node", ["scripts/expire-share-links.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Expired 1 share links");

      const verify = new Database(dbPath, { readonly: true });
      const rows = verify
        .query("SELECT object_id, ejson FROM documents WHERE collection = 'shared_links' ORDER BY object_id ASC")
        .all() as Array<{ object_id: string; ejson: string }>;
      verify.close();

      const links = rows.map((row) => EJSON.parse(row.ejson, { relaxed: true }) as { linkId: string; status: string });
      expect(links.map((link) => [link.linkId, link.status])).toEqual([
        ["oldpend", "expired"],
        ["future", "pending"],
        ["claimed", "claimed"],
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
