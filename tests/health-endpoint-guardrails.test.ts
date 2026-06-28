import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("health endpoint guardrails", () => {
  const routePath = resolve(process.cwd(), "app/api/health/route.ts");

  test("exposes a lightweight public health endpoint", () => {
    expect(existsSync(routePath)).toBe(true);
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain("export async function GET()");
    expect(source).toContain('service: "mybingocard"');
    expect(source).toContain("ok: true");
    expect(source).toContain('dynamic = "force-dynamic"');
  });

  test("does not depend on auth, databases, secrets, or paid providers", () => {
    const source = readFileSync(routePath, "utf8");

    expect(source).not.toContain("auth(");
    expect(source).not.toContain("requireAdmin");
    expect(source).not.toContain("clientPromise");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("ANTHROPIC");
    expect(source).not.toContain("OPENAI");
    expect(source).not.toContain("GEMINI");
  });
});
