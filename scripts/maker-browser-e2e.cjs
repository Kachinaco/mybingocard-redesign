#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");
const SQLite = require("better-sqlite3");
const { EJSON } = require("bson");
const sharp = require("sharp");
const {
  PASSWORD,
  createFixture,
  getFreePort,
  waitForServer,
} = require("./sqlite-runtime-smoke.cjs");

const ROOT = path.resolve(__dirname, "..");
const TEST_EMAIL = "sqlite-smoke-user@example.com";
const TELEMETRY_PATHS = new Set([
  "/api/activity",
  "/api/track-visitor",
  "/t/api/track",
  "/t/tracker.js",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function chromiumPath() {
  for (const key of ["PUPPETEER_EXECUTABLE_PATH", "GOOGLE_CHROME_BIN", "CHROME_BIN"]) {
    const configuredPath = process.env[key]?.trim();
    if (configuredPath && fs.existsSync(configuredPath)) return configuredPath;
  }

  const platformDefault = process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : process.platform === "linux"
      ? "/usr/bin/google-chrome"
      : null;
  if (platformDefault && fs.existsSync(platformDefault)) return platformDefault;

  try {
    const bundledPath = puppeteer.executablePath();
    if (bundledPath && fs.existsSync(bundledPath)) return bundledPath;
  } catch {
    // The assertion in run() provides one actionable failure message.
  }

  return undefined;
}

function assertFreshBuild(buildId) {
  const buildMtime = fs.statSync(buildId).mtimeMs;
  const staleSources = [];
  const targets = [
    "app",
    "components",
    "lib",
    "public",
    "auth.ts",
    "bun.lock",
    "instrumentation.ts",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "postcss.config.mjs",
    "proxy.ts",
    "tailwind.config.ts",
    "tsconfig.json",
  ];

  const visit = (target) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
      return;
    }
    if (stat.mtimeMs > buildMtime) staleSources.push(path.relative(ROOT, target));
  };

  for (const target of targets) visit(path.join(ROOT, target));
  assert(
    staleSources.length === 0,
    `Stale .next build; rebuild after: ${staleSources.slice(0, 5).join(", ")}`,
  );
}

function promoteFixtureUser(dbPath, userId) {
  const db = new SQLite(dbPath);
  try {
    const row = db
      .prepare("SELECT ejson FROM documents WHERE collection = 'users' AND object_id = ?")
      .get(userId);
    assert(row?.ejson, "Could not find the E2E user in the SQLite fixture");
    const user = EJSON.parse(row.ejson, { relaxed: false });
    user.planType = "PREMIUM";
    user.subscriptionStatus = "active";
    user.updatedAt = new Date();
    db.prepare(
      "UPDATE documents SET ejson = ? WHERE collection = 'users' AND object_id = ?",
    ).run(EJSON.stringify(user, { relaxed: false }), userId);
  } finally {
    db.close();
  }
}

async function visibleTextButton(page, text) {
  const handle = await page.evaluateHandle((wanted) => {
    return [...document.querySelectorAll("button")].find((button) => {
      const rect = button.getBoundingClientRect();
      return (
        button.textContent?.replace(/\s+/g, " ").trim().includes(wanted) &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) || null;
  }, text);
  const element = handle.asElement();
  assert(element, `Missing visible button containing: ${text}`);
  return element;
}

async function clickVisibleButton(page, text) {
  const element = await visibleTextButton(page, text);
  await element.click();
  await element.dispose();
}

async function replaceValue(page, selector, value) {
  await page.waitForSelector(selector, { visible: true });
  await page.$eval(
    selector,
    (element, nextValue) => {
      element.focus();
      const setter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

async function waitForPath(page, paths, timeout = 30_000) {
  await page.waitForFunction(
    (expected) => expected.includes(window.location.pathname),
    { timeout },
    paths,
  );
}

async function run() {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  assert(fs.existsSync(buildId), "Missing .next build. Run bun run build first.");
  assertFreshBuild(buildId);
  const browserExecutablePath = chromiumPath();
  assert(browserExecutablePath, "No Chrome/Chromium executable found for the Maker E2E.");

  const fixture = createFixture({ seedSharedCard: false });
  const port = Number(process.env.MYBINGOCARD_E2E_PORT || await getFreePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = process.env.MYBINGOCARD_E2E_OUTPUT_DIR ||
    path.join("/tmp", `mybingocard-maker-e2e-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const nextBin = path.join(ROOT, "node_modules", ".bin", "next");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_APP_URL: baseUrl,
    NEXTAUTH_URL: baseUrl,
    AUTH_URL: baseUrl,
    NEXTAUTH_SECRET: "maker-browser-e2e-nextauth-secret",
    AUTH_SECRET: "maker-browser-e2e-nextauth-secret",
    AUTH_TRUST_HOST: "true",
    AUTH_GOOGLE_ID: "maker-browser-e2e-google-id",
    AUTH_GOOGLE_SECRET: "maker-browser-e2e-google-secret",
    AUTH_APPLE_ID: "",
    AUTH_APPLE_SECRET: "",
    MYBINGOCARD_DB_BACKEND: "sqlite",
    MYBINGOCARD_SQLITE_PATH: fixture.dbPath,
    MYBINGOCARD_UPLOAD_BASE: path.join(fixture.dir, "uploads"),
    STRIPE_SECRET_KEY: "sk_test_maker_browser_e2e",
    STRIPE_WEBHOOK_SECRET: "whsec_maker_browser_e2e",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_maker_browser_e2e",
    EMAIL_FROM: "support@mybingocard.com",
    EMAIL_SERVER_HOST: "",
    EMAIL_SERVER_PORT: "",
    EMAIL_SERVER_USER: "",
    EMAIL_SERVER_PASSWORD: "",
    MYBINGOCARD_EMAIL_SENDS_DISABLED: "1",
    DISCORD_WEBHOOK_URL: "",
    MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
    MYBINGOCARD_SIGNUPS_WEBHOOK_URL: "",
    MYBINGOCARD_VISITORS_WEBHOOK_URL: "",
    MYBINGOCARD_ERRORS_WEBHOOK_URL: "",
    VISITOR_TRACK_UPSTREAM: "http://127.0.0.1:9",
    META_PIXEL_ID: "",
    NEXT_PUBLIC_META_PIXEL_ID: "",
    META_CONVERSIONS_ACCESS_TOKEN: "",
    PUPPETEER_EXECUTABLE_PATH: browserExecutablePath,
  };

  const server = spawn(nextBin, ["start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

  let browser;
  const checks = [];
  const appIssues = [];
  const blockedTelemetry = new Set();
  const blockedThirdParty = new Set();

  try {
    await waitForServer(baseUrl, server);
    browser = await puppeteer.launch({
      executablePath: browserExecutablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith(baseUrl)) {
        const pathname = new URL(url).pathname;
        if (TELEMETRY_PATHS.has(pathname)) {
          blockedTelemetry.add(pathname);
          request.abort();
          return;
        }
      }
      if (
        url.startsWith(baseUrl) ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url === "about:blank"
      ) {
        request.continue();
      } else {
        blockedThirdParty.add(new URL(url).host || url);
        request.abort();
      }
    });
    page.on("pageerror", (error) => appIssues.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (/ERR_FAILED|Failed to load resource/.test(text)) return;
      appIssues.push(`console: ${text}`);
    });
    page.on("response", (response) => {
      if (!response.url().startsWith(baseUrl) || response.status() < 400) return;
      const request = response.request();
      const pathname = new URL(response.url()).pathname;
      if (request.method() === "POST" && pathname === "/api/cards" && response.status() === 403) {
        return;
      }
      appIssues.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (!url.startsWith(baseUrl)) return;
      const pathname = new URL(url).pathname;
      if (TELEMETRY_PATHS.has(pathname)) return;
      if (request.failure()?.errorText === "net::ERR_ABORTED" && new URL(url).searchParams.has("_rsc")) {
        return;
      }
      appIssues.push(`request failed: ${request.method()} ${url} (${request.failure()?.errorText || "unknown"})`);
    });

    let response = await page.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    assert(response?.status() === 200, `Home returned ${response?.status()}`);
    const homeHeading = await page.$eval("h1", (element) => element.textContent || "");
    assert(/Bingo Card Maker/i.test(homeHeading), `Unexpected home heading: ${homeHeading}`);
    checks.push("home_to_maker_entry");

    response = await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle0", timeout: 60_000 });
    assert(response?.status() === 200, `/create returned ${response?.status()}`);
    await page.waitForSelector('input[placeholder="e.g., Wedding Bingo"]', { visible: true });
    await replaceValue(page, 'input[placeholder="e.g., Wedding Bingo"]', "Maker Browser E2E Card");
    const cellSelectors = ["1", "2", "3", "4", "6", "7"];
    for (const [index, placeholder] of cellSelectors.entries()) {
      await replaceValue(page, `textarea[placeholder="${placeholder}"]`, `E2E cell ${index + 1}`);
    }
    const desktopLayout = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      editTop: [...document.querySelectorAll("h2")]
        .find((heading) => heading.textContent?.includes("Edit Content"))
        ?.getBoundingClientRect().top ?? null,
    }));
    assert(desktopLayout.horizontalOverflow <= 1, `Desktop overflow was ${desktopLayout.horizontalOverflow}px`);
    await page.screenshot({ path: path.join(outputDir, "01-create-desktop.png"), fullPage: true });
    checks.push("create_text_draft_desktop_layout");

    await clickVisibleButton(page, "Save This Card Free");
    await page.waitForFunction(() => document.body.innerText.includes("Save your card"));
    const savedDraft = await page.evaluate(() => {
      const raw = localStorage.getItem("mybingo_card_draft");
      return raw ? JSON.parse(raw) : null;
    });
    assert(savedDraft?.title === "Maker Browser E2E Card", "Anonymous save did not persist the draft");
    assert(savedDraft?.cells?.some((cell) => cell === "E2E cell 1"), "Draft cells were not persisted");
    await page.screenshot({ path: path.join(outputDir, "02-anonymous-save-gate.png"), fullPage: true });
    checks.push("anonymous_save_gate_and_draft_persistence");

    const signInHref = await page.$eval(
      'a[href="/login?callbackUrl=/create"]',
      (link) => link.getAttribute("href"),
    );
    assert(signInHref === "/login?callbackUrl=/create", "Save gate sign-in link was incorrect");
    response = await page.goto(`${baseUrl}${signInHref}`, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    assert(response?.status() === 200, `/login returned ${response?.status()}`);
    await replaceValue(page, "#email", TEST_EMAIL);
    await replaceValue(page, "#password", PASSWORD);
    await clickVisibleButton(page, "Sign In");
    await waitForPath(page, ["/create", "/dashboard", "/cards"], 45_000);
    await page.waitForFunction(
      () => ["/dashboard", "/cards"].some((path) => window.location.pathname.startsWith(path)),
      { timeout: 45_000 },
    );
    checks.push("credentials_login_callback_and_pending_save");

    const cardsResult = await page.evaluate(async () => {
      const result = await fetch("/api/cards", { cache: "no-store" });
      return { status: result.status, body: await result.json() };
    });
    assert(cardsResult.status === 200, `Cards API returned ${cardsResult.status}`);
    const createdCard = cardsResult.body.cards?.find((card) => card.title === "Maker Browser E2E Card");
    assert(createdCard?._id, "Pending draft was not created after sign-in");
    const cardId = typeof createdCard._id === "string"
      ? createdCard._id
      : createdCard._id?.$oid || String(createdCard._id);

    response = await page.goto(`${baseUrl}/cards/${cardId}?created=1`, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    assert(response?.status() === 200, `Created card page returned ${response?.status()}`);
    await page.waitForSelector('button[aria-label$="not marked"]', { visible: true });
    const firstCell = await page.$('button[aria-label$="not marked"]');
    assert(firstCell, "Created card did not expose playable cells");
    await firstCell.click();
    await page.waitForFunction(
      (element) => element?.getAttribute("aria-label")?.endsWith(" - marked"),
      {},
      firstCell,
    );
    await firstCell.click();
    await page.waitForFunction(
      (element) => element?.getAttribute("aria-label")?.endsWith(" - not marked"),
      {},
      firstCell,
    );
    await firstCell.click();
    await clickVisibleButton(page, "Reset");
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button[aria-label$="marked"]')]
        .every((button) => !button.getAttribute("aria-label")?.endsWith(" - marked"))
    );
    const markedCount = await page.$$eval('button[aria-label$="marked"]', (buttons) =>
      buttons.filter((button) => button.getAttribute("aria-label")?.endsWith(" - marked")).length
    );
    assert(markedCount === 0, `Reset left ${markedCount} marked cells`);
    await page.screenshot({ path: path.join(outputDir, "03-saved-card-solo-play.png"), fullPage: true });
    checks.push("saved_card_open_mark_unmark_reset");

    const exportResults = await page.evaluate(async (id) => {
      const run = async (kind) => {
        const result = await fetch(`/api/cards/${id}/export/${kind}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ grayscale: false, copies: 1 }),
        });
        const bytes = (await result.arrayBuffer()).byteLength;
        return { status: result.status, type: result.headers.get("content-type"), bytes };
      };
      return { pdf: await run("pdf"), png: await run("png") };
    }, cardId);
    assert(exportResults.pdf.status === 200, `PDF export returned ${exportResults.pdf.status}`);
    assert(exportResults.pdf.type?.includes("application/pdf"), `PDF type was ${exportResults.pdf.type}`);
    assert(exportResults.pdf.bytes > 1_000, `PDF export was only ${exportResults.pdf.bytes} bytes`);
    assert(exportResults.png.status === 200, `PNG export returned ${exportResults.png.status}`);
    assert(exportResults.png.type?.includes("image/png"), `PNG type was ${exportResults.png.type}`);
    assert(exportResults.png.bytes > 1_000, `PNG export was only ${exportResults.png.bytes} bytes`);
    checks.push("authenticated_pdf_and_png_exports");

    const freeLimit = await page.evaluate(async () => {
      const result = await fetch("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Second free card should be blocked",
          size: 3,
          cells: Array.from({ length: 9 }, (_, index) => `Cell ${index + 1}`),
          freeSpace: false,
          style: {},
        }),
      });
      return { status: result.status, body: await result.json() };
    });
    assert(freeLimit.status === 403, `Second free save returned ${freeLimit.status}`);
    assert(freeLimit.body.error?.includes("limit"), `Unexpected free limit error: ${freeLimit.body.error}`);
    checks.push("free_saved_card_limit");

    promoteFixtureUser(fixture.dbPath, fixture.ids.userId);
    const paidExportResults = await page.evaluate(async (id) => {
      const run = async (url, body) => {
        const result = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const bytes = (await result.arrayBuffer()).byteLength;
        return { status: result.status, type: result.headers.get("content-type"), bytes };
      };

      return {
        bulkPdf: await run(`/api/cards/${id}/export/bulk-pdf`, { count: 2 }),
        batchPdf: await run("/api/cards/batch/pdf", {
          cardIds: [id],
          grayscale: false,
          cardsPerPage: 1,
          showCutLines: true,
        }),
      };
    }, cardId);
    Object.assign(exportResults, paidExportResults);
    for (const [name, result] of Object.entries(paidExportResults)) {
      assert(result.status === 200, `${name} export returned ${result.status}`);
      assert(result.type?.includes("application/pdf"), `${name} type was ${result.type}`);
      assert(result.bytes > 1_000, `${name} export was only ${result.bytes} bytes`);
    }
    checks.push("authenticated_bulk_and_batch_pdf_exports");

    const magentaPng = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      },
    }).png().toBuffer();
    const privateImageFlow = await page.evaluate(async (pngBase64) => {
      const decodeBase64 = (value) => {
        const binary = atob(value);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
      };
      const encodeBase64 = (bytes) => {
        let binary = "";
        for (let index = 0; index < bytes.length; index += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        }
        return btoa(binary);
      };
      const readJson = async (response) => ({
        status: response.status,
        body: await response.json(),
      });
      const runExport = async (url, body, includePayload = false) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
          status: response.status,
          type: response.headers.get("content-type"),
          bytes: bytes.length,
          payloadBase64: includePayload ? encodeBase64(bytes) : undefined,
        };
      };

      const formData = new FormData();
      formData.append(
        "image",
        new File([decodeBase64(pngBase64)], "private-magenta.png", { type: "image/png" }),
      );
      const upload = await readJson(await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      }));
      if (upload.status !== 201) return { upload };

      const imageCell = `__IMG__:${JSON.stringify({
        imageId: upload.body.imageId,
        imageUrl: upload.body.imageUrl,
        label: "Private magenta upload",
        fit: "cover",
      })}`;
      const create = await readJson(await fetch("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Private Image Export E2E",
          size: 3,
          cells: [imageCell, "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"],
          freeSpace: false,
          style: {},
        }),
      }));
      if (create.status !== 201) return { upload, create };

      const idValue = create.body.card?._id;
      const cardId = typeof idValue === "string" ? idValue : idValue?.$oid || String(idValue);
      return {
        upload,
        create: { status: create.status, cardId },
        exports: {
          pdf: await runExport(`/api/cards/${cardId}/export/pdf`, { grayscale: false, copies: 1 }),
          png: await runExport(`/api/cards/${cardId}/export/png`, {}, true),
          bulkPdf: await runExport(`/api/cards/${cardId}/export/bulk-pdf`, { count: 2 }),
          batchPdf: await runExport("/api/cards/batch/pdf", {
            cardIds: [cardId],
            grayscale: false,
            cardsPerPage: 1,
            showCutLines: true,
          }),
        },
      };
    }, magentaPng.toString("base64"));

    assert(privateImageFlow.upload?.status === 201, `Private image upload returned ${privateImageFlow.upload?.status}`);
    assert(privateImageFlow.create?.status === 201, `Private image card save returned ${privateImageFlow.create?.status}`);
    for (const [name, result] of Object.entries(privateImageFlow.exports || {})) {
      assert(result.status === 200, `Private image ${name} export returned ${result.status}`);
      const expectedType = name === "png" ? "image/png" : "application/pdf";
      assert(result.type?.includes(expectedType), `Private image ${name} type was ${result.type}`);
      assert(result.bytes > 1_000, `Private image ${name} export was only ${result.bytes} bytes`);
    }
    const privateImagePng = Buffer.from(privateImageFlow.exports.png.payloadBase64, "base64");
    const { data: privateImagePixels } = await sharp(privateImagePng)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let magentaPixelCount = 0;
    for (let index = 0; index < privateImagePixels.length; index += 3) {
      if (
        privateImagePixels[index] > 200
        && privateImagePixels[index + 1] < 80
        && privateImagePixels[index + 2] > 200
      ) {
        magentaPixelCount += 1;
      }
    }
    assert(magentaPixelCount > 1_000, `Private uploaded image did not render (${magentaPixelCount} magenta pixels)`);
    exportResults.privateImage = {
      cardId: privateImageFlow.create.cardId,
      magentaPixelCount,
      ...Object.fromEntries(Object.entries(privateImageFlow.exports).map(([name, result]) => [name, {
        status: result.status,
        type: result.type,
        bytes: result.bytes,
      }])),
    };
    checks.push("private_uploaded_image_all_export_formats");

    response = await page.goto(`${baseUrl}/templates`, { waitUntil: "networkidle0", timeout: 60_000 });
    assert(response?.status() === 200, `/templates returned ${response?.status()}`);
    await replaceValue(page, 'input[placeholder="Search templates..."]', "SQLite Runtime");
    await page.waitForFunction(() => document.body.innerText.includes("SQLite Runtime Smoke Template"));
    await clickVisibleButton(page, "Use Template");
    await waitForPath(page, ["/create"]);
    await page.waitForFunction(() => {
      const input = document.querySelector('input[placeholder="e.g., Wedding Bingo"]');
      return input?.value === "SQLite Runtime Smoke Template";
    });
    checks.push("template_search_and_use");

    response = await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle0", timeout: 60_000 });
    assert(response?.status() === 200, `/dashboard returned ${response?.status()}`);
    await page.waitForSelector('[data-ios-app-promo="visible"]');
    await page.evaluate(() => localStorage.setItem("mybingocard-ios-app", "1"));
    await page.reload({ waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForSelector('[data-ios-app-promo="hidden-native"]');
    assert(
      !(await page.$('[data-ios-app-promo="visible"]')),
      "The App Store promo remained visible in native mode",
    );
    await page.screenshot({ path: path.join(outputDir, "05-dashboard-native-promo-hidden.png"), fullPage: true });
    await page.evaluate(() => localStorage.removeItem("mybingocard-ios-app"));
    checks.push("native_wrapper_hides_app_store_self_promo");

    const authCookies = await page.cookies(baseUrl);
    if (authCookies.length > 0) await page.deleteCookie(...authCookies);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    const mobileParams = new URLSearchParams({
      title: "Mobile E2E",
      cells: JSON.stringify(["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]),
    });
    response = await page.goto(`${baseUrl}/create?${mobileParams}`, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    assert(response?.status() === 200, `Mobile /create returned ${response?.status()}`);
    const mobileLayout = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      editTop: [...document.querySelectorAll("h2")]
        .find((heading) => heading.textContent?.includes("Edit Content"))
        ?.getBoundingClientRect().top ?? null,
      buttonVisible: [...document.querySelectorAll("button")].some((button) => {
        const rect = button.getBoundingClientRect();
        return button.textContent?.includes("Save") && rect.width > 0 && rect.height > 0;
      }),
    }));
    assert(mobileLayout.horizontalOverflow <= 1, `Mobile overflow was ${mobileLayout.horizontalOverflow}px`);
    assert(mobileLayout.editTop !== null && mobileLayout.editTop < 500, `Mobile editor began at ${mobileLayout.editTop}px`);
    assert(mobileLayout.buttonVisible, "Mobile save action was not visible");
    await page.screenshot({ path: path.join(outputDir, "04-create-mobile.png"), fullPage: true });
    checks.push("mobile_create_layout_and_action");

    assert(appIssues.length === 0, `Browser issues:\n${appIssues.join("\n")}`);

    console.log(JSON.stringify({
      ok: true,
      baseUrl,
      sqlitePath: fixture.dbPath,
      outputDir,
      cardId,
      exportResults,
      desktopLayout,
      mobileLayout,
      blockedTelemetry: [...blockedTelemetry].sort(),
      blockedThirdParty: [...blockedThirdParty].sort(),
      checks,
      appIssues,
    }, null, 2));
  } catch (error) {
    console.error(serverOutput.slice(-8_000));
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5_000);
      server.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    if (process.env.MYBINGOCARD_E2E_KEEP_DB === "1") {
      console.error(`Keeping Maker E2E SQLite DB at ${fixture.dbPath}`);
    } else {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
