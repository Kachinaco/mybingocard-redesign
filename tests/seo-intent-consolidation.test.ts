import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import nextConfig from "../next.config";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function publicSourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) return publicSourceFiles(fullPath);
    return [".ts", ".tsx", ".js", ".cjs", ".txt", ".xml"].includes(extname(entry.name))
      ? [fullPath]
      : [];
  });
}

describe("generic bingo maker search intent", () => {
  test("permanently redirects the retired duplicate to the homepage", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toContainEqual({
      source: "/bingo-card-maker",
      destination: "/",
      permanent: true,
    });
    expect(existsSync(join(root, "app/bingo-card-maker/page.tsx"))).toBe(false);
  });

  test("assigns one distinct intent to each surviving page", () => {
    const homepage = source("app/page.tsx");
    const creator = source("app/create/layout.tsx");
    const comparison = source("app/blog/best-bingo-card-generator/page.tsx");

    expect(homepage).toContain("Bingo Card Maker & Generator for Printable and Online Cards | MyBingoCard");
    expect(homepage).toContain("Bingo Card Maker and Generator</span> for Printable and Online Cards");
    expect(homepage).toContain('canonical: "https://mybingocard.com"');
    expect(creator).toContain("Create a Bingo Card Online | MyBingoCard");
    expect(source("app/create/page.tsx")).toContain("Create Bingo Cards Online");
    expect(creator).toContain('canonical: "https://mybingocard.com/create"');
    expect(comparison).toContain("How to Choose the Best Bingo Card Generator (2026 Guide)");
    expect(comparison).toContain('canonical: "https://mybingocard.com/blog/best-bingo-card-generator"');
  });

  test("does not link or submit the redirecting URL internally", () => {
    const files = ["app", "components", "lib", "public", "scripts"]
      .flatMap((directory) => publicSourceFiles(join(root, directory)));
    const staleReferences = files
      .filter((file) => readFileSync(file, "utf8").includes("/bingo-card-maker"))
      .map((file) => file.slice(root.length + 1));

    expect(staleReferences).toEqual([]);
    expect(source("public/sitemap.xml")).not.toContain("https://mybingocard.com/bingo-card-maker");
    expect(source("public/llms.txt")).toContain("- Free bingo card maker: https://mybingocard.com/");
  });
});
