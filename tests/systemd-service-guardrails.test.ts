import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dedicated MyBingoCard systemd service", () => {
  const unit = read("deploy/systemd/mybingocard.service");
  const deploy = read("scripts/production-deploy.cjs");
  const ecosystem = read("ecosystem.config.cjs");
  const errorMonitor = read("scripts/error-monitor.cjs");

  test("runs the exact Next build as the restricted service identity", () => {
    expect(unit).toContain("User=mybingocard-svc");
    expect(unit).toContain("Group=mybingocard-svc");
    expect(unit).toContain("WorkingDirectory=/var/www/mybingocard.com");
    expect(unit).toContain("ExecStart=/usr/bin/node /var/www/mybingocard.com/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 4000");
    expect(unit).toContain("Environment=HOME=/var/cache/mybingocard/chromium");
    expect(unit).toContain("SuccessExitStatus=143");
    expect(unit.split("\n").filter((line) => line.startsWith("ExecStart=")).join("\n")).not.toContain("--no-sandbox");
  });

  test("protects the host while preserving audited runtime writes and Chrome sandboxing", () => {
    for (const directive of [
      "PrivateTmp=yes",
      "PrivateDevices=yes",
      "PrivateIPC=yes",
      "ProtectSystem=strict",
      "ProtectHome=yes",
      "ProtectKernelTunables=yes",
      "ProtectKernelModules=yes",
      "ProtectKernelLogs=yes",
      "ProtectControlGroups=yes",
      "ProtectProc=invisible",
      "LockPersonality=yes",
      "RestrictRealtime=yes",
    ]) expect(unit).toContain(directive);
    for (const path of [
      "/var/lib/mybingocard",
      "/var/cache/mybingocard",
      "/var/www/mybingocard.com/uploads",
      "/var/www/mybingocard.com/.next/cache",
    ]) expect(unit).toContain(`ReadWritePaths=${path}`);
    expect(unit).toContain("NoNewPrivileges, capability bounding");
    expect(unit).not.toContain("NoNewPrivileges=yes");
    expect(unit).not.toContain("RestrictSUIDSGID=yes");
  });

  test("uses systemd for deploys and prevents PM2 dual supervision", () => {
    expect(deploy).toContain('const SERVICE_NAME = process.env.MYBINGOCARD_SYSTEMD_UNIT || "mybingocard.service"');
    expect(deploy).toContain('runSystemctl(["restart", SERVICE_NAME])');
    expect(deploy).toContain("ensureSystemdService()");
    expect(deploy).toContain("ensurePm2Absent()");
    expect(deploy).not.toContain("runPm2(");
    expect(ecosystem).toContain("module.exports = { apps: [] }");
    expect(ecosystem).not.toContain('name: "mybingocard"');
  });

  test("moves application-log monitoring from stale PM2 files to journald", () => {
    expect(errorMonitor).toContain('const unit = process.env.MYBINGOCARD_SYSTEMD_UNIT || "mybingocard.service"');
    expect(errorMonitor).toContain('execFileSync("/usr/bin/journalctl"');
    expect(errorMonitor).not.toContain('/root/.pm2/logs/mybingocard-error.log');
  });
});
