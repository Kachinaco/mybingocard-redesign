import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getShareEmailPack } from "@/lib/shareEmailPacks";

describe("email share free-access guardrails", () => {
  const socialShareSource = readFileSync(resolve(process.cwd(), "components/SocialShare.tsx"), "utf8");
  const embeddedCheckoutSource = readFileSync(resolve(process.cwd(), "app/api/stripe/embedded-checkout/route.ts"), "utf8");
  const emailShareRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/share/email/route.ts"), "utf8");

  test("email share packs are zero-cost while free access is active", () => {
    expect(getShareEmailPack(3)).toMatchObject({ size: 10, amount: 0, label: "Free" });
    expect(getShareEmailPack(30)).toMatchObject({ size: 30, amount: 0, label: "Free" });
    expect(getShareEmailPack(500)).toMatchObject({ size: 500, amount: 0, label: "Free" });
    expect(getShareEmailPack(501)).toBeNull();
  });

  test("email sharing sends directly instead of opening checkout", () => {
    expect(socialShareSource).toContain("const isPremiumUser = true;");
    expect(socialShareSource).toContain('fetch(`/api/cards/${cardId}/share/email`');
    expect(socialShareSource).toContain("Free email share");
    expect(socialShareSource).toContain("Send Emails");
    expect(socialShareSource).not.toContain('purchaseType: "email_share_batch"');
  });

  test("server and embedded checkout routes do not require payment for email shares", () => {
    expect(emailShareRouteSource).toContain("hasPremiumAccess(user)");
    expect(emailShareRouteSource).toContain("createSharedLink");
    expect(emailShareRouteSource).toContain("checkoutRequired: false");
    expect(embeddedCheckoutSource).toContain("embedded_checkout_disabled_free_for_all");
    expect(embeddedCheckoutSource).toContain("free: true");
    expect(embeddedCheckoutSource).not.toContain("share_email_checkout_refs");
    expect(embeddedCheckoutSource).not.toContain("checkout.sessions.create");
  });
});
