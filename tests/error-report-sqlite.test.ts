import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("error report script SQLite backend", () => {
  test("builds unresolved error reports from the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-error-report-"));
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

      for (const collection of ["error_events", "error_fingerprints"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const eventId = "64f340000000000000001001";
      insert("error_events", eventId, {
        _id: new ObjectId(eventId),
        fingerprint: "client_sqlite_report",
        message: "Cannot read properties of undefined",
        pathname: "/game/play/ABC123",
        pageUrl: "https://mybingocard.com/game/play/ABC123",
        anonymousId: "anon-error",
        sessionId: "sess-error",
        buildId: "build-sqlite",
        breadcrumbs: [{ type: "ui", message: "clicked bingo square" }],
        sourceMappedFrames: [{ source: "app/game/play/page.tsx", line: 42, column: 13 }],
        createdAt: new Date(now - 10 * 60 * 1000),
      });
      insert("error_fingerprints", "client_sqlite_report", {
        _id: "client_sqlite_report",
        status: "open",
        severity: "high",
        message: "Cannot read properties of undefined",
        totalCount: 3,
        sessionIds: ["sess-error", "sess-two"],
        firstSeenAt: new Date(now - 60 * 60 * 1000),
        lastSeenAt: new Date(now - 5 * 60 * 1000),
        latestPageUrl: "https://mybingocard.com/game/play/ABC123",
        latestBuildId: "build-sqlite",
        latestBreadcrumbs: [{ type: "ui", message: "clicked bingo square" }],
        latestSourceMappedFrames: [{ source: "app/game/play/page.tsx", line: 42, column: 13 }],
      });
      db.close();

      const result = spawnSync("node", ["scripts/error-report.cjs", "--hours", "24", "--route", "/game", "--json"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Error report failed");

      const report = JSON.parse(result.stdout);
      expect(report.totals.totalEvents).toBe(1);
      expect(report.groups).toHaveLength(1);
      expect(report.groups[0]).toMatchObject({
        _id: "client_sqlite_report",
        severity: "high",
        status: "open",
        totalCount: 3,
      });
      expect(report.recentEvents).toHaveLength(1);
      expect(report.recentEvents[0]).toMatchObject({
        fingerprint: "client_sqlite_report",
        pathname: "/game/play/ABC123",
        anonymousId: "anon-error",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
