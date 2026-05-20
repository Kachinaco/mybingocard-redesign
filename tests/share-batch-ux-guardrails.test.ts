import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("share batch UX guardrails", () => {
  const modalSource = readFileSync(resolve(process.cwd(), "components/ShareBatchModal.tsx"), "utf8");
  const routeSource = readFileSync(resolve(process.cwd(), "app/api/share-links/generate/route.ts"), "utf8");
  const dashboardCardsSource = readFileSync(resolve(process.cwd(), "app/dashboard/cards/page.tsx"), "utf8");
  const shareBatchButtonSource = readFileSync(resolve(process.cwd(), "components/ShareBatchButton.tsx"), "utf8");
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");

  test("frontend enforces at least 5 share links", () => {
    expect(modalSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(modalSource).toContain("if (Number.isNaN(value) || value < MIN_SHARE_LINKS) return MIN_SHARE_LINKS;");
  });

  test("frontend presents share batch as sending unique cards, not batch jargon", () => {
    expect(modalSource).toContain("Create Group Invite");
    expect(shareBatchButtonSource).toContain("Create Group Invite");
    expect(modalSource).toContain("Each friend gets a unique card automatically.");
  });

  test("frontend explains the $0.50 minimum and package-style pricing", () => {
    expect(modalSource).toContain("Minimum 5 links ($0.50) due to Stripe checkout minimum.");
    expect(modalSource).toContain("Starts at $0.50 for up to 5 links, then $0.10 per extra link.");
  });

  test("dashboard success state explains where links are going", () => {
    expect(dashboardCardsSource).toContain("Your share links are ready");
    expect(dashboardCardsSource).toContain("We’ll email");
    expect(dashboardCardsSource).toContain("Copy one group invite from the dashboard.");
    expect(dashboardCardsSource).toContain("Open Share Links dashboard");
  });

  test("backend rejects share-link checkouts below Stripe minimum and passes delivery summary in success redirect", () => {
    expect(routeSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(routeSource).toContain("count must be at least ${MIN_SHARE_LINKS}");
    expect(routeSource).toContain("recipientCount=${recipientEmailCount}&selfCount=${selfFallbackCount}");
  });

  test("batch purchase flow nudges buyers into playable links before PDFs", () => {
    expect(createPageSource).toContain("send players unique cards or host a live game");
    expect(createPageSource).toContain("Make the batch playable before you print.");
    expect(createPageSource).toContain("PDF is still here for paper backups.");
    expect(createPageSource).toContain("Need paper copies?");
    expect(createPageSource).toContain("<ShareBatchButton");
    expect(createPageSource).toContain("<StartGameButton");
  });
});
