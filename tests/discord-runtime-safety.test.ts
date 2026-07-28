import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Discord runtime safety", () => {
  test("delivery retries retryable HTTP failures and enforces Discord payload limits", async () => {
    process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL = "https://discord.invalid/no-send-test";
    process.env.MYBINGOCARD_DISCORD_MAX_ATTEMPTS = "2";
    process.env.MYBINGOCARD_DISCORD_TIMEOUT_MS = "500";
    process.env.MYBINGOCARD_DISCORD_LOW_SIGNAL_ALERTS = "1";
    const { sendDiscordNotification } = await import("@/lib/discord");
    const originalFetch = globalThis.fetch;
    let calls = 0;
    let payload: any = null;

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls += 1;
      payload = JSON.parse(String(init?.body || "{}"));
      return new Response(null, { status: calls === 1 ? 500 : 204 });
    }) as unknown as typeof fetch;

    try {
      const delivered = await sendDiscordNotification(
        "c".repeat(3_000),
        [{
          title: "t".repeat(500),
          description: "d".repeat(5_000),
          fields: Array.from({ length: 30 }, (_, index) => ({
            name: `field-${index}-` + "n".repeat(300),
            value: "v".repeat(2_000),
          })),
          footer: { text: "f".repeat(3_000) },
        }],
        "events"
      );

      expect(delivered).toBe(true);
      expect(calls).toBe(2);
      expect(payload.content.length).toBe(2_000);
      expect(payload.embeds[0].title.length).toBe(256);
      expect(payload.embeds[0].description.length).toBe(4_096);
      expect(payload.embeds[0].fields.length).toBeLessThanOrEqual(25);
      expect(payload.embeds[0].fields[0].name.length).toBeLessThanOrEqual(256);
      expect(payload.embeds[0].fields[0].value.length).toBeLessThanOrEqual(1_024);
      const embedTextLength = payload.embeds.reduce((total: number, embed: any) => total +
        (embed.title?.length || 0) +
        (embed.description?.length || 0) +
        (embed.footer?.text?.length || 0) +
        (embed.author?.name?.length || 0) +
        (embed.fields || []).reduce((fieldTotal: number, field: any) =>
          fieldTotal + field.name.length + field.value.length, 0), 0);
      expect(embedTextLength).toBeLessThanOrEqual(6_000);
      expect(payload.allowed_mentions).toEqual({ parse: [] });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("failed server-error delivery is not recorded as a cooldown success", async () => {
    process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL = "https://discord.invalid/no-send-test";
    process.env.MYBINGOCARD_DISCORD_MAX_ATTEMPTS = "1";
    process.env.MYBINGOCARD_DISCORD_TIMEOUT_MS = "500";
    const { onRequestError } = await import("../instrumentation");
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("failed", { status: 500 });
    }) as unknown as typeof fetch;
    (globalThis as any).__myBingoCardServerErrorAlertState = new Map();

    const request = { path: "/api/no-send", method: "GET", headers: {} } as any;
    const context = { routePath: "/api/no-send", routeType: "route", routerKind: "App Router" } as any;

    try {
      onRequestError(new Error("same failure"), request, context);
      await new Promise((resolve) => setTimeout(resolve, 0));
      onRequestError(new Error("same failure"), request, context);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(calls).toBe(2);
      expect((globalThis as any).__myBingoCardServerErrorAlertState.size).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      delete (globalThis as any).__myBingoCardServerErrorAlertState;
    }
  });

  test("fatal process listeners exit for PM2 recovery instead of swallowing", () => {
    const source = readFileSync(resolve(process.cwd(), "instrumentation.ts"), "utf8");
    expect(source).toContain('process.once("uncaughtException"');
    expect(source).toContain('process.once("unhandledRejection"');
    expect(source).toContain('Reflect.get(process, "exit")');
    expect(source).not.toContain("Don't exit");
  });

  test("request error reporting stays off the response path", () => {
    const source = readFileSync(resolve(process.cwd(), "instrumentation.ts"), "utf8");
    expect(source).toContain('void reportServerError("next_request_error"');
    expect(source).not.toContain('await reportServerError("next_request_error"');
    expect(source).toContain("await reportServerError(type, error");
  });
});
