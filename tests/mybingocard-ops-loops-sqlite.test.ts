import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("MyBingoCard ops loops SQLite backend", () => {
  test("runs revenue and friction read loops against the shadow document store without posting", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-ops-loops-"));
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
      for (const collection of ["activity_events", "share_link_checkout_refs", "share_email_checkout_refs", "users"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      insert("activity_events", "64f390000000000000001001", {
        _id: new ObjectId("64f390000000000000001001"),
        event: "billing_payment_failed",
        pathname: "/pricing",
        createdAt: new Date(now - 10 * 60 * 1000),
      });
      insert("activity_events", "64f390000000000000001002", {
        _id: new ObjectId("64f390000000000000001002"),
        event: "client_error_captured",
        pathname: "/create",
        createdAt: new Date(now - 9 * 60 * 1000),
      });
      insert("share_link_checkout_refs", "64f390000000000000002001", {
        _id: new ObjectId("64f390000000000000002001"),
        createdAt: new Date(now - 8 * 60 * 1000),
      });
      insert("users", "64f390000000000000003001", {
        _id: new ObjectId("64f390000000000000003001"),
        email: "pastdue@example.com",
        planType: "PREMIUM",
        subscriptionStatus: "past_due",
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      });
      db.close();

      const result = spawnSync("node", [
        "scripts/mybingocard-ops-loops.cjs",
        "--mode",
        "revenue-watchdog,product-friction",
        "--hours",
        "24",
        "--dry-run",
        "--no-post",
        "--json",
      ], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_OPS_LOOP_STATE_ROOT: join(dir, "state"),
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("[mybingocard-ops-loops]");
      expect(result.stdout).toContain('"mode": "revenue-watchdog"');
      expect(result.stdout).toContain("billing payment failure");
      expect(result.stdout).toContain('"mode": "product-friction"');
      expect(result.stdout).toContain("client_error_captured");
      expect(result.stdout).toContain("client_error_captured on /create - 1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
