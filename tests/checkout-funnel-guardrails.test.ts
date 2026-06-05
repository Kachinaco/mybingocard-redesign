import { describe, expect, test as it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("checkout funnel guardrails", () => {
  const checkoutModalSource = readFileSync(resolve(process.cwd(), "components/CheckoutModal.tsx"), "utf8");
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const dashboardLayoutSource = readFileSync(resolve(process.cwd(), "app/dashboard/layout.tsx"), "utf8");
  const activatePageSource = readFileSync(resolve(process.cwd(), "app/activate/page.tsx"), "utf8");
  const accountPendingGateSource = readFileSync(
    resolve(process.cwd(), "components/AccountPendingCheckoutGate.tsx"),
    "utf8"
  );
  const embeddedCheckoutRouteSource = readFileSync(
    resolve(process.cwd(), "app/api/stripe/embedded-checkout/route.ts"),
    "utf8"
  );

  it("guards embedded checkout from duplicate opens while a request or session is already active", () => {
    expect(checkoutModalSource).toContain("const isOpeningRef = useRef(false);");
    expect(checkoutModalSource).toContain(
      "if (isOpeningRef.current || state.loading || state.clientSecret) {"
    );
    expect(checkoutModalSource).toContain("isOpeningRef.current = true;");
    expect(checkoutModalSource).toContain("isOpeningRef.current = false;");
  });

  it("uses normal Premium checkout instead of a separate legacy trial button on the create page", () => {
    const checkoutButtonMatches = createPageSource.match(/<PremiumCheckoutButton/g) ?? [];
    expect(checkoutButtonMatches).toHaveLength(1);
    expect(createPageSource).not.toContain("StartTrialButton");
    expect(createPageSource).not.toContain("Start 7-Day Trial");
  });

  it("opens batch purchase mode from pricing pack links", () => {
    expect(createPageSource).toContain('searchParams.get("batchMode") === "1"');
    expect(createPageSource).toContain('searchParams.get("batchMode") === "true"');
    expect(createPageSource).toContain("setBatchMode(true);");
  });

  it("tracks purchaseType for standard subscription checkouts", () => {
    expect(embeddedCheckoutRouteSource).toContain('purchaseType: "subscription"');
    expect(embeddedCheckoutRouteSource).toContain("trial_period_days: PREMIUM_TRIAL_DAYS");
    expect(embeddedCheckoutRouteSource).toContain('payment_method_collection: "always"');
    expect(checkoutModalSource).not.toContain('purchaseType === "trial"');
    expect(checkoutModalSource).not.toContain('purchaseType: "trial"');
  });

  it("loads Stripe.js only after checkout is opened", () => {
    expect(checkoutModalSource).not.toContain("const stripePromise = loadStripe");
    expect(checkoutModalSource).toContain('@stripe/stripe-js/pure');
    expect(checkoutModalSource).toContain("const getStripe = useCallback");
    expect(checkoutModalSource).toContain("stripePromiseRef.current = loadStripe");
    expect(checkoutModalSource).toContain("Checkout could not load. Please disable script blockers or try again.");
  });

  it("sanitizes embedded checkout return paths before passing them to Stripe", () => {
    expect(embeddedCheckoutRouteSource).toContain("function sanitizeReturnPath");
    expect(embeddedCheckoutRouteSource).toContain('path.startsWith("//")');
    expect(embeddedCheckoutRouteSource).toContain("function buildReturnUrl");
    expect(embeddedCheckoutRouteSource).toContain("session_id={CHECKOUT_SESSION_ID}");
  });

  it("lets free users open dashboard profile tools without checkout", () => {
    expect(dashboardLayoutSource).not.toContain("hasPremiumAccess(user)");
    expect(dashboardLayoutSource).not.toContain('redirect("/activate?from=dashboard")');
    expect(activatePageSource).toContain("<AccountPendingCheckoutGate");
    expect(accountPendingGateSource).toContain("Account pending checkout");
    expect(accountPendingGateSource).toContain('successPath="/dashboard"');
  });

  it("keeps the create paywall escape in anonymous draft mode instead of dashboard bypass", () => {
    expect(createPageSource).toContain("const isPremiumGateActive = Boolean");
    expect(createPageSource).toContain("{editorUnlocked && (");
    expect(createPageSource).toContain("continueAnonymousDraft");
    expect(createPageSource).toContain('signOut({ callbackUrl: "/create" })');
    expect(createPageSource).toContain("Keep drafting without saving");
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
