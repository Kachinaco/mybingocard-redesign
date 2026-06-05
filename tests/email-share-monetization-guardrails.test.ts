import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getShareEmailPack } from "@/lib/shareEmailPacks";

describe("email share monetization guardrails", () => {
  const socialShareSource = readFileSync(resolve(process.cwd(), "components/SocialShare.tsx"), "utf8");
  const embeddedCheckoutSource = readFileSync(resolve(process.cwd(), "app/api/stripe/embedded-checkout/route.ts"), "utf8");
  const emailShareRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/share/email/route.ts"), "utf8");
  const webhookSource = readFileSync(resolve(process.cwd(), "app/api/stripe/webhook/route.ts"), "utf8");

  test("small email shares use the paid minimum pack", () => {
    expect(getShareEmailPack(3)).toMatchObject({ size: 10, amount: 199, label: "$1.99" });
    expect(getShareEmailPack(30)).toMatchObject({ size: 30, amount: 499, label: "$4.99" });
    expect(getShareEmailPack(500)).toMatchObject({ size: 500, amount: 2999, label: "$29.99" });
    expect(getShareEmailPack(501)).toBeNull();
  });

  test("free email sharing opens paid checkout instead of sending directly", () => {
    expect(socialShareSource).toContain('purchaseType: "email_share_batch"');
    expect(socialShareSource).toContain("Or start the 3-day trial and email batches are included");
    expect(socialShareSource).toContain("Pay ${emailPack?.label || \"\"} & Send");
    expect(embeddedCheckoutSource).toContain('purchaseType === "email_share_batch"');
    expect(embeddedCheckoutSource).toContain("share_email_checkout_refs");
  });

  test("server blocks free users from bypassing checkout and webhook sends paid links", () => {
    expect(emailShareRouteSource).toContain('checkoutRequired: true');
    expect(emailShareRouteSource).toContain("hasPremiumAccess(user)");
    expect(emailShareRouteSource).toContain("createSharedLink");
    expect(webhookSource).toContain('session.metadata?.purchaseType === "email_share_batch"');
    expect(webhookSource).toContain("email_share_batch_sent");
    expect(webhookSource).toContain("sendShareLinkInvitationEmail");
  });
});
