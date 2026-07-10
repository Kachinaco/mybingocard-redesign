import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Google indexing guidance implementation", () => {
  test("the homepage contextually promotes the demand-backed conference guide", () => {
    const source = read("app/page.tsx");
    expect(source).toContain('href="/conference-bingo"');
    expect(source).toContain("conference bingo planning guide");
  });

  test("the bingo game hub links by real play mode instead of a flat keyword list", () => {
    const source = read("app/bingo-games/page.tsx");
    expect(source).toContain("Choose a game by how people will play");
    for (const href of [
      "/conference-bingo",
      "/classroom-bingo",
      "/music-bingo",
      "/icebreaker-bingo",
      "/team-building-bingo",
      "/training-bingo",
      "/vocabulary-bingo-generator",
    ]) {
      expect(source).toContain(`href: "${href}"`);
    }
  });

  test("conference bingo has a distinct planning field guide and privacy checklist", () => {
    const data = read("lib/seo-landing-pages.ts");
    const component = read("components/SeoLandingPage.tsx");

    expect(data).toContain('"conference-bingo": {');
    expect(data).toContain("Plan the conference game around one clear outcome");
    expect(data).toContain("Remove any task that pressures an attendee to disclose personal information");
    expect(data).toContain('href: "/icebreaker-bingo"');
    expect(data).toContain('href: "/training-bingo"');
    expect(component).toContain("Event planning field guide");
    expect(component).toContain("page.planningGuide.tracks.map");
    expect(component).toContain("page.planningGuide.checklist.map");
  });
});
