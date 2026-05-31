#!/usr/bin/env node
/**
 * Production deploy guard for mybingocard.com.
 *
 * This intentionally builds outside the live .next directory, preserves old
 * hashed static assets, then restarts PM2 from the application cwd. Building
 * directly over .next can leave active browser tabs pointing at chunk files
 * the running Next server still references but the build just deleted.
 */

const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const PM2_NAME = process.env.MYBINGOCARD_PM2_NAME || "mybingocard";
const USER_AGENT = "MyBingoCardDeployGuard/1.0";
const NEXT_CHUNK_PATH = "/_next/static/chunks/";
const NEXT_DIR = path.join(APP_DIR, ".next");
const NEXT_STATIC_DIR = path.join(NEXT_DIR, "static");
const NEXT_PREVIOUS_DIR = path.join(APP_DIR, ".next.previous");
const STATIC_ARCHIVE_DIR = path.join(APP_DIR, ".next-static-archive");
const DEPLOY_BUILDS_DIR = path.join(APP_DIR, ".deploy-builds");
const STATIC_ARCHIVE_MAX_AGE_MS = Number(process.env.MYBINGOCARD_STATIC_ARCHIVE_MAX_AGE_DAYS || 14) * 24 * 60 * 60 * 1000;
const args = new Set(process.argv.slice(2));

function run(command, commandArgs, options = {}) {
  const label = [command, ...commandArgs].join(" ");
  console.log(`\n$ ${label}`);
  const cwd = options.cwd || APP_DIR;
  execFileSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, PWD: cwd },
    ...options,
  });
}

function output(command, commandArgs, options = {}) {
  const cwd = options.cwd || APP_DIR;
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PWD: cwd },
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

function copyMissingFiles(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return 0;
  let copied = 0;
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copied += copyMissingFiles(sourcePath, targetPath);
      continue;
    }
    if (!entry.isFile() || fs.existsSync(targetPath)) continue;
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    copied += 1;
  }
  return copied;
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return true;
  let empty = true;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (removeEmptyDirs(child)) {
        fs.rmdirSync(child);
      } else {
        empty = false;
      }
      continue;
    }
    empty = false;
  }
  return empty;
}

function pruneArchivedStaticAssets() {
  if (!fs.existsSync(STATIC_ARCHIVE_DIR) || STATIC_ARCHIVE_MAX_AGE_MS <= 0) return;
  const cutoff = Date.now() - STATIC_ARCHIVE_MAX_AGE_MS;
  let removed = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const itemPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(itemPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = fs.statSync(itemPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(itemPath);
        removed += 1;
      }
    }
  }
  walk(STATIC_ARCHIVE_DIR);
  removeEmptyDirs(STATIC_ARCHIVE_DIR);
  if (removed > 0) console.log(`Pruned ${removed} archived static assets.`);
}

function snapshotStaticAssets() {
  const copied = copyMissingFiles(NEXT_STATIC_DIR, STATIC_ARCHIVE_DIR);
  console.log(`Archived ${copied} existing Next static assets for stale-client compatibility.`);
}

function restoreArchivedStaticAssets(targetStaticDir = NEXT_STATIC_DIR) {
  const copied = copyMissingFiles(STATIC_ARCHIVE_DIR, targetStaticDir);
  console.log(`Restored ${copied} archived Next static assets into the new build.`);
}

function prepareBuildDir() {
  fs.mkdirSync(DEPLOY_BUILDS_DIR, { recursive: true });
  return fs.mkdtempSync(path.join(DEPLOY_BUILDS_DIR, "build-"));
}

function copyAppToBuildDir(buildDir) {
  run("rsync", [
    "-a",
    "--delete",
    "--exclude", ".git/",
    "--exclude", ".next/",
    "--exclude", ".next.previous/",
    "--exclude", ".next-static-archive/",
    "--exclude", ".deploy-builds/",
    "--exclude", "node_modules/",
    `${APP_DIR}/`,
    `${buildDir}/`,
  ]);

  const nodeModules = path.join(APP_DIR, "node_modules");
  if (fs.existsSync(nodeModules)) {
    fs.symlinkSync(nodeModules, path.join(buildDir, "node_modules"), "dir");
  }
}

function installBuiltNext(buildDir) {
  const builtNextDir = path.join(buildDir, ".next");
  const buildIdPath = path.join(builtNextDir, "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(`Staged build did not produce ${buildIdPath}`);
  }

  fs.rmSync(NEXT_PREVIOUS_DIR, { recursive: true, force: true });
  if (fs.existsSync(NEXT_DIR)) {
    fs.renameSync(NEXT_DIR, NEXT_PREVIOUS_DIR);
  }
  fs.renameSync(builtNextDir, NEXT_DIR);
  rewriteNextNodeModuleSymlinks();
  console.log("Installed staged .next build into the live app directory.");
}

function rewriteNextNodeModuleSymlinks() {
  const nextNodeModulesDir = path.join(NEXT_DIR, "node_modules");
  if (!fs.existsSync(nextNodeModulesDir)) return;

  let rewritten = 0;
  for (const entry of fs.readdirSync(nextNodeModulesDir, { withFileTypes: true })) {
    if (!entry.isSymbolicLink()) continue;
    const linkPath = path.join(nextNodeModulesDir, entry.name);
    const currentTarget = fs.readlinkSync(linkPath);
    const marker = "node_modules/";
    const markerIndex = currentTarget.lastIndexOf(marker);
    if (markerIndex === -1) continue;
    const packagePath = currentTarget.slice(markerIndex + marker.length);
    if (!packagePath || packagePath.startsWith("..")) continue;

    const liveTarget = path.join(APP_DIR, "node_modules", packagePath);
    const relativeTarget = path.relative(path.dirname(linkPath), liveTarget);
    if (currentTarget === relativeTarget) continue;
    fs.unlinkSync(linkPath);
    fs.symlinkSync(relativeTarget, linkPath);
    rewritten += 1;
  }

  if (rewritten > 0) {
    console.log(`Rewrote ${rewritten} staged .next/node_modules symlinks for the live app path.`);
  }
}

function buildApplication() {
  snapshotStaticAssets();

  if (args.has("--in-place-build")) {
    run("bun", ["run", "build"]);
    restoreArchivedStaticAssets();
    pruneArchivedStaticAssets();
    return;
  }

  const buildDir = prepareBuildDir();
  try {
    copyAppToBuildDir(buildDir);
    run("bun", ["run", "build"], { cwd: buildDir });
    restoreArchivedStaticAssets(path.join(buildDir, ".next", "static"));
    installBuiltNext(buildDir);
    pruneArchivedStaticAssets();
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
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
    buildApplication();
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
