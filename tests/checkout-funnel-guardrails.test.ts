import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("checkout funnel guardrails", () => {
  const checkoutModalSource = readFileSync(resolve(process.cwd(), "components/CheckoutModal.tsx"), "utf8");
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
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

  it("uses normal Premium checkout instead of a 7-day trial button on the create page", () => {
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
    expect(embeddedCheckoutRouteSource).not.toContain("trial_period_days");
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
});
