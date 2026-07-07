import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("drip campaigns script SQLite backend", () => {
  test("runs against the shadow document store without sending when users are skipped", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-drip-campaigns-"));
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
        "email_preferences",
        "cards",
        "drip_log",
        "drip_progression",
        "email_messages",
        "email_verification_tokens",
      ]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const unsubscribedUserId = "64f320000000000000001001";
      const guestUserId = "64f320000000000000001002";

      insert("users", unsubscribedUserId, {
        _id: new ObjectId(unsubscribedUserId),
        email: "unsubscribed@example.com",
        name: "Unsubscribed User",
        planType: "FREE",
        subscriptionStatus: "inactive",
        emailVerified: new Date(now - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      });
      insert("users", guestUserId, {
        _id: new ObjectId(guestUserId),
        email: "guest-123@guest.mybingocard.local",
        name: "Guest User",
        customerType: "guest",
        planType: "FREE",
        subscriptionStatus: "inactive",
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      });
      insert("email_preferences", "64f320000000000000002001", {
        _id: new ObjectId("64f320000000000000002001"),
        email: "unsubscribed@example.com",
        marketingEmails: false,
      });
      db.close();

      const result = spawnSync("node", ["scripts/drip-campaigns.cjs"], {
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
      expect(result.stderr).not.toContain("Drip campaign error");
      expect(result.stdout).toContain("Drip campaign run complete: 0 sent, 2 skipped");

      const verify = new Database(dbPath, { readonly: true });
      const sentRows = verify
        .query("SELECT COUNT(*) AS count FROM documents WHERE collection IN ('drip_log', 'email_messages', 'email_verification_tokens')")
        .get() as { count: number };
      verify.close();

      expect(sentRows.count).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
