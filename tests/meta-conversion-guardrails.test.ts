import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Meta conversion tracking guardrails", () => {
  const layoutSource = readSource("app/layout.tsx");
  const metaPixelSource = readSource("components/MetaPixel.tsx");
  const metaPixelHelperSource = readSource("lib/meta-pixel.ts");
  const metaConversionsSource = readSource("lib/meta-conversions.ts");
  const activityClientSource = readSource("lib/activity-client.ts");
  const stripeWebhookSource = readSource("app/api/stripe/webhook/route.ts");
  const signupRouteSource = readSource("app/api/auth/signup/route.ts");

  test("Meta Pixel is gated by environment and mounted globally", () => {
    expect(layoutSource).toContain("import MetaPixel");
    expect(layoutSource).toContain("<MetaPixel />");
    expect(metaPixelSource).toContain("NEXT_PUBLIC_META_PIXEL_ID");
    expect(metaPixelSource).toContain("connect.facebook.net/en_US/fbevents.js");
    expect(metaPixelSource).toContain("fbq('init', '${pixelId}')");
    expect(metaPixelSource).not.toContain("2613805647066");
  });

  test("client activity forwards only selected funnel events to Meta Pixel", () => {
    expect(activityClientSource).toContain("trackMappedMetaPixelEvent");
    expect(activityClientSource).toContain("Marketing pixel forwarding must never block product flows");
    expect(metaPixelHelperSource).toContain('case "pricing_page_viewed"');
    expect(metaPixelHelperSource).toContain('case "email_capture_submitted"');
    expect(metaPixelHelperSource).toContain('case "checkout_loaded"');
    expect(metaPixelHelperSource).toContain('"InitiateCheckout"');
    expect(metaPixelHelperSource).toContain('"Lead"');
  });

  test("server Conversions API is optional, hashed, and wired to signup and purchase", () => {
    expect(metaConversionsSource).toContain("META_CONVERSIONS_ACCESS_TOKEN");
    expect(metaConversionsSource).toContain("META_CONVERSIONS_API_VERSION");
    expect(metaConversionsSource).toContain("createHash(\"sha256\")");
    expect(metaConversionsSource).toContain("https://graph.facebook.com/");
    expect(stripeWebhookSource).toContain("sendMetaConversionEvent");
    expect(stripeWebhookSource).toContain('eventName: "Purchase"');
    expect(stripeWebhookSource).toContain("eventId: session.id");
    expect(signupRouteSource).toContain('eventName: "CompleteRegistration"');
    expect(signupRouteSource).toContain("eventId: `signup_${user._id.toString()}`");
  });
});
