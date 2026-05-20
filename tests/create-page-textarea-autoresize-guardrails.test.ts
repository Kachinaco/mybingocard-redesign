import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("create page textarea autoresize guardrails", () => {
  const source = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");

  test("recalculates textarea heights after programmatic cell updates like AI autofill", () => {
    expect(source).toContain("const cellTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);");
    expect(source).toContain("cellTextareaRefs.current.forEach((textarea) => {");
    expect(source).toContain("textarea.style.height = \"auto\";");
    expect(source).toContain("textarea.style.height = textarea.scrollHeight + \"px\";");
  });
});
