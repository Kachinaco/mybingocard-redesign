import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("card comeback reminder script SQLite backend", () => {
  test("shadow store insertOne creates missing collections and generated ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-shadow-insert-"));
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
      db.close();

      const result = spawnSync(
        "node",
        [
          "-e",
          `
            const { openSqliteShadowStore } = require("./scripts/sqlite-shadow-store.cjs");
            const store = openSqliteShadowStore(process.argv[1]);
            const result = store.insertOne("drip_log", {
              email: "sent@example.com",
              campaignId: "card_comeback_24h",
            });
            store.close();
            process.stdout.write(result.insertedId.toHexString());
          `,
          dbPath,
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        }
      );

      expect(result.status).toBe(0);
      const insertedId = result.stdout.trim();
      expect(ObjectId.isValid(insertedId)).toBe(true);

      const verify = new Database(dbPath, { readonly: true });
      const collection = verify.query("SELECT name FROM collections WHERE name = 'drip_log'").get();
      const row = verify.query("SELECT object_id, ejson FROM documents WHERE collection = 'drip_log'").get() as {
        object_id: string;
        ejson: string;
      };
      verify.close();

      expect(collection).toEqual({ name: "drip_log" });
      expect(row.object_id).toBe(insertedId);
      expect(EJSON.parse(row.ejson, { relaxed: true })).toMatchObject({
        email: "sent@example.com",
        campaignId: "card_comeback_24h",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("selects only eligible dry-run recipients from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-card-comeback-"));
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

      for (const collection of ["users", "cards", "email_preferences", "drip_log", "activity_events"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const recentCardDate = new Date(now - 48 * 60 * 60 * 1000);
      const playedDate = new Date(now - 24 * 60 * 60 * 1000);
      const readyUserId = "64f100000000000000001001";
      const playedUserId = "64f100000000000000001002";
      const alreadyUserId = "64f100000000000000001003";
      const blockedUserId = "64f100000000000000001004";

      for (const [id, email, name] of [
        [readyUserId, "ready@example.com", "Ready User"],
        [playedUserId, "played@example.com", "Played User"],
        [alreadyUserId, "already@example.com", "Already User"],
        [blockedUserId, "blocked@example.com", "Blocked User"],
      ] as const) {
        insert("users", id, {
          _id: new ObjectId(id),
          email,
          name,
          lastCardCreatedAt: recentCardDate,
          customerType: "free",
        });
        insert("cards", id.replace("1001", "2001"), {
          _id: new ObjectId(id.replace("1001", "2001")),
          userId: id,
          title: `${name} Card`,
          createdAt: recentCardDate,
        });
      }

      insert("email_preferences", "blocked@example.com", {
        _id: new ObjectId("64f100000000000000003004"),
        email: "blocked@example.com",
        marketingEmails: false,
      });
      insert("drip_log", "64f100000000000000004003", {
        _id: new ObjectId("64f100000000000000004003"),
        email: "already@example.com",
        campaignId: "card_comeback_24h",
        cardId: alreadyUserId.replace("1001", "2001"),
        sentAt: playedDate,
      });
      insert("activity_events", "64f100000000000000005002", {
        _id: new ObjectId("64f100000000000000005002"),
        userId: playedUserId,
        email: "played@example.com",
        event: "play_started",
        createdAt: playedDate,
      });
      db.close();

      const result = spawnSync("node", ["scripts/card-comeback-reminders.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          SEND_EMAILS: "0",
          CARD_COMEBACK_MIN_AGE_HOURS: "1",
          CARD_COMEBACK_MAX_AGE_DAYS: "3650",
          CARD_COMEBACK_LIMIT: "10",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('DRY_RUN ready@example.com card="Ready User Card"');
      expect(result.stdout).not.toContain("played@example.com");
      expect(result.stdout).not.toContain("already@example.com");
      expect(result.stdout).not.toContain("blocked@example.com");
      expect(result.stdout).toContain("Done. considered=3 skipped=2 sent=0 dryRun=true");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
