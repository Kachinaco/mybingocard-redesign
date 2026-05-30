import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseImageCell } from "@/lib/cellContent";
import { materializePdfImageCells } from "@/lib/pdf-image-assets";

describe("materializePdfImageCells", () => {
  test("deduplicates repeated data-url image cells into reusable file URLs", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "mybingocard-pdf-test-"));
    const dataUrl = "data:image/png;base64,aGVsbG8=";
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
});
