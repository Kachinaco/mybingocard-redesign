import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("suppress unengaged script SQLite backend", () => {
  test("suppresses only stale non-paying recipients without human opens", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-suppress-unengaged-"));
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
      for (const collection of ["email_preferences", "drip_log", "users", "drip_opens"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const oldCreatedAt = new Date(now - 120 * 24 * 60 * 60 * 1000);
      const recentCreatedAt = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const sentAt = new Date(now - 20 * 24 * 60 * 60 * 1000);
      const openAt = new Date(now - 2 * 24 * 60 * 60 * 1000);

      const user = (id: string, email: string, extra: Record<string, unknown> = {}) => {
        insert("users", id, {
          _id: new ObjectId(id),
          email,
          createdAt: oldCreatedAt,
          planType: "FREE",
          subscriptionStatus: "inactive",
          ...extra,
        });
      };
      user("64f410000000000000001001", "candidate@example.com");
      user("64f410000000000000001002", "engaged@example.com");
      user("64f410000000000000001003", "paid@example.com", {
        planType: "PREMIUM",
        subscriptionStatus: "active",
      });
      user("64f410000000000000001004", "new@example.com", {
        createdAt: recentCreatedAt,
      });
      user("64f410000000000000001005", "opted@example.com");

      let sendCounter = 0;
      const addSends = (email: string) => {
        for (let index = 0; index < 3; index += 1) {
          sendCounter += 1;
          const id = `64f410000000000000002${String(sendCounter).padStart(3, "0")}`;
          insert("drip_log", id, {
            _id: new ObjectId(id),
            email,
            sentAt: new Date(sentAt.getTime() + index * 60 * 1000),
            campaignId: "test-campaign",
          });
        }
      };
      for (const email of [
        "candidate@example.com",
        "engaged@example.com",
        "paid@example.com",
        "new@example.com",
        "opted@example.com",
      ]) {
        addSends(email);
      }

      insert("drip_opens", "64f410000000000000003001", {
        _id: new ObjectId("64f410000000000000003001"),
        email: "engaged@example.com",
        lastHumanOpenAt: openAt,
      });
      insert("email_preferences", "64f410000000000000004001", {
        _id: new ObjectId("64f410000000000000004001"),
        email: "opted@example.com",
        marketingEmails: false,
      });
      db.close();

      const result = spawnSync("node", ["scripts/suppress-unengaged.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          DRY_RUN: "0",
          LOOKBACK_DAYS: "180",
          MIN_SENDS: "3",
          GRACE_DAYS: "30",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Suppression sweep failed");
      expect(result.stdout).toContain("recipients with >= 3 sends in window: 5");
      expect(result.stdout).toContain("=== 1 candidate(s) for suppression ===");
      expect(result.stdout).toContain("SUPPRESSED candidate@example.com");
      expect(result.stdout).toContain("=== DONE: suppressed 1/1 ===");

      const verify = new Database(dbPath, { readonly: true });
      const rows = verify
        .query("SELECT ejson FROM documents WHERE collection = 'email_preferences'")
        .all() as { ejson: string }[];
      verify.close();

      const prefs = rows.map((row) => EJSON.parse(row.ejson, { relaxed: true })) as Array<Record<string, unknown>>;
      const candidate = prefs.find((row) => row.email === "candidate@example.com");
      const engaged = prefs.find((row) => row.email === "engaged@example.com");
      const paid = prefs.find((row) => row.email === "paid@example.com");
      const fresh = prefs.find((row) => row.email === "new@example.com");

      expect(candidate).toMatchObject({
        email: "candidate@example.com",
        marketingEmails: false,
        suppressedReason: "engagement_decay",
        suppressedSendCount: 3,
      });
      expect(engaged).toBeUndefined();
      expect(paid).toBeUndefined();
      expect(fresh).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
