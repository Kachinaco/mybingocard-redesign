import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("batch generation image upload guard", () => {
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");

  test("uploads temporary data-url images before posting to batch generation", () => {
    expect(createPageSource).toContain("cellsToBatch = await uploadDataUrlImages(cellsToBatch);");
  });
});
