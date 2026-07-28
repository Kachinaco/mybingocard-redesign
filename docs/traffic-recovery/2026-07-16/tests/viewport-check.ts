import puppeteer from "puppeteer";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = join(root, "evidence");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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

async function measure(label: string, url: string, width: number, screenshot: string) {
  const page = await createIsolatedPage(width);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  const measurement = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const all = [...document.querySelectorAll("body *")];
    const overflowing = all
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
        return {
          tag: element.tagName,
          className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
          text,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
        };
      })
      .filter((item) => item.width > 0 && (item.left < -0.5 || item.right > viewport + 0.5))
      .slice(0, 40);
    const header = document.querySelector("header");
    const requiredActions = [...document.querySelectorAll("a,button")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 80),
          visible: rect.width > 0 && rect.height > 0,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
        };
      })
      .filter((item) => item.visible);
    return {
      title: document.title,
      innerWidth: window.innerWidth,
      clientWidth: viewport,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      headerRect: header?.getBoundingClientRect().toJSON() ?? null,
      overflowing,
      visibleActions: requiredActions.slice(0, 30),
    };
  });
  await page.screenshot({ path: join(evidenceDir, screenshot), fullPage: false });
  if (label === "homepage-390") {
    const capture = (await page.evaluateHandle(() => {
      const button = [...document.querySelectorAll("button")].find((element) => element.textContent?.includes("Get Free Templates"));
      return button?.closest("div.bg-gradient-to-br") ?? null;
    })).asElement();
    await capture?.screenshot({ path: join(evidenceDir, "homepage-390-email-capture.png") });
  }
  results.push({ label, url, width, status: response?.status() ?? null, ...measurement });
  await page.close();
}

const mockupUrl = pathToFileURL(join(root, "mockups", "cta-mobile-mockups.html")).href;
await measure("mockup", mockupUrl, 390, "mockup-390.png");
for (const width of [389, 390, 391]) {
  await measure(`create-${width}`, "http://127.0.0.1:3100/create", width, `create-${width}.png`);
}
await measure("homepage-390", "http://127.0.0.1:3100/", 390, "homepage-390.png");

writeFileSync(join(evidenceDir, "viewport-check.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  networkPolicy: "Only localhost/file GET/HEAD requests allowed; all API, tracker, non-local, and mutating requests aborted.",
  results,
}, null, 2)}\n`);

await browser.close();
console.log(JSON.stringify(results.map(({ label, status, clientWidth, scrollWidth, overflowing }) => ({
  label,
  status,
  clientWidth,
  scrollWidth,
  overflowCount: Array.isArray(overflowing) ? overflowing.length : null,
})), null, 2));
