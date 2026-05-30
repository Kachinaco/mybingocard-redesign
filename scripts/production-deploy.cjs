#!/usr/bin/env node
/**
 * Production deploy guard for mybingocard.com.
 *
 * This intentionally restarts PM2 from the application cwd after every build.
 * A build that rewrites .next without a matching process restart can leave
 * pages pointing at chunk files the running Next server does not serve.
 */

const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const PM2_NAME = process.env.MYBINGOCARD_PM2_NAME || "mybingocard";
const USER_AGENT = "MyBingoCardDeployGuard/1.0";
const NEXT_CHUNK_PATH = "/_next/static/chunks/";
const args = new Set(process.argv.slice(2));

function run(command, commandArgs, options = {}) {
  const label = [command, ...commandArgs].join(" ");
  console.log(`\n$ ${label}`);
  execFileSync(command, commandArgs, {
    cwd: APP_DIR,
    stdio: "inherit",
    env: process.env,
    ...options,
  });
}

function output(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: APP_DIR,
    encoding: "utf8",
    env: process.env,
    ...options,
  });
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: options.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers || {}),
    },
  });
  const text = options.method === "HEAD" ? "" : await res.text().catch(() => "");
  return { res, text };
}

function ensureAppDir() {
  const packagePath = path.join(APP_DIR, "package.json");
  const nextConfigPath = path.join(APP_DIR, "next.config.ts");
  if (!fs.existsSync(packagePath) || !fs.existsSync(nextConfigPath)) {
    throw new Error(`APP_DIR does not look like MyBingoCard: ${APP_DIR}`);
  }
  process.chdir(APP_DIR);
}

function ensureNoTrackedDirtyFiles() {
  const status = output("git", ["status", "--porcelain", "--untracked-files=no"]).trim();
  if (!status) return;
  throw new Error(
    `Tracked production files are dirty. Commit/stash before deploy:\n${status}`
  );
}

function ensurePm2Cwd() {
  const raw = output("pm2", ["jlist"]);
  const rows = JSON.parse(raw);
  const proc = rows.find((item) => item.name === PM2_NAME);
  if (!proc) throw new Error(`PM2 process not found: ${PM2_NAME}`);
  const cwd = proc.pm2_env?.pm_cwd || proc.pm2_env?.cwd || "";
  const pwd = proc.pm2_env?.env?.PWD || proc.pm2_env?.PWD || "";
  if (cwd !== APP_DIR) {
    throw new Error(`PM2 cwd is ${cwd || "unknown"}, expected ${APP_DIR}`);
  }
  if (pwd && pwd !== APP_DIR) {
    throw new Error(`PM2 PWD is ${pwd}, expected ${APP_DIR}`);
  }
  console.log(`PM2 cwd verified: ${cwd}`);
}

function extractChunkUrls(html) {
  const urls = new Set();
  const attrRe = /\b(?:src|href)=["']([^"']*\/_next\/static\/chunks\/[^"']+)["']/g;
  for (const match of html.matchAll(attrRe)) {
    const value = match[1].replace(/&amp;/g, "&");
    try {
      urls.add(new URL(value, APP_URL).toString());
    } catch {
      // ignored
    }
  }
  return [...urls].filter((url) => /\.(?:js|css)(?:\?|$)/i.test(url));
}

async function verifyHttp() {
  console.log("\nVerifying live HTTP surface...");

  const home = await fetchText(`${APP_URL}/?deploy_verify=${Date.now()}`);
  if (!home.res.ok) throw new Error(`Home returned ${home.res.status}`);
  if (!home.text.includes("/t/tracker.js")) {
    throw new Error("Home HTML does not include /t/tracker.js");
  }
  console.log(`Home: ${home.res.status}`);

  const tracker = await fetchText(`${APP_URL}/t/tracker.js`, {
    accept: "application/javascript,*/*",
  });
  if (!tracker.res.ok) throw new Error(`/t/tracker.js returned ${tracker.res.status}`);
  if (!/track|page_view|sendBeacon|fetch/i.test(tracker.text)) {
    throw new Error("/t/tracker.js did not look like a tracker script");
  }
  console.log(`/t/tracker.js: ${tracker.res.status}`);

  const trackApi = await fetch(`${APP_URL}/t/api/track`, {
    method: "OPTIONS",
    headers: { "user-agent": USER_AGENT },
  });
  if (trackApi.status >= 500) {
    throw new Error(`/t/api/track OPTIONS returned ${trackApi.status}`);
  }
  console.log(`/t/api/track OPTIONS: ${trackApi.status}`);

  const chunkUrls = extractChunkUrls(home.text).slice(0, 8);
  if (chunkUrls.length === 0) {
    throw new Error(`No ${NEXT_CHUNK_PATH} JS/CSS URLs found in home HTML`);
  }

  for (const url of chunkUrls) {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
    });
    if (!res.ok) throw new Error(`Chunk failed ${res.status}: ${url}`);
    const ctype = res.headers.get("content-type") || "";
    if (!/javascript|css|text\/css/i.test(ctype)) {
      throw new Error(`Chunk had unexpected content-type ${ctype}: ${url}`);
    }
    console.log(`Chunk: ${res.status} ${new URL(url).pathname}`);
    await res.body?.cancel?.().catch(() => {});
  }
}

async function main() {
  ensureAppDir();

  const verifyOnly = args.has("--verify-only");
  const skipBuild = args.has("--skip-build") || verifyOnly;
  const skipRestart = args.has("--skip-restart") || verifyOnly;

  ensureNoTrackedDirtyFiles();

  if (!skipBuild) {
    run("bun", ["run", "build"]);
  }

  if (!skipRestart) {
    run("pm2", ["restart", PM2_NAME, "--update-env"]);
    run("pm2", ["save"]);
  }

  ensurePm2Cwd();
  await verifyHttp();

  console.log("\nProduction deploy guard passed.");
}

main().catch((error) => {
  console.error(`\nProduction deploy guard failed: ${error.message || error}`);
  process.exit(1);
});
