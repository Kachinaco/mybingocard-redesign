import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("user journey analysis SQLite backend", () => {
  test("generates journey report artifacts from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-journeys-"));
    const dbPath = join(dir, "shadow.sqlite");
    const outDir = join(dir, "out");
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
        "activity_events",
        "cards",
        "gameHistory",
        "game_rooms",
        "subscriptions",
        "support_tickets",
        "email_preferences",
        "drip_log",
        "drip_opens",
        "checkout_reminder_log",
        "error_events",
      ]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const userId = "64f370000000000000001001";
      insert("users", userId, {
        _id: new ObjectId(userId),
        email: "journey@example.com",
        name: "Journey User",
        planType: "FREE",
        subscriptionStatus: "inactive",
        createdAt: new Date(now - 24 * 60 * 60 * 1000),
        signupMethod: "credentials",
      });
      insert("activity_events", "64f370000000000000002001", {
        _id: new ObjectId("64f370000000000000002001"),
        userId,
        email: "journey@example.com",
        event: "signup_completed",
        pathname: "/signup",
        createdAt: new Date(now - 23 * 60 * 60 * 1000),
      });
      insert("activity_events", "64f370000000000000002002", {
        _id: new ObjectId("64f370000000000000002002"),
        userId,
        email: "journey@example.com",
        event: "card_created",
        pathname: "/create",
        createdAt: new Date(now - 22 * 60 * 60 * 1000),
      });
      insert("cards", "64f370000000000000003001", {
        _id: new ObjectId("64f370000000000000003001"),
        userId,
        title: "Journey Card",
        size: 5,
        views: 2,
        isPublic: false,
        createdAt: new Date(now - 22 * 60 * 60 * 1000),
      });
      insert("support_tickets", "64f370000000000000004001", {
        _id: new ObjectId("64f370000000000000004001"),
        email: "Journey User <journey@example.com>",
        subject: "Need help",
        preview: "The card worked after refresh.",
        status: "open",
        receivedAt: new Date(now - 21 * 60 * 60 * 1000),
      });
      db.close();

      const result = spawnSync("node", ["scripts/analyze-user-journeys.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_JOURNEY_OUT_DIR: outDir,
          MYBINGOCARD_JOURNEY_RUN_DATE: "2026-07-03",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const summary = JSON.parse(result.stdout);
      expect(summary.users).toBe(1);
      expect(summary.reportable).toBe(1);
      expect(existsSync(summary.reportPath)).toBe(true);
      expect(existsSync(summary.csvPath)).toBe(true);
      expect(existsSync(summary.jsonPath)).toBe(true);
      expect(readFileSync(summary.reportPath, "utf8")).toContain("Journey User");
      expect(readFileSync(summary.csvPath, "utf8")).toContain("journey@example.com");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
