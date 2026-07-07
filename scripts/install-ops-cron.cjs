#!/usr/bin/env node
/**
 * Installs the MyBingoCard ops guardrail cron block idempotently.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const NODE_BIN = process.env.MYBINGOCARD_CRON_NODE || "/usr/bin/node";
const BEGIN = "# BEGIN MyBingoCard Ops Guardrails";
const END = "# END MyBingoCard Ops Guardrails";
const BLOCK = `${BEGIN}
*/15 * * * * cd ${APP_DIR} && ${NODE_BIN} scripts/ops-regression-monitor.cjs --discord >> /var/log/mybingocard-ops-monitor.log 2>&1
12 7 * * * cd ${APP_DIR} && ${NODE_BIN} scripts/traffic-truth-report.cjs --days 14 --discord >> /var/log/mybingocard-traffic-truth.log 2>&1
22 7 * * 1 cd ${APP_DIR} && ${NODE_BIN} scripts/traffic-recovery-submit.cjs --limit 80 >> /var/log/mybingocard-traffic-recovery.log 2>&1
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

function main() {
  fs.mkdirSync("/var/log/mybingocard", { recursive: true });
  const existing = currentCrontab();
  const blockRe = new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`, "m");
  const withoutBlock = existing.replace(blockRe, "").trimEnd();
  const next = `${withoutBlock ? `${withoutBlock}\n\n` : ""}${BLOCK}\n`;
  install(next);
  console.log("Installed MyBingoCard ops guardrail cron block:");
  console.log(BLOCK);
}

main();
