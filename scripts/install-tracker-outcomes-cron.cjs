#!/usr/bin/env node
/**
 * Audits or installs the bounded Tracker outcome delivery cron block.
 *
 * Installation is explicit because enabling this job starts outbound delivery.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const BEGIN = "# BEGIN MyBingoCard Tracker Outcomes";
const END = "# END MyBingoCard Tracker Outcomes";
const LOG_DIR = process.env.MYBINGOCARD_TRACKER_OUTCOME_LOG_DIR || "/var/log/mybingocard/tracker-outcomes";
const LIMIT = Number(process.env.MYBINGOCARD_TRACKER_OUTCOME_CRON_LIMIT || 25);

function commandOutput(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function resolveBun() {
  const configured = process.env.MYBINGOCARD_CRON_BUN?.trim();
  if (configured) return configured;
  const resolved = commandOutput("sh", ["-lc", "command -v bun"]);
  if (!resolved) throw new Error("Bun was not found; set MYBINGOCARD_CRON_BUN");
  return resolved;
}

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

function cronBlock() {
  if (!Number.isSafeInteger(LIMIT) || LIMIT < 1 || LIMIT > 100) {
    throw new Error("MYBINGOCARD_TRACKER_OUTCOME_CRON_LIMIT must be an integer from 1 through 100");
  }
  const bun = resolveBun();
  return `${BEGIN}
* * * * * cd ${APP_DIR} && /usr/bin/flock -n /tmp/mybingocard-tracker-outcomes.lock /bin/sh -c '${bun} scripts/reconcile-tracker-outcomes.ts --apply && ${bun} scripts/deliver-tracker-outcomes.ts --deliver --limit ${LIMIT}' >> ${LOG_DIR}/delivery.log 2>&1
${END}`;
}

function main() {
  const block = cronBlock();
  if (!process.argv.includes("--install")) {
    console.log("Tracker outcome cron audit only; no crontab changes were made.");
    console.log(block);
    return;
  }

  fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o750 });
  const existing = currentCrontab();
  const blockRe = new RegExp(`${escapeRe(BEGIN)}[\\s\\S]*?${escapeRe(END)}\\n?`, "m");
  const withoutBlock = existing.replace(blockRe, "").trimEnd();
  const next = `${withoutBlock ? `${withoutBlock}\n\n` : ""}${block}\n`;
  install(next);
  console.log("Installed MyBingoCard Tracker outcome cron block.");
}

main();
