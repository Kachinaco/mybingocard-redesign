import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("email monitor Discord guardrails", () => {
  const emailMonitorSource = readFileSync(resolve(process.cwd(), "scripts/email-monitor.cjs"), "utf8");

  test("support reply mentions are opt-in instead of default @here pings", () => {
    expect(emailMonitorSource).toContain("MYBINGOCARD_SUPPORT_REPLY_MENTIONS === '1'");
    expect(emailMonitorSource).toContain("isReply && SUPPORT_REPLY_MENTIONS_ENABLED ? '@here' : ''");
    expect(emailMonitorSource).not.toContain("const content = isReply ? '@here' : ''");
  });

  test("warmup and deliverability replies are skipped before Discord and support tickets", () => {
    expect(emailMonitorSource).toContain("function isLowSignalSupportEmail");
    expect(emailMonitorSource).toContain("deliverability status");
    expect(emailMonitorSource).toContain("warmup check");
    expect(emailMonitorSource).toContain("placement note");
    expect(emailMonitorSource).toContain("csv upload");
    expect(emailMonitorSource).toContain("app合作机会");
    expect(emailMonitorSource).toContain("问候");
    expect(emailMonitorSource).toContain("warmup by cory managed seed network");
    expect(emailMonitorSource).toContain("normal back-and-forth signal");
    expect(emailMonitorSource).toContain("Low-signal support email skipped");
  });

  test("restart bulk forwarding requires both flag and explicit env opt-in", () => {
    expect(emailMonitorSource).toContain("MYBINGOCARD_EMAIL_MONITOR_BULK_SEND === '1'");
    expect(emailMonitorSource).toContain("process.argv.includes('--notify-existing-unread')");
    expect(emailMonitorSource).toContain("connect(bulkSendExistingUnread)");
    expect(emailMonitorSource).not.toContain("connect(true);");
  });
});
