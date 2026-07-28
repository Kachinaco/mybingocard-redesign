import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselines = JSON.parse(readFileSync(join(root, "baselines.json"), "utf8"));

const requiredFiles = [
  "README.md",
  "baselines.json",
  "SCORECARD.md",
  "ACQUISITION-JOURNEYS.md",
  "UX-CREATE-PATH-AUDIT.md",
  "evidence/390-clipping.md",
  "mockups/cta-mobile-mockups.html",
  "CTA-COPY-DRAFTS.md",
  "SEO-CONTENT-BRIEFS.md",
  "CHATGPT-RECOVERY-PACKAGE.md",
  "ANALYTICS-RECONCILIATION.md",
  "BOT-CLASSIFICATION-PROPOSAL.md",
  "queries/app-scorecard.sql",
  "queries/tracker-scorecard.sql",
  "queries/acquisition.sql",
  "tests/reconciliation.test.ts",
  "tests/viewport-check.ts",
  "tests/approval-a-viewport-check.ts",
  "evidence/viewport-check.json",
  "evidence/approval-a/viewport-check.json",
  "evidence/mockup-390.png",
  "evidence/create-389.png",
  "evidence/create-390.png",
  "evidence/create-391.png",
  "evidence/homepage-390.png",
  "evidence/homepage-390-email-capture.png",
  "APPROVAL-PACKET.md",
];

test("all execution artifacts exist", () => {
  for (const path of requiredFiles) {
    expect(existsSync(join(root, path)), path).toBe(true);
  }
});

test("Approval A viewport screenshots cover every requested width", () => {
  for (const width of [320, 360, 375, 389, 390, 391, 414, 430]) {
    for (const prefix of ["homepage-hero", "email-capture", "seo-header"]) {
      const path = `evidence/approval-a/${prefix}-${width}.png`;
      expect(existsSync(join(root, path)), path).toBe(true);
    }
  }
});

test("comparison windows stay frozen", () => {
  expect(baselines.timezone).toBe("America/Phoenix");
  expect(baselines.matchedWindow.currentStart).toBe("2026-07-13T00:00:00-07:00");
  expect(baselines.matchedWindow.currentEnd).toBe("2026-07-16T09:38:00-07:00");
  expect(baselines.matchedWindow.priorStart).toBe("2026-07-06T00:00:00-07:00");
  expect(baselines.matchedWindow.priorEnd).toBe("2026-07-09T09:38:00-07:00");
});

test("canonical business outcomes are frozen", () => {
  expect(baselines.persistedOutcomes).toEqual({
    priorSignups: 2,
    currentSignups: 1,
    priorCards: 1,
    currentCards: 2,
    priorCardOwners: 1,
    currentCardOwners: 2,
  });
});

test("acquisition loss is direct and ChatGPT, not Google", () => {
  const acquisition = baselines.firstPartyAcquisition;
  expect(acquisition.priorDirectPageviews - acquisition.currentDirectPageviews).toBe(67);
  expect(acquisition.priorChatgptReferrerPageviews - acquisition.currentChatgptReferrerPageviews).toBe(16);
  expect(acquisition.currentGooglePageviews).toBe(acquisition.priorGooglePageviews);
});

test("direct GSC totals remain the organic authority", () => {
  expect(baselines.gsc.currentClicks).toBe(baselines.gsc.priorClicks);
  expect(baselines.gsc.currentImpressions).toBeGreaterThan(baselines.gsc.priorImpressions);
  expect(baselines.gsc.currentAveragePosition).toBeGreaterThan(
    baselines.gsc.priorAveragePosition,
  );
});

test("documents preserve the approval boundary", () => {
  for (const path of requiredFiles.filter((path) => path.endsWith(".md"))) {
    if (!existsSync(join(root, path))) continue;
    const text = readFileSync(join(root, path), "utf8").toLowerCase();
    expect(text.includes("approval") || text.includes("read-only"), path).toBe(true);
  }
});
