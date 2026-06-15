import { describe, expect, test as it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("checkout funnel guardrails", () => {
  const checkoutModalSource = readFileSync(resolve(process.cwd(), "components/CheckoutModal.tsx"), "utf8");
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const dashboardLayoutSource = readFileSync(resolve(process.cwd(), "app/dashboard/layout.tsx"), "utf8");
  const activatePageSource = readFileSync(resolve(process.cwd(), "app/activate/page.tsx"), "utf8");
  const accountPendingGateSource = readFileSync(resolve(process.cwd(), "components/AccountPendingCheckoutGate.tsx"), "utf8");
  const embeddedCheckoutRouteSource = readFileSync(resolve(process.cwd(), "app/api/stripe/embedded-checkout/route.ts"), "utf8");

  it("replaces the embedded checkout modal with a free-access redirect shim", () => {
    expect(checkoutModalSource).toContain("freeAccessRedirect");
    expect(checkoutModalSource).toContain("checkout_disabled_free_for_all");
    expect(checkoutModalSource).toContain('"/dashboard?success=true&free=1"');
    expect(checkoutModalSource).not.toContain("@stripe/stripe-js");
    expect(checkoutModalSource).not.toContain("EmbeddedCheckout");
  });

  it("does not show creator-tool premium checkout on the create page", () => {
    const checkoutButtonMatches = createPageSource.match(/<PremiumCheckoutButton/g) ?? [];
    expect(checkoutButtonMatches).toHaveLength(0);
    expect(createPageSource).not.toContain("StartTrialButton");
    expect(createPageSource).not.toContain("Start 7-Day Trial");
  });

  it("opens free batch mode from pricing and legacy checkout links", () => {
    expect(createPageSource).toContain('searchParams.get("batchMode") === "1"');
    expect(createPageSource).toContain('searchParams.get("batchMode") === "true"');
    expect(createPageSource).toContain("setBatchMode(true);");
    expect(createPageSource).toContain("Generate ${batchCount}-Card Batch Free");
  });

  it("embedded checkout route returns a free redirect and creates no Stripe session", () => {
    expect(embeddedCheckoutRouteSource).toContain("embedded_checkout_disabled_free_for_all");
    expect(embeddedCheckoutRouteSource).toContain("purchaseType: purchaseType || \"subscription\"");
    expect(embeddedCheckoutRouteSource).toContain("free: true");
    expect(embeddedCheckoutRouteSource).not.toContain("checkout.sessions.create");
    expect(embeddedCheckoutRouteSource).not.toContain("payment_method_collection");
  });

  it("sanitizes embedded checkout return paths before redirecting", () => {
    expect(embeddedCheckoutRouteSource).toContain("function sanitizeReturnPath");
    expect(embeddedCheckoutRouteSource).toContain('path.startsWith("//")');
    expect(embeddedCheckoutRouteSource).toContain("parsed.origin !== appOrigin");
    expect(embeddedCheckoutRouteSource).toContain('redirectUrl: sanitizeReturnPath(returnPath, "/dashboard?success=true&free=1")');
  });

  it("lets free users open dashboard profile tools without checkout", () => {
    expect(dashboardLayoutSource).not.toContain("hasPremiumAccess(user)");
    expect(dashboardLayoutSource).not.toContain('redirect("/activate?from=dashboard")');
    expect(activatePageSource).toContain("<AccountPendingCheckoutGate");
    expect(accountPendingGateSource).toContain("Checkout disabled");
    expect(accountPendingGateSource).toContain('successPath="/dashboard"');
  });

  it("keeps the create paywall escape in anonymous draft mode instead of dashboard bypass", () => {
    expect(createPageSource).toContain("const isPremiumGateActive = Boolean");
    expect(createPageSource).toContain("{editorUnlocked && (");
    expect(createPageSource).toContain("continueAnonymousDraft");
    expect(createPageSource).toContain('signOut({ callbackUrl: "/create" })');
    expect(createPageSource).toContain("Keep drafting");
    expect(createPageSource).not.toContain("Not now");
    expect(createPageSource).not.toContain("Back to Dashboard");
  });

  it("does not auto-open checkout after an ordinary anonymous save auth round trip", () => {
    expect(createPageSource).toContain('trackClientActivity("save_blocked_auth_required"');
    expect(createPageSource).toContain('next_step: "auth_then_free_save"');
    expect(createPageSource).toContain("redirectToSignupForCreation();");
    expect(createPageSource).not.toContain("redirectToSignupForCreation({ autoCheckoutAfterAuth: true });");
  });
});
