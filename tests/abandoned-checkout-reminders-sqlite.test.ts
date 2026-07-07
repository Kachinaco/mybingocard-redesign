import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("abandoned checkout reminder script SQLite backend", () => {
  test("selects only eligible dry-run checkout reminders from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-abandoned-checkout-"));
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

      for (const collection of ["activity_events", "users", "email_preferences", "checkout_reminder_log"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = new Date("2026-07-02T23:40:00.000Z");
      const twoHourCheckout = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const twoDayCheckout = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tooFreshCheckout = new Date(now.getTime() - 30 * 60 * 1000);
      const convertedAt = new Date(twoDayCheckout.getTime() + 60 * 60 * 1000);

      const checkoutEvent = (
        id: string,
        email: string,
        createdAt: Date,
        checkoutSessionId: string,
      ) => {
        insert("activity_events", id, {
          _id: new ObjectId(id),
          event: "checkout_started",
          email,
          metadata: {
            checkoutSessionId,
            planType: "PREMIUM",
          },
          createdAt,
        });
      };

      checkoutEvent("64f200000000000000001001", "twohour@example.com", twoHourCheckout, "cs_twohour");
      checkoutEvent("64f200000000000000001002", "twoday@example.com", twoDayCheckout, "cs_twoday");
      checkoutEvent("64f200000000000000001003", "fresh@example.com", tooFreshCheckout, "cs_fresh");
      checkoutEvent("64f200000000000000001004", "blocked@example.com", twoDayCheckout, "cs_blocked");
      checkoutEvent("64f200000000000000001005", "already@example.com", twoDayCheckout, "cs_already");
      checkoutEvent("64f200000000000000001006", "converted@example.com", twoDayCheckout, "cs_converted");
      checkoutEvent("64f200000000000000001007", "paid@example.com", twoDayCheckout, "cs_paid");

      for (const [id, email, name, extra] of [
        ["64f200000000000000002001", "twohour@example.com", "Two Hour", {}],
        ["64f200000000000000002002", "twoday@example.com", "Two Day", {}],
        ["64f200000000000000002003", "blocked@example.com", "Blocked", {}],
        ["64f200000000000000002004", "already@example.com", "Already", {}],
        ["64f200000000000000002005", "converted@example.com", "Converted", {}],
        ["64f200000000000000002006", "paid@example.com", "Paid", { planType: "PREMIUM" }],
      ] as const) {
        insert("users", id, {
          _id: new ObjectId(id),
          email,
          name,
          ...extra,
        });
      }

      insert("email_preferences", "blocked@example.com", {
        _id: new ObjectId("64f200000000000000003001"),
        email: "blocked@example.com",
        marketingEmails: false,
      });
      insert("checkout_reminder_log", "64f200000000000000004001", {
        _id: new ObjectId("64f200000000000000004001"),
        email: "already@example.com",
        checkoutSessionId: "cs_already",
        reminderType: "two_days",
      });
      insert("activity_events", "64f200000000000000005001", {
        _id: new ObjectId("64f200000000000000005001"),
        event: "subscription_activated",
        email: "converted@example.com",
        createdAt: convertedAt,
      });
      db.close();

      const result = spawnSync("node", ["scripts/abandoned-checkout-reminders.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          DRY_RUN: "1",
          NOW_OVERRIDE: now.toISOString(),
          ABANDONED_CHECKOUT_MAX_AGE_DAYS: "7",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Found 7 recent checkout starts");
      expect(result.stdout).toContain("[dry-run] would send two_hours reminder to twohour@example.com for checkout cs_twohour");
      expect(result.stdout).toContain("[dry-run] would send two_days reminder to twoday@example.com for checkout cs_twoday");
      expect(result.stdout).not.toContain("fresh@example.com");
      expect(result.stdout).toContain("Skipping blocked@example.com: marketing emails disabled");
      expect(result.stdout).not.toContain("already@example.com");
      expect(result.stdout).toContain("Skipping converted@example.com: already converted or currently paid");
      expect(result.stdout).toContain("Skipping paid@example.com: already converted or currently paid");
      expect(result.stdout).toContain("Abandoned checkout reminders complete. Sent=2 Skipped=5 DryRun=true");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
