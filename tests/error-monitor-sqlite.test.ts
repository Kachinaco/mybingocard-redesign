import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("error monitor script SQLite backend", () => {
  test("detects structured SQLite errors without posting to Discord", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-error-monitor-"));
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

      for (const collection of ["error_events", "error_fingerprints", "activity_events"]) {
        insertCollection.run(collection);
      }

      const insert = (collection: string, id: string, document: Record<string, unknown>) => {
        insertDocument.run(collection, id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const eventId = "64f350000000000000001001";
      insert("error_events", eventId, {
        _id: new ObjectId(eventId),
        fingerprint: "client_sqlite_monitor",
        message: "Game stream disconnected",
        pathname: "/game/play/ROOM1",
        pageUrl: "https://mybingocard.com/game/play/ROOM1",
        sessionId: "sess-monitor",
        createdAt: new Date(now - 5 * 60 * 1000),
      });
      insert("error_fingerprints", "client_sqlite_monitor", {
        _id: "client_sqlite_monitor",
        status: "open",
        severity: "high",
        totalCount: 9,
        latestBuildId: "build-monitor",
      });
      db.close();

      const result = spawnSync("node", ["scripts/error-monitor.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MONGODB_URI: "mongodb://127.0.0.1:1/nope",
          MYBINGOCARD_ERROR_MONITOR_NO_DISCORD: "1",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Error monitor failed");
      expect(result.stdout).toContain("Structured error_events in last 30 min");
      expect(result.stdout).toContain("client_sqlite_monitor");
      expect(result.stdout).toContain("Discord notify disabled by MYBINGOCARD_ERROR_MONITOR_NO_DISCORD");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
