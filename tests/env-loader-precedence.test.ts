import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("script environment loader precedence", () => {
  test("explicitly present environment keys are never replaced by .env.local", () => {
    const scriptsDir = resolve(process.cwd(), "scripts");
    const loaders = readdirSync(scriptsDir)
      .filter((name) => /\.(?:cjs|mjs|js)$/.test(name))
      .map((name) => ({ name, source: readFileSync(resolve(scriptsDir, name), "utf8") }))
      .filter(({ source }) => source.includes(".env.local"));

    expect(loaders.length).toBeGreaterThan(0);
    for (const { name, source } of loaders) {
      expect(source, `${name} must preserve an explicitly blank env value`).toContain(
        "Object.prototype.hasOwnProperty.call(process.env"
      );
      expect(source, `${name} must not use truthiness for env precedence`).not.toMatch(
        /if\s*\(\s*(?:[^)]*&&\s*)?!process\.env\s*\[[^\]]+\]/
      );
    }
  });
});
