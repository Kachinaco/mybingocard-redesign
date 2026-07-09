import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("daily summary script SQLite backend", () => {
  test("builds the morning brief metrics from the shadow document store without posting", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-daily-summary-"));
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

      for (const collection of [
        "users",
        "cards",
        "templates",
        "gameHistory",
        "drip_log",
        "drip_opens",
        "email_preferences",
        "activity_events",
        "support_tickets",
      ]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const recentUserId = "64f310000000000000001001";
      const paidUserId = "64f310000000000000001002";
      const pastDueUserId = "64f310000000000000001003";

      insert("users", recentUserId, {
        _id: new ObjectId(recentUserId),
        email: "new@example.com",
        name: "New User",
        planType: "FREE",
        subscriptionStatus: "inactive",
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
        utm_source: "google",
      });
      insert("users", paidUserId, {
        _id: new ObjectId(paidUserId),
        email: "paid@example.com",
        name: "Paid User",
        planType: "PREMIUM",
        subscriptionStatus: "active",
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(now - 12 * 60 * 60 * 1000),
      });
      insert("users", pastDueUserId, {
        _id: new ObjectId(pastDueUserId),
        email: "pastdue@example.com",
        name: "Past Due",
        planType: "PREMIUM",
        subscriptionStatus: "past_due",
        billingPastDueSince: new Date(now - 16 * 24 * 60 * 60 * 1000),
        billingFailedAttemptCount: 2,
        createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      });

      insert("cards", "64f310000000000000002001", {
        _id: new ObjectId("64f310000000000000002001"),
        userId: recentUserId,
        title: "Recent Card",
        views: 7,
        isPublic: true,
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      });
      insert("cards", "64f310000000000000002002", {
        _id: new ObjectId("64f310000000000000002002"),
        userId: paidUserId,
        title: "Popular Card",
        views: 20,
        isPublic: false,
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      });
      insert("templates", "64f310000000000000003001", {
        _id: new ObjectId("64f310000000000000003001"),
        title: "Template",
      });
      insert("gameHistory", "64f310000000000000004001", {
        _id: new ObjectId("64f310000000000000004001"),
        userId: paidUserId,
        completedAt: new Date(now - 90 * 60 * 1000),
        result: "won",
      });
      insert("drip_log", "64f310000000000000005001", {
        _id: new ObjectId("64f310000000000000005001"),
        userId: paidUserId,
        email: "paid@example.com",
        campaignId: "create_first_card",
        sentAt: new Date(now - 2 * 60 * 60 * 1000),
      });
      insert("drip_opens", "64f310000000000000006001", {
        _id: new ObjectId("64f310000000000000006001"),
        userId: paidUserId,
        email: "paid@example.com",
        campaignId: "create_first_card",
        firstOpenedAt: new Date(now - 60 * 60 * 1000),
      });
      insert("email_preferences", "64f310000000000000007001", {
        _id: new ObjectId("64f310000000000000007001"),
        email: "unsub@example.com",
        marketingEmails: false,
      });

      const events = [
        ["page_view", { anonymousId: "anon-1", pathname: "/", metadata: { userAgent: "Mozilla/5.0 (Macintosh)" } }],
        ["signup_completed", { anonymousId: "anon-1", email: "new@example.com" }],
        ["login_succeeded", { userId: paidUserId, email: "paid@example.com" }],
        ["card_created", { userId: recentUserId, email: "new@example.com" }],
        ["checkout_started", { anonymousId: "anon-1" }],
        ["shared_card_viewed", { anonymousId: "anon-2", pathname: "/share/abc" }],
        ["page_view", { anonymousId: "anon-3", pathname: "/?ref=chatgpt" }],
      ] as const;

      events.forEach(([event, extra], index) => {
        const id = `64f31000000000000000800${index}`;
        insert("activity_events", id, {
          _id: new ObjectId(id),
          event,
          createdAt: new Date(now - (index + 1) * 10 * 60 * 1000),
          ...extra,
        });
      });

      insert("support_tickets", "64f310000000000000009001", {
        _id: new ObjectId("64f310000000000000009001"),
        subject: "Undelivered Mail Returned to Sender",
        receivedAt: new Date(now - 30 * 60 * 1000),
      });
      db.close();

      const result = spawnSync("node", ["scripts/daily-summary.cjs"], {
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
      expect(result.stderr).not.toContain("Daily summary error");
      expect(result.stdout).toContain("Discord webhook not configured; skipping daily-summary post");
      expect(result.stdout).toContain("Morning brief sent to Discord at");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
