#!/usr/bin/env node
/**
 * Installs the MyBingoCard recurring ops-loop cron block idempotently.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const NODE_BIN = process.env.MYBINGOCARD_CRON_NODE || "/usr/bin/node";
const BEGIN = "# BEGIN MyBingoCard Ops Loops";
const END = "# END MyBingoCard Ops Loops";
const STATE_ROOT = process.env.MYBINGOCARD_OPS_LOOP_STATE_ROOT || "/var/lib/mybingocard/ops-loops";

const BASE = `cd ${APP_DIR} && MYBINGOCARD_OPS_LOOP_STATE_ROOT=${STATE_ROOT} /usr/bin/flock -n`;
const BLOCK = `${BEGIN}
15 8 * * * ${BASE} /tmp/mybingocard-ops-loop-owner-brief.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode owner-brief --discord >> /var/log/mybingocard/ops-loops/owner-brief.log 2>&1
29 1-23/4 * * * ${BASE} /tmp/mybingocard-ops-loop-high-intent.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode high-intent-followup --hours 4 --discord >> /var/log/mybingocard/ops-loops/high-intent-followup.log 2>&1
11 */2 * * * ${BASE} /tmp/mybingocard-ops-loop-support-cleanup.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode support-inbox-cleanup --hours 2 --discord >> /var/log/mybingocard/ops-loops/support-inbox-cleanup.log 2>&1
41 0-23/4 * * * ${BASE} /tmp/mybingocard-ops-loop-revenue-watchdog.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode revenue-watchdog --hours 4 --discord >> /var/log/mybingocard/ops-loops/revenue-watchdog.log 2>&1
45 8 * * * ${BASE} /tmp/mybingocard-ops-loop-seo-search.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode seo-search-watchdog --discord >> /var/log/mybingocard/ops-loops/seo-search-watchdog.log 2>&1
10 18 * * * ${BASE} /tmp/mybingocard-ops-loop-product-friction.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode product-friction --hours 24 --discord >> /var/log/mybingocard/ops-loops/product-friction.log 2>&1
20 18 * * * ${BASE} /tmp/mybingocard-ops-loop-social-content.lock ${NODE_BIN} scripts/mybingocard-ops-loops.cjs --mode social-content-queue --hours 168 --discord >> /var/log/mybingocard/ops-loops/social-content-queue.log 2>&1
${END}`;

function currentCrontab() {
  try {
    return execFileSync("crontab", ["-l"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return "";
  }
}

function install(next) {
  execFileSync("crontab", ["-"], { input: next, encoding: "utf8" });
}

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  fs.mkdirSync("/var/log/mybingocard/ops-loops", { recursive: true });
  fs.mkdirSync(STATE_ROOT, { recursive: true });
  const existing = currentCrontab();
  const blockRe = new RegExp(`${escapeRe(BEGIN)}[\\s\\S]*?${escapeRe(END)}\\n?`, "m");
  const withoutBlock = existing.replace(blockRe, "").trimEnd();
  const next = `${withoutBlock ? `${withoutBlock}\n\n` : ""}${BLOCK}\n`;
  install(next);
  console.log("Installed MyBingoCard ops-loop cron block:");
  console.log(BLOCK);
}

main();
