import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("mobile create-entry guardrails", () => {
  const mobileNavSource = readSource("components/MobileNav.tsx");
  const seoLandingSource = readSource("components/SeoLandingPage.tsx");
  const emailCaptureSource = readSource("components/EmailCapture.tsx");
  const homeSource = readSource("app/page.tsx");

  test("shared mobile navigation keeps creation visible while the drawer is closed", () => {
    expect(mobileNavSource).toContain('href="/create"\n            aria-label="Create a bingo card"');
    expect(mobileNavSource).toContain('{isLoggedIn ? "New Card" : "Make Card"}');
    expect(mobileNavSource).toContain('hidden min-[390px]:inline truncate');
    expect(mobileNavSource).toContain('className="md:hidden flex shrink-0 items-center gap-2"');
  });

  test("SEO landing headers expose their contextual creator link on mobile", () => {
    expect(seoLandingSource).toContain('href={createHref}\n          className="md:hidden');
    expect(seoLandingSource).toContain("Create Card");
    expect(seoLandingSource).toContain('hidden min-[390px]:inline truncate');
    expect(seoLandingSource).toContain('href={createHref} className="bg-slate-900');
  });

  test("homepage email capture stacks controls before the sm breakpoint", () => {
    expect(emailCaptureSource).toContain('className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"');
    expect(emailCaptureSource).toContain('className="min-w-0 w-full flex-1');
    expect(emailCaptureSource).toContain('whitespace-nowrap sm:w-auto');
  });

  test("homepage shows the product mockup before the App Store promo on mobile", () => {
    const desktopPromo = homeSource.indexOf('<HomeAppStorePromo className="hidden lg:flex" />');
    const mockup = homeSource.indexOf("<BingoCardDemo />");
    const mobilePromo = homeSource.indexOf('<HomeAppStorePromo className="lg:hidden" />');

    expect(desktopPromo).toBeGreaterThan(-1);
    expect(mockup).toBeGreaterThan(desktopPromo);
    expect(mobilePromo).toBeGreaterThan(mockup);
  });
});
