import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("traffic truth report SQLite backend", () => {
  test("summarizes SQLite activity and separates human chunk failures from automation", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-traffic-truth-"));
    const dbPath = join(dir, "shadow.sqlite");
    const logDir = join(dir, "logs");
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

        INSERT INTO collections (name, source_count, exported_count)
        VALUES ('activity_events', 0, 0);
      `);

      const insertDocument = db.prepare(
        "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
      );
      const insert = (id: string, document: Record<string, unknown>) => {
        insertDocument.run("activity_events", id, EJSON.stringify(document, { relaxed: false }));
      };

      const now = Date.now();
      const base = {
        createdAt: new Date(now - 5 * 60 * 1000),
        sessionId: "sess-traffic",
        anonymousId: "anon-traffic",
      };
      insert("64f360000000000000001001", {
        _id: new ObjectId("64f360000000000000001001"),
        ...base,
        event: "page_view",
        userAgent: "Mozilla/5.0",
        metadata: { utm_source: "pinterest" },
      });
      insert("64f360000000000000001002", {
        _id: new ObjectId("64f360000000000000001002"),
        ...base,
        event: "page_view",
        userAgent: "Googlebot/2.1",
        metadata: { source: "bot-source" },
      });
      insert("64f360000000000000001003", {
        _id: new ObjectId("64f360000000000000001003"),
        ...base,
        event: "page_engagement",
      });
      insert("64f360000000000000001004", {
        _id: new ObjectId("64f360000000000000001004"),
        ...base,
        event: "card_created",
      });
      insert("64f360000000000000001005", {
        _id: new ObjectId("64f360000000000000001005"),
        ...base,
        event: "signup_completed",
      });
      insert("64f360000000000000001006", {
        _id: new ObjectId("64f360000000000000001006"),
        ...base,
        event: "checkout_started",
      });
      db.close();

      mkdirSync(logDir, { recursive: true });
      const at = new Date(Date.now() - 1000);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const pad = (value: number) => String(value).padStart(2, "0");
      const nginxTime = `${pad(at.getUTCDate())}/${months[at.getUTCMonth()]}/${at.getUTCFullYear()}:${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}:${pad(at.getUTCSeconds())} +0000`;
      writeFileSync(join(logDir, "mybingocard.com.access.log"), [
        `203.0.113.10 - - [${nginxTime}] "GET /_next/static/chunks/human-stale.js HTTP/1.1" 404 123 "-" "Mozilla/5.0 Safari/605.1.15"`,
        `203.0.113.20 - - [${nginxTime}] "GET /_next/static/chunks/automation-stale.js HTTP/1.1" 404 123 "-" "Mozilla/5.0 HeadlessChrome/126.0"`,
      ].join("\n"));

      const result = spawnSync("node", ["scripts/traffic-truth-report.cjs", "--days", "1", "--no-write", "--json"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_NGINX_LOG_DIR: logDir,
          MYBINGOCARD_TRAFFIC_SKIP_CENTRAL_ANALYTICS: "1",
          MYBINGOCARD_TRAFFIC_SKIP_GSC: "1",
          MYBINGOCARD_AGENT_TASKS: "0",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Traffic truth report failed");
      expect(result.stdout).toContain("- First-party clean page views: 1");
      expect(result.stdout).toContain("- First-party events: 6 total, 1 engagements, 1 card/game/share/print events, 1 signups, 1 checkout events");
      expect(result.stdout).toContain("- pinterest: 1");
      expect(result.stdout).toContain('"available": true');
      expect(result.stdout).toContain('"cleanPageViews": 1');
      expect(result.stdout).toContain('"pageViews": 2');
      expect(result.stdout).toContain('"sessions": 1');
      expect(result.stdout).toContain("Regression flags: 1 human stale/missing Next chunk failures in nginx logs");
      expect(result.stdout).toContain("| Human chunk | Automation chunk |");
      expect(result.stdout).toContain("Automation/bot JS/CSS chunk failures: 1 (diagnostic only; excluded from regression flags)");
      expect(result.stdout).toContain("(Next chunk failure; human traffic)");
      expect(result.stdout).toContain("(Next chunk failure; automation/bot traffic)");
      expect(result.stdout).toContain('"humanChunkFailures": 1');
      expect(result.stdout).toContain('"automationChunkFailures": 1');
      expect(result.stdout).not.toContain('"chunkFailures":');
      expect(result.stdout).toContain('"kind": "next_chunk_failure"');
      expect(result.stdout).toContain('"traffic": "automation"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
