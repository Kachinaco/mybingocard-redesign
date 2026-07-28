import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const widths = [320, 360, 375, 389, 390, 391, 414, 430];
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = join(root, "evidence", "approval-a");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome,
  args: ["--no-first-run", "--disable-background-networking", "--disable-sync"],
});

const results: Array<Record<string, unknown>> = [];

async function createIsolatedPage(width: number) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    const local = url.protocol === "file:" || ["127.0.0.1", "localhost"].includes(url.hostname);
    const blockedPath = url.pathname.startsWith("/api/") || url.pathname.startsWith("/t/");
    const safeMethod = ["GET", "HEAD"].includes(request.method());
    if (!local || blockedPath || !safeMethod) request.abort();
    else request.continue();
  });
  return page;
}

async function screenshotElement(page: Awaited<ReturnType<typeof createIsolatedPage>>, selector: string, path: string) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Missing screenshot element: ${selector}`);
  await element.screenshot({ path });
}

for (const width of widths) {
  const home = await createIsolatedPage(width);
  const homeResponse = await home.goto("http://127.0.0.1:3100/", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const homeMeasurement = await home.evaluate(() => {
    const round = (value: number) => Math.round(value * 10) / 10;
    const rectFor = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: round(rect.top),
        bottom: round(rect.bottom),
        left: round(rect.left),
        right: round(rect.right),
        width: round(rect.width),
        height: round(rect.height),
      };
    };
    const visible = (element: Element | null) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const viewport = document.documentElement.clientWidth;
    const header = document.querySelector("header");
    const createAction = header?.querySelector('a[aria-label="Create a bingo card"]') ?? null;
    const wordmark = [...(header?.querySelectorAll("span") ?? [])].find((element) => element.textContent?.trim() === "MyBingoCard") ?? null;
    const emailButton = [...document.querySelectorAll("button")].find((element) => element.textContent?.includes("Get Free Templates")) ?? null;
    const emailForm = emailButton?.closest("form") ?? null;
    const emailInput = emailForm?.querySelector('input[type="email"]') ?? null;
    const appStoreLink = [...document.querySelectorAll('a[aria-label="Download MyBingoCard on the App Store"]')].find(visible) ?? null;
    const demoLabel = [...document.querySelectorAll("p")].find((element) => element.textContent?.trim() === "Wedding Edition") ?? null;
    const headerOverflow = [...(header?.querySelectorAll("a,button,span,svg") ?? [])]
      .filter(visible)
      .map((element) => ({ text: element.textContent?.trim() || element.getAttribute("aria-label") || element.tagName, rect: rectFor(element) }))
      .filter((item) => item.rect && (item.rect.left < -0.5 || item.rect.right > viewport + 0.5));

    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      header: rectFor(header),
      headerOverflow,
      createAction: {
        visible: visible(createAction),
        href: createAction?.getAttribute("href") ?? null,
        rect: rectFor(createAction),
      },
      wordmarkVisible: visible(wordmark),
      emailCapture: {
        flexDirection: emailForm ? window.getComputedStyle(emailForm).flexDirection : null,
        form: rectFor(emailForm),
        input: rectFor(emailInput),
        button: rectFor(emailButton),
      },
      productOrder: {
        demoLabel: rectFor(demoLabel),
        appStoreLink: rectFor(appStoreLink),
      },
    };
  });

  await screenshotElement(home, "main > section", join(evidenceDir, `homepage-hero-${width}.png`));
  const emailCard = (await home.evaluateHandle(() => {
    const button = [...document.querySelectorAll("button")].find((element) => element.textContent?.includes("Get Free Templates"));
    return button?.closest("div.bg-gradient-to-br") ?? null;
  })).asElement();
  if (!emailCard) throw new Error(`Missing email capture card at ${width}px`);
  await emailCard.screenshot({ path: join(evidenceDir, `email-capture-${width}.png`) });

  const homeCreate = homeMeasurement.createAction as { visible: boolean; href: string | null; rect: { left: number; right: number } | null };
  const emailCapture = homeMeasurement.emailCapture as {
    flexDirection: string | null;
    input: { left: number; right: number } | null;
    button: { left: number; right: number } | null;
  };
  const productOrder = homeMeasurement.productOrder as {
    demoLabel: { top: number } | null;
    appStoreLink: { top: number } | null;
  };
  if (homeResponse?.status() !== 200) throw new Error(`Homepage returned ${homeResponse?.status()} at ${width}px`);
  if (!homeCreate.visible || homeCreate.href !== "/create" || !homeCreate.rect || homeCreate.rect.left < 0 || homeCreate.rect.right > width) {
    throw new Error(`Shared mobile create action failed at ${width}px`);
  }
  if ((homeMeasurement.headerOverflow as unknown[]).length > 0) throw new Error(`Shared header overflowed at ${width}px`);
  if (emailCapture.flexDirection !== "column") throw new Error(`Email form did not stack at ${width}px`);
  for (const [name, rect] of [["input", emailCapture.input], ["button", emailCapture.button]] as const) {
    if (!rect || rect.left < 0 || rect.right > width) throw new Error(`Email ${name} overflowed at ${width}px`);
  }
  if (!productOrder.demoLabel || !productOrder.appStoreLink || productOrder.appStoreLink.top <= productOrder.demoLabel.top) {
    throw new Error(`App Store promo did not follow the product mockup at ${width}px`);
  }
  if (homeMeasurement.wordmarkVisible !== (width >= 390)) throw new Error(`Shared wordmark breakpoint failed at ${width}px`);

  results.push({ page: "homepage", width, status: homeResponse?.status() ?? null, ...homeMeasurement });
  await home.close();

  const seo = await createIsolatedPage(width);
  const seoResponse = await seo.goto("http://127.0.0.1:3100/bingo-board-generator", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 750));
  const seoMeasurement = await seo.evaluate(() => {
    const round = (value: number) => Math.round(value * 10) / 10;
    const rectFor = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: round(rect.left), right: round(rect.right), top: round(rect.top), bottom: round(rect.bottom), width: round(rect.width), height: round(rect.height) };
    };
    const visible = (element: Element | null) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const viewport = document.documentElement.clientWidth;
    const header = document.querySelector("header");
    const createAction = [...(header?.querySelectorAll("a") ?? [])].find((element) => element.textContent?.trim() === "Create Card") ?? null;
    const wordmark = [...(header?.querySelectorAll("span") ?? [])].find((element) => element.textContent?.trim() === "MyBingoCard") ?? null;
    const headerOverflow = [...(header?.querySelectorAll("a,span,svg") ?? [])]
      .filter(visible)
      .map((element) => ({ text: element.textContent?.trim() || element.tagName, rect: rectFor(element) }))
      .filter((item) => item.rect && (item.rect.left < -0.5 || item.rect.right > viewport + 0.5));
    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      header: rectFor(header),
      headerOverflow,
      createAction: {
        visible: visible(createAction),
        href: createAction?.getAttribute("href") ?? null,
        rect: rectFor(createAction),
      },
      wordmarkVisible: visible(wordmark),
    };
  });
  await screenshotElement(seo, "header", join(evidenceDir, `seo-header-${width}.png`));

  const seoCreate = seoMeasurement.createAction as { visible: boolean; href: string | null; rect: { left: number; right: number } | null };
  if (seoResponse?.status() !== 200) throw new Error(`SEO landing returned ${seoResponse?.status()} at ${width}px`);
  if (!seoCreate.visible || !seoCreate.href?.startsWith("/create?") || !seoCreate.href.includes("templateId=seo-bingo-board-generator")) {
    throw new Error(`SEO mobile create action lost context at ${width}px`);
  }
  if (!seoCreate.rect || seoCreate.rect.left < 0 || seoCreate.rect.right > width) throw new Error(`SEO mobile create action overflowed at ${width}px`);
  if (seoMeasurement.headerOverflow.length > 0) throw new Error(`SEO header overflowed at ${width}px`);
  if (seoMeasurement.wordmarkVisible !== (width >= 390)) throw new Error(`SEO wordmark breakpoint failed at ${width}px`);

  results.push({ page: "seo-landing", width, status: seoResponse?.status() ?? null, ...seoMeasurement });
  await seo.close();
}

const output = {
  generatedAt: new Date().toISOString(),
  networkPolicy: "Only localhost/file GET/HEAD requests allowed; all API, tracker, non-local, and mutating requests aborted.",
  widths,
  results,
};
writeFileSync(join(evidenceDir, "viewport-check.json"), `${JSON.stringify(output, null, 2)}\n`);

await browser.close();
console.log(JSON.stringify({
  widths,
  checks: results.length,
  screenshots: widths.length * 3,
  failures: 0,
}, null, 2));
