import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("expire trials script SQLite backend", () => {
  test("expires already-notified trials and logs churn-risk trials in the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-expire-trials-"));
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

      for (const collection of ["users", "drip_log", "cards", "activity_events"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const expiredUserId = "64f300000000000000001001";
      const churnUserId = "64f300000000000000001002";
      const oldActivityAt = new Date(now - 4 * 24 * 60 * 60 * 1000);

      insert("users", expiredUserId, {
        _id: new ObjectId(expiredUserId),
        email: "expired@example.com",
        name: "Expired User",
        planType: "PREMIUM",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(now - 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
      });
      insert("users", churnUserId, {
        _id: new ObjectId(churnUserId),
        email: "churn@example.com",
        name: "Churn User",
        planType: "PREMIUM",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      });
      insert("drip_log", "64f300000000000000002001", {
        _id: new ObjectId("64f300000000000000002001"),
        userId: expiredUserId,
        email: "expired@example.com",
        campaignId: "trial_expired",
        sentAt: new Date(now - 12 * 60 * 60 * 1000),
      });
      insert("cards", "64f300000000000000003001", {
        _id: new ObjectId("64f300000000000000003001"),
        userId: churnUserId,
        title: "Churn User Card",
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      });
      insert("activity_events", "64f300000000000000004001", {
        _id: new ObjectId("64f300000000000000004001"),
        userId: churnUserId,
        email: "churn@example.com",
        event: "card_created",
        createdAt: oldActivityAt,
      });
      db.close();

      const result = spawnSync("node", ["scripts/expire-trials.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
          DISCORD_WEBHOOK_URL: "",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Churn risk flagged: churn@example.com");
      expect(result.stdout).toContain("Trial check complete: 1 expired, 0 day emails sent, 1 churn risks flagged");

      const verify = new Database(dbPath, { readonly: true });
      const users = verify
        .query("SELECT object_id, ejson FROM documents WHERE collection = 'users' ORDER BY object_id")
        .all() as Array<{ object_id: string; ejson: string }>;
      const activityRows = verify
        .query("SELECT ejson FROM documents WHERE collection = 'activity_events'")
        .all() as Array<{ ejson: string }>;
      const dripRows = verify
        .query("SELECT ejson FROM documents WHERE collection = 'drip_log'")
        .all() as Array<{ ejson: string }>;
      verify.close();

      const expired = EJSON.parse(users.find((row) => row.object_id === expiredUserId)!.ejson, { relaxed: true }) as {
        planType: string;
        subscriptionStatus: string;
      };
      expect(expired.planType).toBe("FREE");
      expect(expired.subscriptionStatus).toBe("inactive");

      const events = activityRows.map((row) => EJSON.parse(row.ejson, { relaxed: true }) as {
        event: string;
        email?: string;
        metadata?: { cardsCreated?: number };
      });
      expect(events.some((event) => (
        event.event === "trial_churn_risk_detected"
        && event.email === "churn@example.com"
        && event.metadata?.cardsCreated === 1
      ))).toBe(true);

      const logs = dripRows.map((row) => EJSON.parse(row.ejson, { relaxed: true }) as {
        campaignId: string;
        email?: string;
      });
      expect(logs.some((log) => (
        log.campaignId === "trial_churn_risk_detected"
        && log.email === "churn@example.com"
      ))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
