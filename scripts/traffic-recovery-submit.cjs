#!/usr/bin/env node
/**
 * Re-submits known-good MyBingoCard URLs to search indexing systems.
 * This does not publish social posts or send public messages.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const HOST = new URL(APP_URL).hostname;
const REPORT_PATH = process.env.MYBINGOCARD_RECOVERY_REPORT || "/var/log/mybingocard/traffic-recovery-last.json";
const INDEXNOW_ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/IndexNow";
const USER_AGENT = "MyBingoCardTrafficRecovery/1.0";
const GSC_SUBMIT_SCRIPT = process.env.MYBINGOCARD_GSC_SUBMIT_SCRIPT || "/root/scripts/utils/submit-sitemap-to-gsc.mjs";
const PRIORITY_PATHS = [
  "/",
  "/create",
  "/templates",
  "/bingo-card-maker",
  "/printable-bingo-cards",
  "/online-bingo-card-generator",
  "/ai-bingo-card-generator",
  "/image-bingo-card-generator",
  "/custom-bingo-card-maker",
  "/pricing",
  "/about",
  "/contact",
];
const INDEXNOW_RATE_LIMIT_COOLDOWN_MS = Number(process.env.INDEXNOW_RATE_LIMIT_COOLDOWN_MS || 24 * 60 * 60 * 1000);

function hasArg(name) {
  return process.argv.includes(name);
}

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

function safeUrl(value) {
  try {
    const url = new URL(value, APP_URL);
    if (url.hostname !== HOST) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function readIndexNowKey() {
  const publicDir = path.join(APP_DIR, "public");
  try {
    const candidates = fs.readdirSync(publicDir)
      .filter((name) => /^[a-z0-9]{16,}\.txt$/i.test(name))
      .map((name) => ({
        name,
        value: fs.readFileSync(path.join(publicDir, name), "utf8").trim(),
      }))
      .filter((item) => item.value && item.name.startsWith(item.value));
    if (candidates[0]) {
      return {
        key: candidates[0].value,
        keyLocation: `${APP_URL}/${candidates[0].name}`,
      };
    }
  } catch {
    // Fall back to the current production key if the public file is unavailable.
  }
  const key = process.env.INDEXNOW_KEY || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
  return { key, keyLocation: `${APP_URL}/${key}.txt` };
}

async function loadSitemap() {
  const localPath = path.join(APP_DIR, "public", "sitemap.xml");
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath, "utf8");
  const res = await fetch(`${APP_URL}/sitemap.xml`, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  return res.text();
}

function parseSitemap(xml) {
  const rows = [];
  const urlRe = /<url>([\s\S]*?)<\/url>/g;
  for (const match of xml.matchAll(urlRe)) {
    const block = match[1];
    const loc = block.match(/<loc>(.*?)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const priority = Number(block.match(/<priority>(.*?)<\/priority>/)?.[1] || 0);
    const lastmod = block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim() || "";
    const url = safeUrl(loc);
    if (url) rows.push({ url, priority, lastmod });
  }
  return rows;
}

function selectUrls(sitemapRows) {
  const limit = hasArg("--all") ? 10000 : Math.max(1, Number(argValue("--limit", "80")) || 80);
  const byUrl = new Map();
  for (const item of PRIORITY_PATHS) {
    const url = safeUrl(item);
    if (url) byUrl.set(url, { url, priority: 1, source: "priority" });
  }
  for (const row of sitemapRows) {
    byUrl.set(row.url, { ...row, source: byUrl.get(row.url)?.source || "sitemap" });
  }
  return [...byUrl.values()]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.url.localeCompare(b.url))
    .slice(0, limit)
    .map((item) => item.url);
}

async function verifyUrls(urls) {
  if (hasArg("--no-verify-live")) return { ok: urls, failed: [] };
  const ok = [];
  const failed = [];
  for (const url of urls) {
    try {
      let res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "user-agent": USER_AGENT },
      });
      if (res.status === 405 || res.status === 403) {
        res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
        });
        await res.body?.cancel?.().catch(() => {});
      }
      if (res.status >= 200 && res.status < 400) ok.push(url);
      else failed.push({ url, status: res.status });
    } catch (error) {
      failed.push({ url, error: error.message });
    }
  }
  return { ok, failed };
}

async function submitIndexNow(urls) {
  const { key, keyLocation } = readIndexNowKey();
  const payload = { host: HOST, key, keyLocation, urlList: urls };
  if (hasArg("--dry-run")) {
    return { skipped: true, payload };
  }
  const previous = readPreviousResult();
  const previousGeneratedAt = previous?.generatedAt ? new Date(previous.generatedAt).getTime() : 0;
  if (!hasArg("--force-indexnow") && previous?.indexNow?.status === 429 && Date.now() - previousGeneratedAt < INDEXNOW_RATE_LIMIT_COOLDOWN_MS) {
    return {
      skipped: true,
      reason: "IndexNow returned 429 recently; cooldown active",
      previousGeneratedAt: previous.generatedAt,
      payload,
    };
  }
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: body.slice(0, 500), payload };
}

function readPreviousResult() {
  try {
    return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function submitGscSitemap() {
  if (hasArg("--no-gsc")) return { skipped: true, reason: "--no-gsc" };
  if (hasArg("--dry-run")) return { skipped: true, reason: "--dry-run" };
  if (!fs.existsSync(GSC_SUBMIT_SCRIPT)) {
    return { skipped: true, reason: `${GSC_SUBMIT_SCRIPT} not found` };
  }
  try {
    const output = execFileSync("node", [GSC_SUBMIT_SCRIPT, HOST], {
      cwd: APP_DIR,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, output: output.trim().slice(-2000) };
  } catch (error) {
    return {
      ok: false,
      status: error.status,
      output: String(error.stdout || error.stderr || error.message).slice(-2000),
    };
  }
}

function writeResult(result) {
  try {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2));
    return REPORT_PATH;
  } catch {
    const fallback = path.join(process.cwd(), "traffic-recovery-last.json");
    fs.writeFileSync(fallback, JSON.stringify(result, null, 2));
    return fallback;
  }
}

async function main() {
  const sitemap = await loadSitemap();
  const urls = selectUrls(parseSitemap(sitemap));
  const verified = await verifyUrls(urls);
  const indexNow = verified.ok.length ? await submitIndexNow(verified.ok) : { skipped: true, reason: "no verified URLs" };
  const gsc = submitGscSitemap();
  const result = {
    generatedAt: new Date().toISOString(),
    dryRun: hasArg("--dry-run"),
    submittedPublicMessages: false,
    selectedUrls: urls.length,
    verifiedUrls: verified.ok.length,
    failedUrls: verified.failed,
    indexNow,
    gsc,
  };
  const outPath = writeResult(result);
  console.log(JSON.stringify(result, null, 2));
  console.log(`Recovery result written: ${outPath}`);
  if (!indexNow.skipped && !indexNow.ok && indexNow.status !== 429) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Traffic recovery submit failed:", error.message || error);
  process.exit(1);
});
