import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("live rooms email blast SQLite backend", () => {
  test("dry-run selects unsent subscribed users from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-live-rooms-blast-"));
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
      for (const collection of ["users", "email_preferences", "email_blasts"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      insert("users", "64f420000000000000001001", {
        _id: new ObjectId("64f420000000000000001001"),
        email: "fresh@example.com",
        name: "Fresh User",
      });
      insert("users", "64f420000000000000001002", {
        _id: new ObjectId("64f420000000000000001002"),
        email: "blocked@example.com",
        name: "Blocked User",
      });
      insert("users", "64f420000000000000001003", {
        _id: new ObjectId("64f420000000000000001003"),
        email: "already@example.com",
        name: "Already User",
      });
      insert("email_preferences", "64f420000000000000002001", {
        _id: new ObjectId("64f420000000000000002001"),
        email: "blocked@example.com",
        marketingEmails: false,
      });
      insert("email_blasts", "64f420000000000000003001", {
        _id: new ObjectId("64f420000000000000003001"),
        email: "already@example.com",
        blastId: "live_rooms_launch",
        sentAt: new Date(),
      });
      db.close();

      const result = spawnSync("node", ["scripts/live-rooms-email-blast.cjs", "--dry-run"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
          DISCORD_WEBHOOK_URL: "",
          EMAIL_SERVER_USER: "",
          EMAIL_SERVER_PASSWORD: "",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Fatal");
      expect(result.stdout).toContain("Found 3 users total");
      expect(result.stdout).toContain("[DRY RUN] Would send to: fresh@example.com (Fresh)");
      expect(result.stdout).not.toContain("blocked@example.com");
      expect(result.stdout).not.toContain("already@example.com");
      expect(result.stdout).toContain("Blast complete: 1 sent, 2 skipped");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
