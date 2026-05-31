import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("production ops guardrails", () => {
  const packageSource = readSource("package.json");
  const deploySource = readSource("scripts/production-deploy.cjs");
  const monitorSource = readSource("scripts/ops-regression-monitor.cjs");
  const truthSource = readSource("scripts/traffic-truth-report.cjs");
  const recoverySource = readSource("scripts/traffic-recovery-submit.cjs");
  const cronSource = readSource("scripts/install-ops-cron.cjs");

  test("package exposes deploy, monitor, truth, and recovery commands", () => {
    expect(packageSource).toContain('"ops:monitor": "node scripts/ops-regression-monitor.cjs"');
    expect(packageSource).toContain('"ops:install-cron": "node scripts/install-ops-cron.cjs"');
    expect(packageSource).toContain('"prod:deploy": "node scripts/production-deploy.cjs"');
    expect(packageSource).toContain('"prod:verify": "node scripts/production-deploy.cjs --verify-only"');
    expect(packageSource).toContain('"traffic:truth": "node scripts/traffic-truth-report.cjs"');
    expect(packageSource).toContain('"traffic:recover": "node scripts/traffic-recovery-submit.cjs"');
  });

  test("production deploy guard restarts PM2 and verifies the live static surface", () => {
    expect(deploySource).toContain("pm2");
    expect(deploySource).toContain("restart");
    expect(deploySource).toContain("--update-env");
    expect(deploySource).toContain("/_next/static/chunks/");
    expect(deploySource).toContain("/t/tracker.js");
    expect(deploySource).toContain("/t/api/track");
    expect(deploySource).toContain("--verify-only");
  });

  test("production deploy guard preserves old Next static assets across builds", () => {
    expect(deploySource).toContain("snapshotStaticAssets");
    expect(deploySource).toContain("restoreArchivedStaticAssets");
    expect(deploySource).toContain(".next-static-archive");
    expect(deploySource).toContain(".deploy-builds");
    expect(deploySource).toContain("installBuiltNext");
    expect(deploySource).toContain("rewriteNextNodeModuleSymlinks");
    expect(deploySource).toContain("--in-place-build");
  });

  test("regression monitor watches the exact outage classes found in QA", () => {
    expect(monitorSource).toContain("/api/cards/share/");
    expect(monitorSource).toContain("/api/images/");
    expect(monitorSource).toContain("/cards/");
    expect(monitorSource).toContain("/t/tracker.js");
    expect(monitorSource).toContain("/_next/static/chunks/");
    expect(monitorSource).toContain("isNextChunkAsset");
    expect(monitorSource).toContain("COOLDOWN_MINUTES");
    expect(monitorSource).toContain("--discord");
    expect(monitorSource).not.toContain("lineRe.match");
  });

  test("traffic truth report cross-checks nginx, first-party activity, central analytics, and GSC", () => {
    expect(truthSource).toContain("mybingocard.com.access.log");
    expect(truthSource).toContain("activity_events");
    expect(truthSource).toContain("analytics-tracker");
    expect(truthSource).toContain("getSearchAnalytics");
    expect(truthSource).toContain("traffic-truth");
    expect(truthSource).toContain("humanishPageRequests");
    expect(truthSource).toContain("reportablePageViews");
    expect(truthSource).toContain("sourceMapFailures");
    expect(truthSource).toContain("result?.rows");
  });

  test("traffic recovery submits indexing signals without publishing social messages", () => {
    expect(recoverySource).toContain("IndexNow");
    expect(recoverySource).toContain("submit-sitemap-to-gsc");
    expect(recoverySource).toContain("urlList");
    expect(recoverySource).toContain("submittedPublicMessages: false");
    expect(recoverySource).toContain("INDEXNOW_RATE_LIMIT_COOLDOWN_MS");
    expect(recoverySource).not.toContain('"/play"');
    expect(recoverySource).not.toContain("facebook.com");
    expect(recoverySource).not.toContain("pinterest.com");
  });

  test("cron installer owns one idempotent guardrail block", () => {
    expect(cronSource).toContain("# BEGIN MyBingoCard Ops Guardrails");
    expect(cronSource).toContain("scripts/ops-regression-monitor.cjs --discord");
    expect(cronSource).toContain("scripts/traffic-truth-report.cjs --days 14 --discord");
    expect(cronSource).toContain("scripts/traffic-recovery-submit.cjs --limit 80");
    expect(cronSource).toContain("# END MyBingoCard Ops Guardrails");
  });
});
