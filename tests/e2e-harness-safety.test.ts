import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const makerE2eSource = readFileSync(
  resolve(process.cwd(), "scripts/maker-browser-e2e.cjs"),
  "utf8",
);

describe("Maker E2E safety guardrails", () => {
  test("blocks first-party telemetry proxies before requests reach external analytics", () => {
    expect(makerE2eSource).toContain('"/api/track-visitor"');
    expect(makerE2eSource).toContain('"/t/api/track"');
    expect(makerE2eSource).toContain('"/t/tracker.js"');
    expect(makerE2eSource).toContain("blockedTelemetry.add(pathname)");
    expect(makerE2eSource).toContain("request.abort()");
  });

  test("uses the real email-send disable switch", () => {
    expect(makerE2eSource).toContain('MYBINGOCARD_EMAIL_SENDS_DISABLED: "1"');
    expect(makerE2eSource).not.toContain("SMTP_SEND_DISABLED");
  });

  test("keeps uploaded-image fixtures inside the disposable E2E directory", () => {
    expect(makerE2eSource).toContain('MYBINGOCARD_UPLOAD_BASE: path.join(fixture.dir, "uploads")');
    expect(makerE2eSource).toContain("private_uploaded_image_all_export_formats");
    expect(makerE2eSource).toContain("magentaPixelCount > 1_000");
  });

  test("rejects stale builds and honors all supported Chrome overrides", () => {
    expect(makerE2eSource).toContain("assertFreshBuild(buildId)");
    expect(makerE2eSource).toContain('"GOOGLE_CHROME_BIN"');
    expect(makerE2eSource).toContain('"CHROME_BIN"');
    expect(makerE2eSource).toContain("puppeteer.executablePath()");
    expect(makerE2eSource).toContain('"instrumentation.ts"');
    expect(makerE2eSource).toContain('"postcss.config.mjs"');
    expect(makerE2eSource).toContain('"tailwind.config.ts"');
    expect(makerE2eSource).toContain('"tsconfig.json"');
    expect(makerE2eSource).toContain('"bun.lock"');
    expect(makerE2eSource).toContain('"package-lock.json"');
  });

  test("runs every Chromium-backed export route", () => {
    expect(makerE2eSource).toContain('pdf: await run("pdf")');
    expect(makerE2eSource).toContain('png: await run("png")');
    expect(makerE2eSource).toContain("/export/bulk-pdf");
    expect(makerE2eSource).toContain('"/api/cards/batch/pdf"');
  });
});
