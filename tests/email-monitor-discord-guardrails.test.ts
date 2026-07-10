import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

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

  test("IMAP validates Porkbun TLS and marks each UID seen only after successful handling", () => {
    expect(emailMonitorSource).toContain("rejectUnauthorized: true");
    expect(emailMonitorSource).toContain("const handled = await handleParsedEmail");
    expect(emailMonitorSource).toContain("imap.addFlags(messageUid, ['\\\\Seen']");
    expect(emailMonitorSource).not.toContain("imap.setFlags(results, ['\\\\Seen']");
    expect(emailMonitorSource).toContain("processingUids");
    expect(emailMonitorSource).toContain("messageKeyFor(parsed, context.imapUid)");
  });

  test("Discord delivery checks status, retries, and bounds support-email fields without a real send", () => {
    const runner = `
      let calls = 0;
      let payload = null;
      global.fetch = async (_url, init) => {
        calls += 1;
        payload = JSON.parse(init.body);
        return new Response(null, { status: calls === 1 ? 500 : 204 });
      };
      const monitor = require('./scripts/email-monitor.cjs');
      monitor.sendToDiscord('f'.repeat(2000), 's'.repeat(2000), 'p'.repeat(3000), new Date(), false)
        .then((delivered) => console.log(JSON.stringify({
          delivered,
          calls,
          from: payload.embeds[0].fields[0].value.length,
          subject: payload.embeds[0].fields[1].value.length,
          preview: payload.embeds[0].fields.at(-1).value.length,
        })))
        .catch((error) => { console.error(error); process.exit(1); });
    `;
    const result = spawnSync("node", ["-e", runner], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MYBINGOCARD_EVENTS_WEBHOOK_URL: "https://discord.invalid/no-send-test",
        DISCORD_WEBHOOK_URL: "",
        MYBINGOCARD_DISCORD_MAX_ATTEMPTS: "2",
        MYBINGOCARD_DISCORD_TIMEOUT_MS: "500",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout.trim().split("\n").at(-1) || "{}");
    expect(output).toEqual({ delivered: true, calls: 2, from: 1024, subject: 1024, preview: 1024 });
  });
});
