import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Facebook page links", () => {
  const socialLinksSource = readSource("lib/social-links.ts");
  const mobileNavSource = readSource("components/MobileNav.tsx");
  const settingsSource = readSource("app/settings/page.tsx");
  const layoutSource = readSource("app/layout.tsx");
  const homeSource = readSource("app/page.tsx");
  const dashboardSource = readSource("app/dashboard/page.tsx");

  test("uses one configurable public Facebook page URL", () => {
    expect(socialLinksSource).toContain("NEXT_PUBLIC_FACEBOOK_PAGE_URL");
    expect(socialLinksSource).toContain("https://www.facebook.com/profile.php?id=61590006862344");
  });

  test("surfaces Facebook from the public site and logged-in app", () => {
    expect(mobileNavSource).toContain("facebook_page_clicked");
    expect(settingsSource).toContain("Follow on Facebook");
    expect(homeSource).toContain("FACEBOOK_PAGE_URL");
    expect(dashboardSource).toContain("FACEBOOK_PAGE_URL");
  });

  test("adds Facebook to structured sameAs data", () => {
    expect(layoutSource).toContain("FACEBOOK_PAGE_URL");
    expect(layoutSource).toContain('"sameAs"');
  });
});
