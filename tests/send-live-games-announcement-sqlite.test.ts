import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("send live games announcement SQLite backend", () => {
  test("dry-run lists only unsent subscribed users from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-live-games-announcement-"));
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
      for (const collection of ["users", "email_preferences", "drip_log"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      insert("users", "64f430000000000000001001", {
        _id: new ObjectId("64f430000000000000001001"),
        email: "ready@example.com",
        name: "Ready User",
        createdAt: new Date(),
      });
      insert("users", "64f430000000000000001002", {
        _id: new ObjectId("64f430000000000000001002"),
        email: "unsubscribed@example.com",
        name: "Unsubscribed User",
        createdAt: new Date(),
      });
      insert("users", "64f430000000000000001003", {
        _id: new ObjectId("64f430000000000000001003"),
        email: "already@example.com",
        name: "Already User",
        createdAt: new Date(),
      });
      insert("email_preferences", "64f430000000000000002001", {
        _id: new ObjectId("64f430000000000000002001"),
        email: "unsubscribed@example.com",
        unsubscribed: true,
      });
      insert("drip_log", "64f430000000000000003001", {
        _id: new ObjectId("64f430000000000000003001"),
        email: "already@example.com",
        campaignId: "live_games_announcement_2026_03_13",
      });
      db.close();

      const result = spawnSync("node", ["scripts/send-live-games-announcement.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          EMAIL_SERVER_USER: "",
          EMAIL_SERVER_PASSWORD: "",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Error");
      expect(result.stdout).toContain("Total users: 2 | Already sent: 1 | To send: 1");
      expect(result.stdout).toContain("ready@example.com (Ready User)");
      expect(result.stdout).not.toContain("unsubscribed@example.com");
      expect(result.stdout).not.toContain("already@example.com");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
