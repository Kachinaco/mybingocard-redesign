import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getChromiumExecutablePath,
  getPuppeteerLaunchOptions,
} from "@/lib/server/chromium";

const exportRoutes = [
  "app/api/cards/[id]/export/pdf/route.ts",
  "app/api/cards/[id]/export/png/route.ts",
  "app/api/cards/[id]/export/bulk-pdf/route.ts",
  "app/api/cards/batch/pdf/route.ts",
];

describe("export browser path guardrails", () => {
  test("export routes use the shared Chromium resolver instead of a Linux-only path", () => {
    for (const route of exportRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8");
      expect(source).toContain("getPuppeteerLaunchOptions");
      expect(source).not.toContain('executablePath: "/usr/bin/google-chrome"');
    }
  });

  test("export routes always close a launched browser", () => {
    for (const route of exportRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8");
      expect(source).toContain("let browser: Browser | null = null");
      expect(source).toContain("finally {");
      expect(source).toContain("await browser.close().catch");
    }
  });

  test("the shared resolver selects a usable platform default or explicit override", () => {
    const previous = process.env.PUPPETEER_EXECUTABLE_PATH;
    process.env.PUPPETEER_EXECUTABLE_PATH = "/tmp/custom-chrome";

    try {
      expect(getChromiumExecutablePath()).toBe("/tmp/custom-chrome");
      expect(getPuppeteerLaunchOptions().executablePath).toBe(
        "/tmp/custom-chrome",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
      } else {
        process.env.PUPPETEER_EXECUTABLE_PATH = previous;
      }
    }
  });

  test("missing platform defaults fall back to Puppeteer's configured browser", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/server/chromium.ts"),
      "utf8",
    );

    expect(source).toContain("existsSync(defaultPath) ? defaultPath : undefined");
    expect(source).toContain("...(executablePath ? { executablePath } : {})");
  });
});
