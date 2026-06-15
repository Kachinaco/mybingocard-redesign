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

  test("frontend explains free link creation instead of Stripe pricing", () => {
    expect(modalSource).toContain("PRICE_PER_LINK_CENTS = 0");
    expect(modalSource).toContain("Free for up to ${MIN_SHARE_LINKS} links");
    expect(modalSource).toContain("Create Links · Free");
    expect(modalSource).not.toContain("Stripe checkout minimum");
  });

  test("dashboard success state explains where links are going", () => {
    expect(dashboardCardsSource).toContain("Your share links are ready");
    expect(dashboardCardsSource).toContain("We’ll email");
    expect(dashboardCardsSource).toContain("Copy one group invite from the dashboard.");
    expect(dashboardCardsSource).toContain("Open Share Links dashboard");
  });

  test("backend rejects requests below the 5-link floor and creates links without checkout", () => {
    expect(routeSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(routeSource).toContain("count must be at least ${MIN_SHARE_LINKS}");
    expect(routeSource).toContain("PRICE_PER_LINK_CENTS = 0");
    expect(routeSource).toContain("bulkCreateSharedLinks");
    expect(routeSource).toContain("amountCents: 0");
    expect(routeSource).toContain("recipientCount=${recipientEmailCount}&selfCount=${selfFallbackCount}");
    expect(routeSource).not.toContain("checkout.sessions.create");
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
