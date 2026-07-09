import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON } from "bson";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("seed templates script SQLite backend", () => {
  test("seeds template documents into the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-seed-templates-"));
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

      const result = spawnSync("node", ["scripts/seed-templates.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Error seeding templates");
      expect(result.stdout).toContain("Connected to SQLite shadow store");
      expect(result.stdout).toContain("Inserted");
      expect(result.stdout).toContain("Disconnected from SQLite shadow store");

      const verify = new Database(dbPath, { readonly: true });
      const count = verify
        .query("SELECT COUNT(*) AS count FROM documents WHERE collection = 'templates'")
        .get() as { count: number };
      const first = verify
        .query("SELECT ejson FROM documents WHERE collection = 'templates' LIMIT 1")
        .get() as { ejson: string };
      verify.close();

      expect(count.count).toBeGreaterThan(20);
      expect(EJSON.parse(first.ejson, { relaxed: true })).toMatchObject({
        size: 5,
        isPremium: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
