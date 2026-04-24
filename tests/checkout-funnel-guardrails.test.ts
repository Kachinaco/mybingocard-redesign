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

  it("only renders one StartTrialButton on the create page", () => {
    const trialButtonMatches = createPageSource.match(/<StartTrialButton/g) ?? [];
    expect(trialButtonMatches).toHaveLength(1);
  });

  it("tracks purchaseType for standard subscription checkouts", () => {
    expect(embeddedCheckoutRouteSource).toContain('purchaseType: "subscription"');
  });
});
