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
    expect(socialShareSource).toContain("Or subscribe and email batches are included");
    expect(socialShareSource).toContain("Pay ${emailPack?.label || \"\"} & Send");
    expect(embeddedCheckoutSource).toContain('purchaseType === "email_share_batch"');
    expect(embeddedCheckoutSource).toContain("insertShareEmailCheckoutRef");
    expect(embeddedCheckoutSource).toContain("ensureShareEmailCheckoutRefsReady");
    expect(embeddedCheckoutSource).not.toContain(".collection(");
  });

  test("server blocks free users from bypassing checkout and webhook sends paid links", () => {
    expect(emailShareRouteSource).toContain('checkoutRequired: true');
    expect(emailShareRouteSource).toContain("hasPremiumAccess(user)");
    expect(emailShareRouteSource).toContain("createSharedLink");
    expect(webhookSource).toContain('session.metadata?.purchaseType === "email_share_batch"');
    expect(webhookSource).toContain("email_share_batch_sent");
    expect(webhookSource).toContain("sendShareLinkInvitationEmail");
    expect(webhookSource).toContain("claimStripeWebhookEvent");
    expect(webhookSource).toContain("insertPreparedSharedLinks");
    expect(webhookSource).not.toContain(".collection(");
  });

  test("webhook idempotency acknowledges completed work but retries active or failed work", () => {
    expect(webhookSource).toContain('claimResult === "completed"');
    expect(webhookSource).toContain('claimResult === "processing"');
    expect(webhookSource).toContain('{ status: 503, headers: { "Retry-After": "30" } }');
    expect(webhookSource).toContain("completeStripeWebhookEvent(event.id)");
    expect(webhookSource).toContain("failStripeWebhookEvent(event.id, error)");
  });

  test("partial and failed paid fulfillment uses a dedicated red Discord alert", () => {
    expect(webhookSource).toContain("notifyCheckoutFulfillmentFailure");
    expect(webhookSource).not.toContain("PARTIAL FAILURE: Share Links");
  });
});
