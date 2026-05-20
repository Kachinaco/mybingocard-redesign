import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const routeSource = readSource("app/api/generate-cells/route.ts");
const componentSource = readSource("components/AiGenerateSection.tsx");

describe("free AI generation access", () => {
  test("does not require Premium before generating cells", () => {
    expect(routeSource).not.toContain('if (user.planType !== "PREMIUM")');
    expect(routeSource).not.toContain('Premium required');
    expect(routeSource).not.toContain('Sign in required');
    expect(routeSource).toContain("const FREE_DAILY_LIMIT");
    expect(routeSource).toContain("getAnonymousQuotaKey");
    expect(routeSource).toContain("anonymous_limited");
    expect(routeSource).toContain("ai_generate_quota_exceeded");
    expect(routeSource).toContain("Free AI limit reached");
  });

  test("free users are allowed through the client AI button", () => {
    expect(componentSource).not.toContain("ai_generate_gated");
    expect(componentSource).not.toContain("Upgrade to Premium to unlock AI generation");
    expect(componentSource).toContain("Free visitors include a daily AI generation limit.");
    expect(componentSource).toContain("Generate Cells");
  });
});
