import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("feature usage insights SQLite backend", () => {
  test("generates feature usage reports from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-feature-insights-"));
    const dbPath = join(dir, "shadow.sqlite");
    const outputDir = join(dir, "reports");
    const obsidianNote = join(dir, "obsidian", "analytics-insights.md");
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
      for (const collection of ["activity_events", "users"]) insertCollection.run(collection);

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const base = {
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
        anonymousId: "anon-feature",
        sessionId: "sess-feature",
        userAgent: "Mozilla/5.0",
      };
      insert("activity_events", "64f380000000000000001001", {
        _id: new ObjectId("64f380000000000000001001"),
        ...base,
        event: "page_view",
        pathname: "/create",
        metadata: { utm: { source: "pinterest", medium: "social" } },
      });
      insert("activity_events", "64f380000000000000001002", {
        _id: new ObjectId("64f380000000000000001002"),
        ...base,
        event: "card_created",
        pathname: "/create",
      });
      insert("activity_events", "64f380000000000000001003", {
        _id: new ObjectId("64f380000000000000001003"),
        ...base,
        event: "image_uploaded",
        pathname: "/create",
      });
      insert("activity_events", "64f380000000000000001004", {
        _id: new ObjectId("64f380000000000000001004"),
        ...base,
        event: "dead_click",
        pathname: "/create",
        metadata: { text: "Upload" },
      });
      insert("users", "64f380000000000000002001", {
        _id: new ObjectId("64f380000000000000002001"),
        email: "feature@example.com",
        utm_source: "pinterest",
        utm_medium: "social",
        createdAt: new Date(now - 60 * 60 * 1000),
      });
      db.close();

      const result = spawnSync("node", ["scripts/feature-usage-insights.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_INSIGHTS_DIR: outputDir,
          MYBINGOCARD_INSIGHTS_NOTE: obsidianNote,
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const summary = JSON.parse(result.stdout);
      expect(existsSync(summary.jsonPath)).toBe(true);
      expect(existsSync(summary.markdownPath)).toBe(true);
      expect(existsSync(summary.obsidianNote)).toBe(true);
      expect(summary.mostUsed).toMatchObject({ label: "Create and edit cards", uniqueVisitors: 1 });
      expect(summary.topSource).toMatchObject({ source: "pinterest / social", uniqueVisitors: 1 });

      const markdown = readFileSync(summary.markdownPath, "utf8");
      expect(markdown).toContain("Create and edit cards");
      expect(markdown).toContain("Image bingo");
      expect(markdown).toContain("/create / Upload");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
