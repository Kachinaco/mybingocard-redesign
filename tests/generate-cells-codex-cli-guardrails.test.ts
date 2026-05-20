import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("codex CLI generation guardrails", () => {
  const helperSource = readFileSync(resolve(process.cwd(), "lib/ai-generation.ts"), "utf8");

  test("does not rely on Codex output-last-message files", () => {
    expect(helperSource).not.toContain("--output-last-message");
    expect(helperSource).not.toContain('"-o"');
    expect(helperSource).not.toContain("outputPath");
  });
});
