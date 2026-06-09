import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("App Store dashboard link", () => {
  const socialLinksSource = readSource("lib/social-links.ts");
  const homeSource = readSource("app/page.tsx");
  const dashboardSource = readSource("app/dashboard/page.tsx");
  const badgeSource = readSource("public/badges/download-on-the-app-store.svg");

  test("keeps the iOS App Store URL configurable", () => {
    expect(socialLinksSource).toContain("NEXT_PUBLIC_IOS_APP_STORE_URL");
    expect(socialLinksSource).toContain("https://apps.apple.com/us/app/my-bingo-card/id6736476714");
  });

  test("surfaces the official App Store badge on the user dashboard", () => {
    expect(dashboardSource).toContain("IOS_APP_STORE_URL");
    expect(dashboardSource).toContain("/badges/download-on-the-app-store.svg");
    expect(dashboardSource).toContain("Download on the App Store");
    expect(badgeSource).toContain("Download_on_the_App_Store_Badge_US-UK_RGB_blk_4SVG_092917");
  });

  test("surfaces the official App Store badge on the landing page", () => {
    expect(homeSource).toContain("IOS_APP_STORE_URL");
    expect(homeSource).toContain("Also available for iPhone");
    expect(homeSource).toContain("/badges/download-on-the-app-store.svg");
    expect(homeSource).toContain("Download on the App Store");
  });
});
