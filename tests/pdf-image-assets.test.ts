import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObjectId } from "bson";
import { parseImageCell } from "@/lib/cellContent";
import { materializePdfImageCells } from "@/lib/pdf-image-assets";

describe("materializePdfImageCells", () => {
  test("deduplicates repeated data-url image cells into reusable file URLs", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const dataUrl = `data:image/png;base64,${readFileSync(
      join(process.cwd(), "public/icons/icon-192.png"),
    ).toString("base64")}`;
    const imageCell = `__IMG__:${JSON.stringify({ imageId: "temp_1", imageUrl: dataUrl, label: "Hello" })}`;

    try {
      const cache = new Map<string, string>();
      const first = await materializePdfImageCells([imageCell], { assetDir: tempDir, cache });
      const second = await materializePdfImageCells([imageCell], { assetDir: tempDir, cache });

      const firstImg = parseImageCell(first.cells[0]!);
      const secondImg = parseImageCell(second.cells[0]!);

      expect(firstImg?.imageUrl.startsWith("file://")).toBe(true);
      expect(secondImg?.imageUrl).toBe(firstImg?.imageUrl);
      expect(readdirSync(tempDir)).toHaveLength(1);
      expect(first.tempFiles).toHaveLength(1);
      expect(second.tempFiles).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("leaves non-data-url image cells unchanged", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const imageCell = `__IMG__:${JSON.stringify({ imageId: "abc123", imageUrl: "/api/images/abc123", label: "Saved" })}`;

    try {
      const result = await materializePdfImageCells([imageCell], { assetDir: tempDir, cache: new Map() });
      const parsed = parseImageCell(result.cells[0]!);

      expect(parsed?.imageUrl).toBe("/api/images/abc123");
      expect(result.tempFiles).toHaveLength(0);
      expect(readdirSync(tempDir)).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("materializes a private saved image only for the owning card", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const sourcePath = join(tempDir, "source.png");
    const imageId = "64b7f1234567890abcdef123";
    const imageCell = `__IMG__:${JSON.stringify({
      imageId,
      imageUrl: `/api/images/${imageId}`,
      label: "Private",
    })}`;
    writeFileSync(sourcePath, readFileSync(join(process.cwd(), "public/icons/icon-192.png")));

    try {
      const result = await materializePdfImageCells([imageCell], {
        assetDir: join(tempDir, "assets"),
        cache: new Map(),
        cardOwnerUserId: "owner-1",
        resolveStoredImage: async () => ({
          _id: new ObjectId(imageId),
          userId: "owner-1",
          filename: "private.png",
          mimeType: "image/png",
          size: 13,
          width: 10,
          height: 10,
          storagePath: sourcePath,
          thumbnailPath: sourcePath,
          isSystem: false,
          createdAt: new Date(),
        }),
      });

      expect(parseImageCell(result.cells[0]!)?.imageUrl.startsWith("file://")).toBe(true);
      expect(result.tempFiles).toHaveLength(1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("does not materialize another user's private saved image", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const imageId = "64b7f1234567890abcdef123";
    const imageCell = `__IMG__:${JSON.stringify({
      imageId,
      imageUrl: `/api/images/${imageId}`,
      label: "Private",
    })}`;

    try {
      const result = await materializePdfImageCells([imageCell], {
        assetDir: tempDir,
        cache: new Map(),
        cardOwnerUserId: "owner-1",
        resolveStoredImage: async () => ({
          _id: new ObjectId(imageId),
          userId: "owner-2",
          filename: "private.webp",
          mimeType: "image/webp",
          size: 13,
          width: 10,
          height: 10,
          storagePath: "/not/read",
          thumbnailPath: "/not/read",
          isSystem: false,
          createdAt: new Date(),
        }),
      });

      expect(parseImageCell(result.cells[0]!)?.imageUrl).toBe("");
      expect(result.tempFiles).toHaveLength(0);
      expect(readdirSync(tempDir)).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("does not materialize active SVG image payloads", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const imageCell = `__IMG__:${JSON.stringify({
      imageId: "svg",
      imageUrl: "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+",
      label: "SVG",
    })}`;

    try {
      const result = await materializePdfImageCells([imageCell], {
        assetDir: tempDir,
        cache: new Map(),
      });
      expect(parseImageCell(result.cells[0]!)?.imageUrl).toBe("");
      expect(result.tempFiles).toHaveLength(0);
      expect(readdirSync(tempDir)).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("rejects oversized raster data before decoding or writing it", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const oversizedDataUrl = `data:image/png;base64,${"A".repeat(12 * 1024 * 1024)}`;
    const imageCell = `__IMG__:${JSON.stringify({
      imageId: "oversized",
      imageUrl: oversizedDataUrl,
      label: "Too large",
    })}`;

    try {
      const result = await materializePdfImageCells([imageCell], {
        assetDir: tempDir,
        cache: new Map(),
      });
      expect(parseImageCell(result.cells[0]!)?.imageUrl).toBe("");
      expect(result.tempFiles).toHaveLength(0);
      expect(readdirSync(tempDir)).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
