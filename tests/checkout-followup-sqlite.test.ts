import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("checkout follow-up script SQLite backend", () => {
  test("selects only eligible abandoned checkout users from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-checkout-followup-"));
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
      for (const collection of ["activity_events", "subscriptions", "users", "checkout_followup_log"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const subscriberId = "64f400000000000000002002";
      const now = Date.now();
      const checkoutAt = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const latestCheckoutAt = new Date(now - 24 * 60 * 60 * 1000);

      insert("activity_events", "64f400000000000000001001", {
        _id: new ObjectId("64f400000000000000001001"),
        event: "checkout_started",
        email: "buyer@example.com",
        createdAt: checkoutAt,
      });
      insert("activity_events", "64f400000000000000001002", {
        _id: new ObjectId("64f400000000000000001002"),
        event: "checkout_started",
        email: "buyer@example.com",
        createdAt: latestCheckoutAt,
      });
      insert("activity_events", "64f400000000000000001003", {
        _id: new ObjectId("64f400000000000000001003"),
        event: "checkout_started",
        email: "subscriber@example.com",
        createdAt: checkoutAt,
      });
      insert("activity_events", "64f400000000000000001004", {
        _id: new ObjectId("64f400000000000000001004"),
        event: "checkout_started",
        email: "sent@example.com",
        createdAt: checkoutAt,
      });
      insert("activity_events", "64f400000000000000001005", {
        _id: new ObjectId("64f400000000000000001005"),
        event: "checkout_started",
        email: "rank@townranker.com",
        createdAt: checkoutAt,
      });

      insert("users", "64f400000000000000002001", {
        _id: new ObjectId("64f400000000000000002001"),
        email: "buyer@example.com",
        name: "Buyer Person",
      });
      insert("users", subscriberId, {
        _id: new ObjectId(subscriberId),
        email: "subscriber@example.com",
        name: "Subscriber Person",
      });
      insert("subscriptions", "64f400000000000000003001", {
        _id: new ObjectId("64f400000000000000003001"),
        userId: subscriberId,
        status: "active",
      });
      insert("checkout_followup_log", "64f400000000000000004001", {
        _id: new ObjectId("64f400000000000000004001"),
        email: "sent@example.com",
        sentAt: new Date(now - 60 * 60 * 1000),
      });
      db.close();

      const result = spawnSync("node", ["scripts/checkout-followup.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          DRY_RUN: "1",
          EMAIL_SERVER_USER: "",
          EMAIL_SERVER_PASSWORD: "",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Fatal error");
      expect(result.stdout).toContain("=== DRY RUN ===");
      expect(result.stdout).toContain("Found 1 eligible users");
      expect(result.stdout).toContain("buyer@example.com (Buyer,");
      expect(result.stdout).not.toContain("subscriber@example.com");
      expect(result.stdout).not.toContain("sent@example.com");
      expect(result.stdout).not.toContain("rank@townranker.com");

      const verify = new Database(dbPath, { readonly: true });
      const logRows = verify
        .query("SELECT COUNT(*) AS count FROM documents WHERE collection = 'checkout_followup_log'")
        .get() as { count: number };
      verify.close();
      expect(logRows.count).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
