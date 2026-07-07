import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getEmailPreferences,
  recordEmailClick,
  recordEmailMessageSent,
  recordEmailOpen,
  unsubscribeEmail,
  updateEmailPreferences,
} from "@/lib/db/email-marketing";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  closeSqliteStoreForTests();
  delete process.env.MYBINGOCARD_DB_BACKEND;
  delete process.env.MYBINGOCARD_SQLITE_PATH;

  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-email-marketing-"));
  const db = new Database(join(dir, "shadow.sqlite"));

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

    CREATE INDEX documents_collection_idx ON documents(collection);
  `);

  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);

  cleanupCallbacks.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store };
}

describe("SQLite email marketing helpers", () => {
  test("reads, updates, and unsubscribes email preferences", async () => {
    const { store } = createFixture();

    expect(await getEmailPreferences("Reader@Example.com")).toEqual({
      marketingEmails: true,
      productUpdates: true,
    });

    await updateEmailPreferences({
      email: "Reader@Example.com",
      marketingEmails: false,
      productUpdates: true,
    });
    expect(await getEmailPreferences("reader@example.com")).toEqual({
      marketingEmails: false,
      productUpdates: true,
    });

    const normalizedEmail = await unsubscribeEmail(" Reader@Example.com ");
    expect(normalizedEmail).toBe("reader@example.com");
    expect(store.findOne<Record<string, unknown>>("email_preferences", { email: "reader@example.com" })).toMatchObject({
      marketingEmails: false,
    });
  });

  test("records sent, opened, and clicked email tracking rows", async () => {
    const { store } = createFixture();

    await recordEmailMessageSent({
      emailId: "email-1",
      messageId: "smtp-1",
      email: "Track@Example.com",
      campaignId: "campaign-1",
      subject: "Tracking test",
      sentAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    await recordEmailOpen({
      email: "track@example.com",
      campaignId: "campaign-1",
      emailId: "email-1",
      ip: "203.0.113.1",
      userAgent: "Test UA",
      openedAt: new Date("2026-07-02T00:00:00.000Z"),
    });
    await recordEmailOpen({
      email: "track@example.com",
      campaignId: "campaign-1",
      emailId: "email-1",
      openedAt: new Date("2026-07-03T00:00:00.000Z"),
    });
    await recordEmailClick({
      email: "track@example.com",
      campaignId: "campaign-1",
      url: "https://mybingocard.com/create",
      linkId: "create-link",
      emailId: "email-1",
      clickedAt: new Date("2026-07-04T00:00:00.000Z"),
    });

    const open = store.findOne<Record<string, unknown>>("drip_opens", {
      email: "track@example.com",
      campaignId: "campaign-1",
    });
    const click = store.findOne<Record<string, unknown>>("drip_clicks", {
      email: "track@example.com",
      campaignId: "campaign-1",
      url: "https://mybingocard.com/create",
    });
    const message = store.findOne<Record<string, unknown>>("email_messages", { emailId: "email-1" });

    expect(open).toMatchObject({ openCount: 2, humanOpenCount: 2 });
    expect(click).toMatchObject({ clickCount: 1, linkId: "create-link" });
    expect(message).toMatchObject({
      status: "clicked",
      openCount: 2,
      humanOpenCount: 2,
      clickCount: 1,
      lastClickedUrl: "https://mybingocard.com/create",
    });
    expect((message?.firstOpenedAt as Date).toISOString()).toBe("2026-07-02T00:00:00.000Z");
    expect((message?.firstClickedAt as Date).toISOString()).toBe("2026-07-04T00:00:00.000Z");
  });
});
