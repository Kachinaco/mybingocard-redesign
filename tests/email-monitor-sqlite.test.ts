import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("email monitor SQLite backend", () => {
  test("records bounces and support tickets in the shadow document store without IMAP", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-email-monitor-"));
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

      for (const collection of ["email_bounces", "email_messages", "support_tickets"]) {
        insertCollection.run(collection);
      }

      const emailMessageId = "64f330000000000000001001";
      const emailId = "11111111-1111-1111-1111-111111111111";
      insertDocument.run(
        "email_messages",
        emailMessageId,
        EJSON.stringify({
          _id: new ObjectId(emailMessageId),
          emailId,
          email: "bounced@example.com",
          status: "sent",
          sentAt: new Date(Date.now() - 60 * 60 * 1000),
        }, { relaxed: false })
      );
      db.close();

      const runner = `
        const monitor = require("./scripts/email-monitor.cjs");
        (async () => {
          await monitor.handleParsedEmail({
            from: { text: "Mailer-Daemon <mailer-daemon@example.com>" },
            subject: "Undelivered Mail Returned to Sender",
            text: ${JSON.stringify(`recipient: bounced@example.com
X-MyBingoCard-Email-ID: ${emailId}
https://mybingocard.com/t/open?c=create_first_card&mid=${emailId}
user unknown`)},
            date: new Date(),
            messageId: "<bounce@example.com>",
          });
          await monitor.handleParsedEmail({
            from: { text: "Customer <customer@example.com>" },
            subject: "Need help with my bingo card",
            text: "The link is not opening for my classroom bingo card.",
            html: "<p>The link is not opening for my classroom bingo card.</p>",
            date: new Date(),
            messageId: "<support@example.com>",
          });
          await monitor.closeDb();
        })().catch((error) => {
          console.error(error && error.stack ? error.stack : error);
          process.exit(1);
        });
      `;

      const result = spawnSync("node", ["-e", runner], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
          DISCORD_WEBHOOK_URL: "",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Failed to record bounce");
      expect(result.stderr).not.toContain("Failed to save support ticket");

      const verify = new Database(dbPath, { readonly: true });
      const rows = verify
        .query("SELECT collection, ejson FROM documents ORDER BY collection, object_id")
        .all() as Array<{ collection: string; ejson: string }>;
      verify.close();

      const docs = rows.map((row) => ({
        collection: row.collection,
        document: EJSON.parse(row.ejson, { relaxed: true }) as Record<string, unknown>,
      }));
      const bounce = docs.find((row) => row.collection === "email_bounces")?.document;
      const message = docs.find((row) => row.collection === "email_messages")?.document;
      const ticket = docs.find((row) => row.collection === "support_tickets")?.document;

      expect(bounce).toMatchObject({
        emailId,
        email: "bounced@example.com",
        bounceType: "hard",
        originalCampaignId: "create_first_card",
        rawSubject: "Undelivered Mail Returned to Sender",
      });
      expect(message).toMatchObject({
        emailId,
        status: "bounced",
        bounceType: "hard",
        bounceReason: "Undelivered Mail Returned to Sender",
      });
      expect(ticket).toMatchObject({
        email: "Customer <customer@example.com>",
        subject: "Need help with my bingo card",
        status: "open",
        isReply: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
