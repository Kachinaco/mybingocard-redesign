import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function nginxTime(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}/${months[date.getUTCMonth()]}/${date.getUTCFullYear()}:${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`;
}

function chunkFailure(at: string, index: number, userAgent: string) {
  return `203.0.113.${index} - - [${at}] "GET /_next/static/chunks/stale-${index}.js HTTP/1.1" 404 123 "-" "${userAgent}"`;
}

function runMonitor(logFile: string, appDir: string) {
  return spawnSync("node", ["scripts/ops-regression-monitor.cjs", "--skip-live", "--no-cooldown"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MYBINGOCARD_APP_DIR: appDir,
      MYBINGOCARD_NGINX_ACCESS_LOG: logFile,
      MYBINGOCARD_OPS_MONITOR_STATE: join(appDir, "monitor-state.json"),
      MYBINGOCARD_OPS_MONITOR_SKIP_LIVE: "1",
      MYBINGOCARD_AGENT_TASKS: "0",
    },
    encoding: "utf8",
  });
}

describe("ops regression monitor chunk traffic classification", () => {
  test("ignores automation chunk failures while reporting their diagnostic count", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-ops-chunks-"));
    const logFile = join(dir, "access.log");

    try {
      const at = nginxTime(new Date(Date.now() - 1000));
      const rows = Array.from({ length: 10 }, (_, index) =>
        chunkFailure(at, index + 1, "Mozilla/5.0 HeadlessChrome/126.0")
      );
      rows.push(chunkFailure(at, 20, "Mozilla/5.0 Safari/605.1.15"));
      writeFileSync(logFile, rows.join("\n"));

      const result = runMonitor(logFile, dir);

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Ops regression monitor failed");
      expect(result.stdout).toContain("All clear");
      expect(result.stdout).toContain("10 automation/bot chunk failures excluded from alerts");
      expect(result.stdout).not.toContain("Next chunk failures spiked");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("alerts when three distinct human clients have chunk failures", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybingocard-ops-human-chunks-"));
    const logFile = join(dir, "access.log");

    try {
      const at = nginxTime(new Date(Date.now() - 1000));
      writeFileSync(logFile, [
        chunkFailure(at, 1, "Mozilla/5.0 Safari/605.1.15"),
        chunkFailure(at, 2, "Mozilla/5.0 Chrome/126.0"),
        chunkFailure(at, 3, "Mozilla/5.0 Firefox/127.0"),
        chunkFailure(at, 4, "Googlebot/2.1"),
      ].join("\n"));

      const result = runMonitor(logFile, dir);

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("Ops regression monitor failed");
      expect(result.stdout).toContain("Next chunk failures spiked: 3 human failures, 3 unique human clients");
      expect(result.stdout).toContain("Diagnostic only: 1 automation/bot chunk failures excluded from alerts");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
