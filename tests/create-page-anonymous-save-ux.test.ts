import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("create page anonymous save UX", () => {
  const source = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");

  test("does not show a separate oversized signup nudge in the sticky bottom bar", () => {
    expect(source).not.toContain("Free to create — no credit card needed");
    expect(source).not.toContain('t("btn.signup_to_save")');
    expect(source).not.toContain('t("btn.signup_to_save_full")');
    expect(source).toContain(': "Save Card"');
    expect(source).toContain(': "Save"');
  });
});
