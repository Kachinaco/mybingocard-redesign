import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON } from "bson";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("seed clipart script SQLite backend", () => {
  test("seeds system images and image templates into the shadow document store", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-seed-clipart-"));
    const dbPath = join(dir, "shadow.sqlite");
    const uploadDir = join(dir, "uploads");
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

      const result = spawnSync("node", ["scripts/seed-clipart.cjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MYBINGOCARD_DB_BACKEND: "sqlite",
          MYBINGOCARD_SQLITE_PATH: dbPath,
          MYBINGOCARD_CLIPART_UPLOAD_BASE: uploadDir,
          MYBINGOCARD_CLIPART_LIMIT: "12",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Seed failed");
      expect(result.stdout).toContain("Connecting to SQLite shadow store");
      expect(result.stdout).toContain("Image templates: 5");

      const verify = new Database(dbPath, { readonly: true });
      const imageCount = verify
        .query("SELECT COUNT(*) AS count FROM documents WHERE collection = 'images'")
        .get() as { count: number };
      const templateCount = verify
        .query("SELECT COUNT(*) AS count FROM documents WHERE collection = 'templates'")
        .get() as { count: number };
      const firstImage = verify
        .query("SELECT ejson FROM documents WHERE collection = 'images' LIMIT 1")
        .get() as { ejson: string };
      verify.close();

      const image = EJSON.parse(firstImage.ejson, { relaxed: true }) as Record<string, unknown>;
      expect(imageCount.count).toBe(12);
      expect(templateCount.count).toBe(5);
      expect(image).toMatchObject({
        userId: "system",
        mimeType: "image/webp",
        isSystem: true,
      });
      expect(existsSync(String(image.storagePath))).toBe(true);
      expect(existsSync(String(image.thumbnailPath))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
