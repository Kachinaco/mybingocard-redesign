import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodeImageCell } from "@/lib/cellContent";
import {
  isTrustedExportRequestUrl,
  renderExportCellContent,
  renderExportImageCell,
  sanitizeExportImageUrl,
  sanitizeExportStyle,
} from "@/lib/server/export-html";

const exportRoutes = [
  "app/api/cards/[id]/export/pdf/route.ts",
  "app/api/cards/[id]/export/png/route.ts",
  "app/api/cards/[id]/export/bulk-pdf/route.ts",
  "app/api/cards/batch/pdf/route.ts",
];

describe("export HTML safety", () => {
  test("strictly normalizes hostile card styles", () => {
    expect(sanitizeExportStyle({
      backgroundColor: "red; background:url(http://127.0.0.1)",
      textColor: "#123456",
      borderColor: "</style><script>alert(1)</script>",
      fontSize: "9999px;position:fixed",
      fontFamily: "Arial;}</style><script>alert(1)</script>",
    })).toEqual({
      backgroundColor: "#ffffff",
      textColor: "#123456",
      borderColor: "#000000",
      fontSize: "48px",
      fontFamily: "Arial",
    });
  });

  test("allows only trusted raster image locations", () => {
    expect(sanitizeExportImageUrl("/api/images/64f00000000000000000abcd")).toBe(
      "https://mybingocard.com/api/images/64f00000000000000000abcd",
    );
    expect(sanitizeExportImageUrl("data:image/png;base64,aGVsbG8=")).toBe(
      "data:image/png;base64,aGVsbG8=",
    );
    expect(sanitizeExportImageUrl("file:///tmp/export-safe/image.png", {
      allowedFileRoot: "/tmp/export-safe",
    })).toBe("file:///tmp/export-safe/image.png");

    for (const unsafe of [
      "http://127.0.0.1:3000/private",
      "http://169.254.169.254/latest/meta-data",
      "https://mybingocard.com.evil.example/api/images/64f00000000000000000abcd",
      "https://mybingocard.com/api/images/not-an-object-id",
      "file:///etc/passwd",
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      '" onerror="fetch(`https://evil.example`)"',
    ]) {
      expect(sanitizeExportImageUrl(unsafe, { allowedFileRoot: "/tmp/export-safe" })).toBeNull();
      expect(isTrustedExportRequestUrl(unsafe, { allowedFileRoot: "/tmp/export-safe" })).toBe(false);
    }
  });

  test("escapes labels and drops unsafe image markup", () => {
    const safeCell = encodeImageCell({
      imageId: "64f00000000000000000abcd",
      imageUrl: "/api/images/64f00000000000000000abcd",
      label: '"><script>alert(1)</script>',
      fit: "cover",
    });
    const safeMarkup = renderExportImageCell(safeCell);
    expect(safeMarkup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(safeMarkup).not.toContain("<script>");

    const unsafeCell = encodeImageCell({
      imageId: "bad",
      imageUrl: "http://127.0.0.1/admin",
      label: "unsafe",
    });
    expect(renderExportImageCell(unsafeCell)).toBeNull();
  });

  test("uses an escaped label instead of raw image-cell JSON when an image is unavailable", () => {
    const cell = encodeImageCell({
      imageId: "missing",
      imageUrl: "",
      label: "<Missing & private>",
      fit: "cover",
    });

    const rendered = renderExportCellContent(cell, cell);
    expect(rendered).toBe("&lt;Missing &amp; private&gt;");
    expect(rendered).not.toContain("__IMG__");
  });

  test("every Chromium export disables JavaScript and uses the shared request guard", () => {
    for (const route of exportRoutes) {
      const source = readFileSync(resolve(process.cwd(), route), "utf8");
      expect(source).toContain("hardenExportPage(page");
      expect(source).toContain("renderExportCellContent");
      expect(source).toContain("sanitizeExportStyle");
      expect(source).not.toContain("JSON.parse(cell.slice");
    }
  });
});
